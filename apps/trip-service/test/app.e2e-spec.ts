import {
  ConflictException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import request from 'supertest';
import { TripsController } from '../src/trips/controllers/trips.controller';
import { DestinationsController } from '../src/trips/controllers/destinations.controller';
import { ItineraryController } from '../src/trips/controllers/itinerary.controller';
import { ParticipantsController } from '../src/trips/controllers/participants.controller';
import { InvitesController } from '../src/trips/controllers/invites.controller';
import { VisaController } from '../src/trips/controllers/visa.controller';
import { TripsService } from '../src/trips/services/trips.service';
import { DestinationsService } from '../src/trips/services/destinations.service';
import { ItineraryService } from '../src/trips/services/itinerary.service';
import { ParticipantsService } from '../src/trips/services/participants.service';
import { InvitesService } from '../src/trips/services/invites.service';
import { VisaService } from '../src/trips/services/visa.service';
import { TripServiceController } from '../src/trip-service.controller';
import { TripServiceService } from '../src/trip-service.service';

// Service doubles isolate the HTTP contract from PostgreSQL and Cloudinary.
describe('Trip HTTP endpoints', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let token: string;
  const service = {
    myTrips: jest.fn(),
    deleteTrip: jest.fn(),
    getItinerary: jest.fn(),
    getItineraryDetails: jest.fn(),
    createTrip: jest.fn(),
    visaCheck: jest.fn(),
    checkParticipantExists: jest.fn(),
    addInvite: jest.fn(),
    acceptInvite: jest.fn(),
    deleteParticipant: jest.fn(),
    addDestination: jest.fn(),
    addItinerary: jest.fn(),
    updateItinerary: jest.fn(),
    deleteItinerary: jest.fn(),
    updateTrip: jest.fn(),
  };
  const year = new Date().getFullYear() + 2;
  const startDate = `${year}-06-10`;
  const endDate = `${year}-06-20`;
  const trip = {
    title: 'Vacation',
    description: 'Test trip',
    startDate,
    endDate,
  };
  const destination = {
    tripId: 12,
    city: 'Paris',
    country: 'France',
    startDate,
    endDate,
  };
  const itinerary = {
    name: 'Museum',
    tripDestinationId: 'destination-id',
    day: startDate,
    time: '10:00',
    activity: 'Museum',
    latitude: 48.86,
    longitude: 2.35,
  };
  const invite = { email: 'traveler@example.com', role: 'VIEWER' };
  const inviteToken = 'a'.repeat(64);
  type Route = {
    method: 'get' | 'post' | 'patch' | 'delete';
    path: string;
    handler: keyof typeof service;
    body?: object;
    args: unknown[];
    result: unknown;
    status: number;
  };
  const routes: Route[] = [
    {
      method: 'get',
      path: '/trips/my-trips',
      handler: 'myTrips',
      args: [7],
      result: [{ id: 12 }],
      status: 200,
    },
    {
      method: 'delete',
      path: '/trips/delete-trip/12',
      handler: 'deleteTrip',
      args: [12, 7],
      result: true,
      status: 200,
    },
    {
      method: 'get',
      path: '/trips/itinerary/destination-id',
      handler: 'getItinerary',
      args: [7, 'destination-id'],
      result: [],
      status: 200,
    },
    {
      method: 'get',
      path: '/trips/itinerary-details/activity-id',
      handler: 'getItineraryDetails',
      args: ['activity-id', 7],
      result: { id: 'activity-id' },
      status: 200,
    },
    {
      method: 'post',
      path: '/trips/create-trip',
      handler: 'createTrip',
      body: trip,
      args: [7, expect.objectContaining(trip), undefined],
      result: { id: 12, ...trip },
      status: 201,
    },
    {
      method: 'post',
      path: '/trips/visa-check',
      handler: 'visaCheck',
      body: { passport: 'Brazil', destination: 'France' },
      args: [{ passport: 'Brazil', destination: 'France' }],
      result: { requirement: 'test-fixture' },
      status: 201,
    },
    {
      method: 'post',
      path: '/trips/12/invites',
      handler: 'addInvite',
      body: invite,
      args: [12, 7, invite.email, invite.role],
      result: { id: 'invite-id' },
      status: 201,
    },
    {
      method: 'post',
      path: '/trips/invites/accept',
      handler: 'acceptInvite',
      body: { token: inviteToken },
      args: [inviteToken, 7],
      result: { tripId: 12, role: 'VIEWER' },
      status: 200,
    },
    {
      method: 'delete',
      path: '/trips/delete-participant/12/8',
      handler: 'deleteParticipant',
      args: [12, 8, 7],
      result: true,
      status: 200,
    },
    {
      method: 'post',
      path: '/trips/add-destination',
      handler: 'addDestination',
      body: [destination],
      args: [[destination], 7],
      result: [{ id: 'destination-id' }],
      status: 201,
    },
    {
      method: 'post',
      path: '/trips/add-itinerary',
      handler: 'addItinerary',
      body: itinerary,
      args: [itinerary, 7],
      result: { id: 'activity-id' },
      status: 201,
    },
    {
      method: 'patch',
      path: '/trips/update-itinerary/activity-id',
      handler: 'updateItinerary',
      body: { tripDestinationId: 'destination-id', time: '11:00' },
      args: [
        'activity-id',
        { tripDestinationId: 'destination-id', time: '11:00' },
        7,
      ],
      result: { id: 'activity-id', time: '11:00' },
      status: 200,
    },
    {
      method: 'delete',
      path: '/trips/delete-itinerary/activity-id',
      handler: 'deleteItinerary',
      args: ['activity-id', 7],
      result: true,
      status: 200,
    },
    {
      method: 'patch',
      path: '/trips/update-trip/12',
      handler: 'updateTrip',
      body: { title: 'Updated' },
      args: ['12', expect.objectContaining({ title: 'Updated' }), undefined],
      result: { id: 12, title: 'Updated' },
      status: 200,
    },
  ];
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: 'endpoint-tests-only' }),
        MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
      ],
      controllers: [
        TripsController,
        DestinationsController,
        ItineraryController,
        ParticipantsController,
        InvitesController,
        VisaController,
        TripServiceController,
      ],
      providers: [
        // Every feature service shares one double, so routes keep their handler names.
        { provide: TripsService, useValue: service },
        { provide: DestinationsService, useValue: service },
        { provide: ItineraryService, useValue: service },
        { provide: ParticipantsService, useValue: service },
        { provide: InvitesService, useValue: service },
        { provide: VisaService, useValue: service },
        TripServiceService,
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    jwt = module.get(JwtService);
    token = jwt.sign({ id: 7 }, { expiresIn: '1h' });
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    service.checkParticipantExists.mockResolvedValue({ role: 'OWNER' });
  });
  it('GET / responds without authentication', async () => {
    await request(app.getHttpServer()).get('/').expect(200, 'Hello World!');
  });
  describe.each(routes)('$method $path', (route) => {
    it('returns the response and forwards the authenticated identity and input', async () => {
      service[route.handler].mockResolvedValue(route.result);
      const req = request(app.getHttpServer())
        [route.method](route.path)
        .set('Authorization', `Bearer ${token}`);
      if (route.body) req.send(route.body);
      const res = await req.expect(route.status);
      if (typeof route.result === 'boolean') {
        expect(res.text).toBe(String(route.result));
      } else {
        expect(res.body).toEqual(route.result);
      }
      expect(service[route.handler]).toHaveBeenCalledWith(...route.args);
      expect(service[route.handler]).toHaveBeenCalledTimes(1);
    });
    it.each(['missing', 'malformed', 'expired', 'wrong-key'])(
      'rejects %s token before calling the service',
      async (kind) => {
        const req = request(app.getHttpServer())[route.method](route.path);
        if (route.body) req.send(route.body);
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
        for (const mock of Object.values(service))
          expect(mock).not.toHaveBeenCalled();
      },
    );
    it('preserves an error reported by the service', async () => {
      service[route.handler].mockRejectedValue(
        new NotFoundException('Resource not found'),
      );
      const req = request(app.getHttpServer())
        [route.method](route.path)
        .set('Authorization', `Bearer ${token}`);
      if (route.body) req.send(route.body);
      const res = await req.expect(404);
      expect(res.body.message).toBe('Resource not found');
    });
  });
  it.each([
    ['post', '/trips/create-trip', 'createTrip'],
    ['post', '/trips/visa-check', 'visaCheck'],
    ['post', '/trips/12/invites', 'addInvite'],
    ['post', '/trips/invites/accept', 'acceptInvite'],
    ['post', '/trips/add-itinerary', 'addItinerary'],
    ['patch', '/trips/update-itinerary/activity-id', 'updateItinerary'],
    ['patch', '/trips/update-trip/12', 'updateTrip'],
  ] as const)(
    'rejects an empty DTO on %s %s',
    async (method, path, handler) => {
      await request(app.getHttpServer())
        [method](path)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
      expect(service[handler]).not.toHaveBeenCalled();
    },
  );
  it('rejects trip dates in reverse order', async () => {
    await request(app.getHttpServer())
      .post('/trips/create-trip')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...trip, startDate: endDate, endDate: startDate })
      .expect(400);
    expect(service.createTrip).not.toHaveBeenCalled();
  });
  it('blocks VIEWER in controller permissions when updating a trip', async () => {
    service.checkParticipantExists.mockResolvedValue({ role: 'VIEWER' });
    await request(app.getHttpServer())
      .patch('/trips/update-trip/12')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(401);
    expect(service.updateTrip).not.toHaveBeenCalled();
  });
  it('blocks nonparticipants when updating a trip', async () => {
    service.checkParticipantExists.mockResolvedValue(null);
    await request(app.getHttpServer())
      .patch('/trips/update-trip/12')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(404);
    expect(service.updateTrip).not.toHaveBeenCalled();
  });
  it.each([
    [{ ...invite, email: 'not-an-email' }],
    [{ ...invite, role: 'OWNER' }],
  ])('rejects an invalid invite %#', async (body) => {
    await request(app.getHttpServer())
      .post('/trips/12/invites')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(400);
    expect(service.addInvite).not.toHaveBeenCalled();
  });
  it('normalizes the invited email before calling the service', async () => {
    service.addInvite.mockResolvedValue({ id: 'invite-id' });
    await request(app.getHttpServer())
      .post('/trips/12/invites')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...invite, email: '  Traveler@Example.com ' })
      .expect(201);
    expect(service.addInvite).toHaveBeenCalledWith(
      12,
      7,
      invite.email,
      invite.role,
    );
  });
  it('rejects a malformed invite token', async () => {
    await request(app.getHttpServer())
      .post('/trips/invites/accept')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'short' })
      .expect(400);
    expect(service.acceptInvite).not.toHaveBeenCalled();
  });
  it('returns a conflict for an invite that was already accepted', async () => {
    service.addInvite.mockRejectedValue(
      new ConflictException('Invite already accepted for this email'),
    );
    await request(app.getHttpServer())
      .post('/trips/12/invites')
      .set('Authorization', `Bearer ${token}`)
      .send(invite)
      .expect(409);
  });
  it('accepts a multipart trip cover', async () => {
    service.createTrip.mockResolvedValue({ id: 12 });
    await request(app.getHttpServer())
      .post('/trips/create-trip')
      .set('Authorization', `Bearer ${token}`)
      .field('title', trip.title)
      .field('description', trip.description)
      .field('startDate', startDate)
      .field('endDate', endDate)
      .attach('file', Buffer.from('test-cover'), {
        filename: 'cover.png',
        contentType: 'image/png',
      })
      .expect(201);
    expect(service.createTrip).toHaveBeenCalledWith(
      7,
      expect.objectContaining(trip),
      expect.objectContaining({
        originalname: 'cover.png',
        buffer: Buffer.from('test-cover'),
      }),
    );
  });
  it('updates multipart trip metadata without forwarding destinations', async () => {
    service.updateTrip.mockResolvedValue({ id: 12 });
    await request(app.getHttpServer())
      .patch('/trips/update-trip/12')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Updated')
      .field('destinations', '[]')
      .expect(200);
    expect(service.updateTrip).toHaveBeenCalledWith(
      '12',
      expect.objectContaining({ title: 'Updated' }),
      undefined,
    );
    const forwardedUpdate = (service.updateTrip.mock.calls[0] as unknown[])[1];
    expect(forwardedUpdate).not.toHaveProperty('destinations');
  });
  it('rejects uploads larger than 5 MB', async () => {
    await request(app.getHttpServer())
      .post('/trips/create-trip')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), 'large.png')
      .expect(413);
    expect(service.createTrip).not.toHaveBeenCalled();
  });
});
