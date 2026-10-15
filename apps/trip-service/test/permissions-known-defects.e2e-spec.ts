import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import type { Server } from 'http';
import request from 'supertest';
import { DestinationsController } from '../src/trips/controllers/destinations.controller';
import { ItineraryController } from '../src/trips/controllers/itinerary.controller';
import { DestinationsService } from '../src/trips/services/destinations.service';
import { ItineraryService } from '../src/trips/services/itinerary.service';
import { ParticipantsService } from '../src/trips/services/participants.service';

describe('Known permission defects - expected failures until item 8 is fixed', () => {
  let app: INestApplication;
  let server: Server;
  let token: string;
  let role: 'VIEWER' | 'EDITOR';
  let empty: boolean;
  const year = new Date().getFullYear() + 2;
  const trip = { id: 12, startDate: `${year}-06-10`, endDate: `${year}-06-20` };
  const destination = { id: 'destination-id', trip };
  const itinerary = { id: 'activity-id', tripDestination: destination };
  const saved = jest.fn();
  beforeAll(async () => {
    const tripsRepository = { findById: () => trip };
    const tripsParticipantsRepository = {
      findParticipant: (tripId: number, userId: number) =>
        tripId === 12 && userId === 7 ? { role } : null,
    };
    const tripsDestinationsRepository = {
      findById: () => destination,
      addDestination: saved,
    };
    const itineraryService = Object.assign(
      Object.create(ItineraryService.prototype) as ItineraryService,
      {
        tripsRepository,
        tripsParticipantsRepository,
        tripsDestinationsRepository,
        itineraryRepository: {
          findById: () => itinerary,
          getByTripDestinationId: () => (empty ? [] : [itinerary]),
        },
      },
    );
    const destinationsService = Object.assign(
      Object.create(DestinationsService.prototype) as DestinationsService,
      {
        tripsRepository,
        tripsParticipantsRepository,
        tripsDestinationsRepository,
      },
    );
    const participantsService = Object.assign(
      Object.create(ParticipantsService.prototype) as ParticipantsService,
      { tripsRepository, tripsParticipantsRepository },
    );
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'endpoint-tests-only' })],
      controllers: [ItineraryController, DestinationsController],
      providers: [
        { provide: ItineraryService, useValue: itineraryService },
        { provide: DestinationsService, useValue: destinationsService },
        { provide: ParticipantsService, useValue: participantsService },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
    token = module.get(JwtService).sign({ id: 7 }, { expiresIn: '1h' });
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    role = 'VIEWER';
    empty = false;
    saved.mockReset().mockResolvedValue([{ id: 'new-destination' }]);
  });
  it('allows an EDITOR to read a populated itinerary', async () => {
    role = 'EDITOR';
    await request(server)
      .get('/trips/itinerary/destination-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, [itinerary]);
  });
  it('allows a VIEWER to read the itinerary list', async () => {
    await request(server)
      .get('/trips/itinerary/destination-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, [itinerary]);
  });
  it('allows a VIEWER to read itinerary details', async () => {
    await request(server)
      .get('/trips/itinerary-details/activity-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, itinerary);
  });
  it('VIEWER must not create destinations', async () => {
    const res = await request(server)
      .post('/trips/add-destination')
      .set('Authorization', `Bearer ${token}`)
      .send([
        {
          tripId: 12,
          city: 'Paris',
          country: 'France',
          startDate: trip.startDate,
          endDate: trip.endDate,
        },
      ]);
    expect(saved).not.toHaveBeenCalled();
    expect([401, 403]).toContain(res.status);
  });
  it.failing(
    'BUG: an authorized member should receive [] for an empty destination',
    async () => {
      role = 'EDITOR';
      empty = true;
      await request(server)
        .get('/trips/itinerary/destination-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(200, []);
    },
  );
});
