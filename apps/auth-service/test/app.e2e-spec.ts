import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import type { Server } from 'http';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

// Real routing, validation, AuthService and JWT; no database or real credentials.
describe('Auth and users HTTP endpoints', () => {
  let app: INestApplication;
  let server: Server;
  let jwt: JwtService;
  let token: string;
  const users = {
    create: jest.fn(),
    login: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const profile = {
    id: 7,
    name: 'Test User',
    email: 'test@example.com',
    nationality: 'Brazil',
  };
  const registration = {
    name: profile.name,
    email: profile.email,
    nationality: profile.nationality,
    password: 'test1234',
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'endpoint-tests-only',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController, UsersController],
      providers: [AuthService, { provide: UsersService, useValue: users }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
    jwt = module.get(JwtService);
    token = jwt.sign({ id: profile.id });
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    users.create.mockResolvedValue(profile);
    users.login.mockResolvedValue(profile);
    users.findOne.mockResolvedValue(profile);
    users.update.mockResolvedValue({ affected: 1 });
    users.remove.mockResolvedValue({ affected: 1 });
  });

  it('POST /users/register accepts a valid registration', async () => {
    const res = await request(server)
      .post('/users/register')
      .send(registration)
      .expect(201);
    expect(res.body).toEqual(profile);
    expect(users.create).toHaveBeenCalledWith(registration);
  });
  it.each([
    { ...registration, email: 'invalid' },
    { ...registration, password: 'abc' },
    { ...registration, admin: true },
  ])('rejects invalid registration %#', async (body) => {
    await request(server).post('/users/register').send(body).expect(400);
    expect(users.create).not.toHaveBeenCalled();
  });
  it('returns the registration conflict reported by the service', async () => {
    users.create.mockRejectedValue(
      new BadRequestException('User already exists'),
    );
    await request(server)
      .post('/users/register')
      .send(registration)
      .expect(400);
  });
  it('POST /auth/login returns a verifiable token usable on GET /users/me', async () => {
    const res = await request(server)
      .post('/auth/login')
      .send({ email: profile.email, password: registration.password })
      .expect(200);
    const loginResponse = res.body as { access_token: string; name: string };
    expect(jwt.verify(loginResponse.access_token)).toMatchObject({
      id: profile.id,
      email: profile.email,
    });
    expect(loginResponse.name).toBe(profile.name);
    expect(users.login).toHaveBeenCalledWith({
      email: profile.email,
      password: registration.password,
    });
    await request(server)
      .get('/users/me')
      .set('Authorization', `Bearer ${loginResponse.access_token}`)
      .expect(200, profile);
  });
  it('rejects invalid login input before reaching the service', async () => {
    await request(server)
      .post('/auth/login')
      .send({ email: 'invalid' })
      .expect(400);
    expect(users.login).not.toHaveBeenCalled();
  });
  it('rejects incorrect credentials', async () => {
    users.login.mockRejectedValue(
      new BadRequestException('Invalid credentials'),
    );
    await request(server)
      .post('/auth/login')
      .send({ email: profile.email, password: 'wrong' })
      .expect(400);
  });
  it('GET /auth/profile exposes the authenticated identity', async () => {
    const res = await request(server)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({ id: profile.id });
  });
  it('GET /users/me uses the identity in the token', async () => {
    await request(server)
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, profile);
    expect(users.findOne).toHaveBeenCalledWith(profile.id);
  });
  it('PATCH /users/me updates only the authenticated user', async () => {
    await request(server)
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated User' })
      .expect(200, { affected: 1 });
    expect(users.update).toHaveBeenCalledWith(profile.id, {
      name: 'Updated User',
    });
  });
  it('rejects attempts to override the user ID', async () => {
    await request(server)
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 99, name: 'Updated User' })
      .expect(400);
    expect(users.update).not.toHaveBeenCalled();
  });
  it('DELETE /users/me deletes only the authenticated user', async () => {
    await request(server)
      .delete('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, { affected: 1 });
    expect(users.remove).toHaveBeenCalledWith(profile.id);
  });
  const protectedRoutes = [
    ['get', '/auth/profile'],
    ['get', '/users/me'],
    ['patch', '/users/me'],
    ['delete', '/users/me'],
  ] as const;
  describe.each(protectedRoutes)('%s %s authentication', (method, path) => {
    it.each(['missing', 'malformed', 'expired', 'wrong-key'])(
      'rejects %s token',
      async (kind) => {
        const req = request(server)[method](path);
        if (kind !== 'missing') {
          const value =
            kind === 'expired'
              ? jwt.sign({ id: 7 }, { expiresIn: -1 })
              : kind === 'wrong-key'
                ? new JwtService({ secret: 'different-test-key' }).sign({
                    id: 7,
                  })
                : 'invalid';
          req.set('Authorization', `Bearer ${value}`);
        }
        await req.expect(401);
        for (const mock of Object.values(users))
          expect(mock).not.toHaveBeenCalled();
      },
    );
  });
});
