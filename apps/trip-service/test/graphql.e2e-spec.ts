import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Request as ExpressRequest } from 'express';
import type { Server } from 'http';
import request from 'supertest';
import { TripsResolver } from '../src/trips/graphql/trips.resolver';
import { TripsService } from '../src/trips/trips.service';
import { User } from '../../auth-service/src/users/entities/user.entity';

describe('GraphQL tripDetails endpoint', () => {
  let app: INestApplication;
  let server: Server;
  let jwt: JwtService;
  let token: string;
  const trips = { getTripDetails: jest.fn() };
  const users = { find: jest.fn() };
  const query =
    'query Details($id: Int!) { tripDetails(id: $id) { id title startDate destinations { id city } participants { role user { name nationality } } } }';
  type GraphqlResponse = {
    data?: { tripDetails?: unknown } | null;
    errors?: Array<{
      message: string;
      extensions?: { code?: string };
    }>;
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: 'endpoint-tests-only' }),
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
          context: ({ req }: { req: ExpressRequest }) => ({ req }),
        }),
      ],
      providers: [
        TripsResolver,
        { provide: TripsService, useValue: trips },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
    jwt = module.get(JwtService);
    token = jwt.sign({ id: 7 }, { expiresIn: '1h' });
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    trips.getTripDetails.mockResolvedValue({
      id: 12,
      title: 'Vacation',
      startDate: '2030-06-10',
      endDate: '2030-06-20',
      destinations: [
        {
          id: 'destination-id',
          city: 'Paris',
          country: 'France',
          startDate: '2030-06-10',
          endDate: '2030-06-20',
        },
      ],
      participants: [
        { userId: 7, tripId: 12, role: 'VIEWER', joinedAt: '2030-01-01' },
      ],
    });
    users.find.mockResolvedValue([
      { id: 7, name: 'Test User', nationality: 'Brazil' },
    ]);
  });
  it('returns the GraphQL shape and passes the token identity to the service', async () => {
    const res = await request(server)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables: { id: 12 } })
      .expect(200);
    const body = res.body as GraphqlResponse;
    expect(body.errors).toBeUndefined();
    expect(body.data?.tripDetails).toMatchObject({
      id: 12,
      destinations: [{ id: 'destination-id', city: 'Paris' }],
      participants: [
        { role: 'VIEWER', user: { name: 'Test User', nationality: 'Brazil' } },
      ],
    });
    expect(trips.getTripDetails).toHaveBeenCalledWith(7, 12);
    expect(users.find).toHaveBeenCalledWith(
      expect.objectContaining({ select: ['id', 'name', 'nationality'] }),
    );
  });
  it.each(['missing', 'malformed', 'expired', 'wrong-key'])(
    'rejects %s token in GraphQL',
    async (kind) => {
      const req = request(server)
        .post('/graphql')
        .send({ query, variables: { id: 12 } });
      if (kind !== 'missing') {
        const value =
          kind === 'expired'
            ? jwt.sign({ id: 7 }, { expiresIn: -1 })
            : kind === 'wrong-key'
              ? new JwtService({ secret: 'different-test-key' }).sign({ id: 7 })
              : 'invalid';
        req.set('Authorization', `Bearer ${value}`);
      }
      const res = await req.expect(200);
      const body = res.body as GraphqlResponse;
      expect(body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
      expect(body.data).toBeNull();
      expect(trips.getTripDetails).not.toHaveBeenCalled();
      expect(users.find).not.toHaveBeenCalled();
    },
  );
  it('returns no data when the service finds no accessible trip', async () => {
    trips.getTripDetails.mockResolvedValue(null);
    const res = await request(server)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables: { id: 99 } })
      .expect(200);
    const body = res.body as GraphqlResponse;
    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.message).toBe('Trip not found');
    expect(users.find).not.toHaveBeenCalled();
  });
  it('rejects an invalid GraphQL ID before reaching the resolver', async () => {
    const res = await request(server)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables: { id: 'invalid' } })
      .expect(400);
    const body = res.body as GraphqlResponse;
    expect(body.errors).toBeDefined();
    expect(trips.getTripDetails).not.toHaveBeenCalled();
  });
});
