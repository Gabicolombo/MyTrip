import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { DestinationsService } from './destinations.service';
import * as permissionHelper from '../common/check-user-permission';
import { TripsRepository } from '../repositories/trips.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { TripDestination } from '../entities/trips-destinations.entity';

const makeTripDestination = (overrides = {}, tripOverrides = {}) => ({
  id: 'dest-1',
  trip: {
    id: 'trip-1',
    startDate: new Date('2025-07-01'),
    endDate: new Date('2025-07-31'),
    ...tripOverrides,
  },
  startDate: new Date('2025-07-05'),
  endDate: new Date('2025-07-20'),
  ...overrides,
});

const mockTripsRepository = {
  findById: jest.fn(),
  findByTitle: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
};

const mockTripsParticipantsRepository = {
  findParticipant: jest.fn(),
  addParticipant: jest.fn(),
  getParticipantsByTripId: jest.fn(),
};

const mockItineraryRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
  manager: { transaction: jest.fn() },
  createQueryRunner: jest.fn(),
};

describe('DestinationsService', () => {
  let service: DestinationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DestinationsService,
        { provide: TripsRepository, useValue: mockTripsRepository },
        {
          provide: TripsParticipantsRepository,
          useValue: mockTripsParticipantsRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<DestinationsService>(DestinationsService);

    jest.clearAllMocks();
    jest.spyOn(permissionHelper, 'canEditTrip').mockResolvedValue(true);
    jest.spyOn(permissionHelper, 'canViewTrip').mockResolvedValue(true);
  });

  describe('updateDestination', () => {
    const destinationRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      update: jest.fn(),
      findOneOrFail: jest.fn(),
    };
    const tripRepo = { update: jest.fn() };

    beforeEach(() => {
      destinationRepo.findBy.mockResolvedValue([]);
      destinationRepo.findOne.mockResolvedValue(
        makeTripDestination(
          {
            city: 'Rome',
            country: 'Italy',
            startDate: '2026-08-03',
            endDate: '2026-08-05',
            itineraries: [
              { id: 'itin-1', name: 'Colosseum', day: '2026-08-04' },
            ],
          },
          { id: 12, startDate: '2026-08-03', endDate: '2026-08-05' },
        ),
      );
      destinationRepo.findOneOrFail.mockResolvedValue({ id: 'dest-1' });
      mockDataSource.transaction.mockImplementation(
        (callback: (manager: EntityManager) => Promise<TripDestination>) =>
          callback({
            getRepository: (entity: unknown) =>
              entity === TripDestination ? destinationRepo : tripRepo,
          } as unknown as EntityManager),
      );
    });

    it.each([
      ['ending before the Colosseum visit', { endDate: '2026-08-03' }],
      ['starting after the Colosseum visit', { startDate: '2026-08-05' }],
      [
        'moving the entire stay',
        { startDate: '2026-08-10', endDate: '2026-08-12' },
      ],
    ])('blocks %s without saving any changes', async (_scenario, update) => {
      await expect(
        service.updateDestination('dest-1', update, 7),
      ).rejects.toMatchObject({
        response: {
          message: 'Destination dates would exclude existing itineraries',
          conflictingItineraries: [
            { id: 'itin-1', name: 'Colosseum', day: '2026-08-04' },
          ],
        },
      });
      expect(destinationRepo.update).not.toHaveBeenCalled();
      expect(tripRepo.update).not.toHaveBeenCalled();
    });

    it.each([
      ['end', { endDate: '2026-08-04' }],
      ['start', { startDate: '2026-08-04' }],
    ])(
      'allows the activity on the destination %s boundary without shrinking the trip',
      async (_boundary, update) => {
        await service.updateDestination('dest-1', update, 7);
        expect(destinationRepo.update).toHaveBeenCalledWith('dest-1', {
          city: 'Rome',
          country: 'Italy',
          startDate: '2026-08-03',
          endDate: '2026-08-05',
          ...update,
        });
        expect(tripRepo.update).not.toHaveBeenCalled();
      },
    );

    it('allows moving a destination with no itineraries and expands only the trip end', async () => {
      destinationRepo.findOne.mockResolvedValue(
        makeTripDestination(
          {
            city: 'Rome',
            country: 'Italy',
            startDate: '2026-08-03',
            endDate: '2026-08-05',
            itineraries: [],
          },
          { id: 12, startDate: '2026-08-03', endDate: '2026-08-05' },
        ),
      );

      await expect(
        service.updateDestination(
          'dest-1',
          { startDate: '2026-08-10', endDate: '2026-08-12' },
          7,
        ),
      ).resolves.toEqual({ id: 'dest-1' });
      expect(destinationRepo.update).toHaveBeenCalledWith('dest-1', {
        city: 'Rome',
        country: 'Italy',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
      });
      expect(tripRepo.update).toHaveBeenCalledWith(12, {
        startDate: '2026-08-03',
        endDate: '2026-08-12',
      });
    });

    it('lists only activities outside the proposed period in the conflict response', async () => {
      destinationRepo.findOne.mockResolvedValue(
        makeTripDestination(
          {
            startDate: '2026-08-03',
            endDate: '2026-08-05',
            itineraries: [
              { id: 'itin-1', name: 'Colosseum', day: '2026-08-04' },
              { id: 'itin-2', name: 'Vatican', day: '2026-08-05' },
            ],
          },
          { id: 12, startDate: '2026-08-03', endDate: '2026-08-05' },
        ),
      );

      await expect(
        service.updateDestination('dest-1', { endDate: '2026-08-04' }, 7),
      ).rejects.toMatchObject({
        response: {
          conflictingItineraries: [
            { id: 'itin-2', name: 'Vatican', day: '2026-08-05' },
          ],
        },
      });
      expect(destinationRepo.update).not.toHaveBeenCalled();
      expect(tripRepo.update).not.toHaveBeenCalled();
    });

    it('expands the trip while leaving itineraries untouched', async () => {
      await service.updateDestination(
        'dest-1',
        { startDate: '2026-08-01', endDate: '2026-08-07' },
        7,
      );
      expect(tripRepo.update).toHaveBeenCalledWith(12, {
        startDate: '2026-08-01',
        endDate: '2026-08-07',
      });
      expect(mockItineraryRepository.update).not.toHaveBeenCalled();
      expect(mockItineraryRepository.delete).not.toHaveBeenCalled();
    });

    it('supports Date values from entities and a single-day destination', async () => {
      destinationRepo.findOne.mockResolvedValue(
        makeTripDestination(
          {
            startDate: new Date('2026-08-03T00:00:00Z'),
            endDate: new Date('2026-08-05T00:00:00Z'),
            itineraries: [
              { id: 'itin-1', name: 'Colosseum', day: '2026-08-04' },
            ],
          },
          {
            id: 12,
            startDate: new Date('2026-08-03T00:00:00Z'),
            endDate: new Date('2026-08-05T00:00:00Z'),
          },
        ),
      );
      await service.updateDestination(
        'dest-1',
        { startDate: '2026-08-04', endDate: '2026-08-04' },
        7,
      );
      expect(destinationRepo.update).toHaveBeenCalledWith(
        'dest-1',
        expect.objectContaining({
          startDate: '2026-08-04',
          endDate: '2026-08-04',
        }),
      );
    });

    it.each([
      ['inverted period', { startDate: '2026-08-06' }, ConflictException],
      [
        'nonexistent calendar day',
        { endDate: '2026-02-30' },
        BadRequestException,
      ],
      [
        'date with time',
        { endDate: '2026-08-07T12:00:00Z' },
        BadRequestException,
      ],
    ])('rejects a %s before saving', async (_scenario, update, exception) => {
      await expect(
        service.updateDestination('dest-1', update, 7),
      ).rejects.toThrow(exception);
      expect(destinationRepo.update).not.toHaveBeenCalled();
      expect(tripRepo.update).not.toHaveBeenCalled();
    });

    it('rejects users without editing permission', async () => {
      jest.spyOn(permissionHelper, 'canEditTrip').mockResolvedValue(false);
      await expect(
        service.updateDestination('dest-1', { city: 'Rome' }, 7),
      ).rejects.toThrow(UnauthorizedException);
      expect(destinationRepo.update).not.toHaveBeenCalled();
    });

    it('rejects a missing destination', async () => {
      destinationRepo.findOne.mockResolvedValue(null);
      await expect(service.updateDestination('missing', {}, 7)).rejects.toThrow(
        NotFoundException,
      );
      expect(destinationRepo.update).not.toHaveBeenCalled();
    });

    it('rejects a partial date update that overlaps another destination without writing', async () => {
      destinationRepo.findBy.mockResolvedValue([
        {
          id: 'dest-2',
          city: 'Paris',
          country: 'France',
          startDate: '2026-08-06',
          endDate: '2026-08-10',
        },
      ]);
      await expect(
        service.updateDestination('dest-1', { endDate: '2026-08-07' }, 7),
      ).rejects.toMatchObject({
        response: {
          conflictingDestinations: [
            {
              id: 'dest-2',
              city: 'Paris',
              country: 'France',
              startDate: '2026-08-06',
              endDate: '2026-08-10',
            },
          ],
        },
      });
      expect(destinationRepo.update).not.toHaveBeenCalled();
      expect(tripRepo.update).not.toHaveBeenCalled();
    });

    it('allows ending on another destination start and excludes its own ID', async () => {
      destinationRepo.findBy.mockResolvedValue([
        {
          id: 'dest-1',
          city: 'Rome',
          country: 'Italy',
          startDate: '2026-08-03',
          endDate: '2026-08-05',
        },
        {
          id: 'dest-2',
          city: 'Paris',
          country: 'France',
          startDate: '2026-08-06',
          endDate: '2026-08-10',
        },
      ]);
      await expect(
        service.updateDestination('dest-1', { endDate: '2026-08-06' }, 7),
      ).resolves.toEqual({ id: 'dest-1' });
      expect(destinationRepo.update).toHaveBeenCalledTimes(1);
      expect(destinationRepo.findBy).toHaveBeenCalledWith({ trip: { id: 12 } });
    });

    it('ignores body IDs and updates only the requested fields', async () => {
      await service.updateDestination(
        'dest-1',
        { id: 'other', city: 'Roma' },
        7,
      );
      expect(destinationRepo.update).toHaveBeenCalledWith('dest-1', {
        city: 'Roma',
        country: 'Italy',
        startDate: '2026-08-03',
        endDate: '2026-08-05',
      });
    });
  });
});
