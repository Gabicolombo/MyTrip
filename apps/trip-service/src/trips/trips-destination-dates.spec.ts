import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { EntityManager } from 'typeorm';
import { TripsService } from './trips.service';
import { TripDestination } from './entities/trips-destinations.entity';
import { AddTripDestinationDto } from './dto/add-trip-destination.dto';
import { parseDateAsLocal } from './common/date';

describe('Destination dates and trip expansion', () => {
  const trips = { findById: jest.fn() };
  const participants = { findParticipant: jest.fn() };
  const destinations = { addDestination: jest.fn() };
  const destinationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findBy: jest.fn(),
  };
  const tripRepo = { update: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  let service: TripsService;
  const destination = (
    startDate: string,
    endDate: string,
  ): AddTripDestinationDto => ({
    tripId: 1,
    city: 'Paris',
    country: 'France',
    startDate,
    endDate,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    destinationRepo.findBy.mockResolvedValue([]);
    dataSource.transaction.mockImplementation(
      (callback: (manager: EntityManager) => Promise<TripDestination[]>) =>
        callback({
          getRepository: (entity: unknown) =>
            entity === TripDestination ? destinationRepo : tripRepo,
        } as unknown as EntityManager),
    );
    destinationRepo.create.mockImplementation((item: unknown) => item);
    destinationRepo.save.mockImplementation((items: unknown) =>
      Promise.resolve(items),
    );
    service = Object.assign(
      Object.create(TripsService.prototype) as TripsService,
      {
        tripsRepository: trips,
        tripsParticipantsRepository: participants,
        tripsDestinationsRepository: destinations,
        dataSource,
      },
    );
    trips.findById.mockResolvedValue({
      id: 1,
      startDate: '2030-06-10',
      endDate: '2030-06-20',
    });
    participants.findParticipant.mockResolvedValue({ role: 'OWNER' });
  });

  it('saves multiple destinations once, with their trip relation, inside the transaction', async () => {
    const items = [
      destination('2030-06-10', '2030-06-15'),
      destination('2030-06-15', '2030-06-20'),
    ];
    const expectedEntities = items.map((item) => ({
      city: item.city,
      country: item.country,
      startDate: parseDateAsLocal(item.startDate),
      endDate: parseDateAsLocal(item.endDate),
      trip: { id: 1 },
    }));

    await expect(service.addDestination(items, 7)).resolves.toEqual(
      expectedEntities,
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(destinationRepo.save).toHaveBeenCalledTimes(1);
    expect(destinationRepo.save).toHaveBeenCalledWith(expectedEntities);
    expect(destinations.addDestination).not.toHaveBeenCalled();
    expect(tripRepo.update).toHaveBeenCalledWith(1, {
      startDate: parseDateAsLocal('2030-06-10'),
      endDate: parseDateAsLocal('2030-06-20'),
    });
  });

  it.each([
    ['earlier start', '2030-06-05', '2030-06-09', '2030-06-05', '2030-06-20'],
    ['later end', '2030-06-18', '2030-06-25', '2030-06-10', '2030-06-25'],
    ['both boundaries', '2030-06-05', '2030-06-25', '2030-06-05', '2030-06-25'],
    ['single day', '2030-06-15', '2030-06-15', '2030-06-10', '2030-06-20'],
  ])(
    'accepts %s and never shrinks the trip',
    async (_scenario, start, end, tripStart, tripEnd) => {
      await expect(
        service.addDestination([destination(start, end)], 7),
      ).resolves.toHaveLength(1);
      expect(tripRepo.update).toHaveBeenCalledWith(1, {
        startDate: parseDateAsLocal(tripStart),
        endDate: parseDateAsLocal(tripEnd),
      });
    },
  );

  it.each([
    ['2030-06-16', '2030-06-14', ConflictException],
    ['invalid', '2030-06-15', BadRequestException],
    ['2030-06-10', 'invalid', BadRequestException],
    ['2030-02-30', '2030-06-15', BadRequestException],
    ['2030-06-10T00:00:00.000Z', '2030-06-15', BadRequestException],
  ])(
    'rejects invalid dates %s to %s before any writes',
    async (start, end, exception) => {
      await expect(
        service.addDestination([destination(start, end)], 7),
      ).rejects.toThrow(exception);
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(destinationRepo.save).not.toHaveBeenCalled();
      expect(tripRepo.update).not.toHaveBeenCalled();
    },
  );

  it('rejects the entire batch when a later destination has an inverted period', async () => {
    await expect(
      service.addDestination(
        [
          destination('2030-06-05', '2030-06-09'),
          destination('2030-06-18', '2030-06-17'),
        ],
        7,
      ),
    ).rejects.toThrow(ConflictException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('accepts Date objects for the trip as well as database date strings', async () => {
    trips.findById.mockResolvedValue({
      id: 1,
      startDate: new Date('2030-06-10T00:00:00Z'),
      endDate: new Date('2030-06-20T00:00:00Z'),
    });
    await expect(
      service.addDestination([destination('2030-06-10', '2030-06-20')], 7),
    ).resolves.toHaveLength(1);
    expect(tripRepo.update).toHaveBeenCalledWith(1, {
      startDate: parseDateAsLocal('2030-06-10'),
      endDate: parseDateAsLocal('2030-06-20'),
    });
  });

  it('rejects an empty batch and destinations from different trips', async () => {
    await expect(service.addDestination([], 7)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.addDestination(
        [
          destination('2030-06-10', '2030-06-15'),
          { ...destination('2030-06-15', '2030-06-20'), tripId: 2 },
        ],
        7,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(trips.findById).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects a viewer before writing', async () => {
    participants.findParticipant.mockResolvedValue({ role: 'VIEWER' });
    await expect(
      service.addDestination([destination('2030-06-10', '2030-06-15')], 7),
    ).rejects.toThrow(UnauthorizedException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('propagates transaction failure without inserting destinations outside it', async () => {
    const error = new Error('Failed to update trip');
    tripRepo.update.mockRejectedValue(error);
    await expect(
      service.addDestination([destination('2030-06-05', '2030-06-09')], 7),
    ).rejects.toBe(error);
    expect(destinations.addDestination).not.toHaveBeenCalled();
  });

  it.each([
    ['starts before the existing stay ends', '2030-06-09', '2030-06-19'],
    ['contains the existing stay', '2030-05-31', '2030-06-19'],
    ['is inside the existing stay', '2030-06-03', '2030-06-05'],
    ['is a single day inside the existing stay', '2030-06-05', '2030-06-05'],
  ])('rejects a new destination that %s', async (_scenario, start, end) => {
    destinationRepo.findBy.mockResolvedValue([
      {
        id: 'rome',
        city: 'Rome',
        country: 'Italy',
        startDate: '2030-06-01',
        endDate: '2030-06-10',
      },
    ]);
    await expect(
      service.addDestination([destination(start, end)], 7),
    ).rejects.toMatchObject({
      response: {
        message: 'Destination dates overlap with other destinations',
        conflictingDestinations: [
          {
            id: 'rome',
            city: 'Rome',
            country: 'Italy',
            startDate: '2030-06-01',
            endDate: '2030-06-10',
          },
        ],
      },
    });
    expect(destinationRepo.save).not.toHaveBeenCalled();
    expect(tripRepo.update).not.toHaveBeenCalled();
  });

  it.each([
    ['2030-06-10', '2030-06-19'],
    ['2030-06-11', '2030-06-19'],
    ['2030-05-25', '2030-06-01'],
    ['2030-06-10', '2030-06-10'],
  ])('allows a nonoverlapping stay from %s to %s', async (start, end) => {
    destinationRepo.findBy.mockResolvedValue([
      {
        id: 'rome',
        city: 'Rome',
        country: 'Italy',
        startDate: new Date('2030-06-01T00:00:00Z'),
        endDate: new Date('2030-06-10T00:00:00Z'),
      },
    ]);
    await expect(
      service.addDestination([destination(start, end)], 7),
    ).resolves.toHaveLength(1);
    expect(destinationRepo.save).toHaveBeenCalledTimes(1);
    expect(destinationRepo.findBy).toHaveBeenCalledWith({ trip: { id: 1 } });
  });

  it.each([false, true])(
    'rejects overlapping new destinations even when reversed=%s',
    async (reversed) => {
      const items = [
        { ...destination('2030-06-01', '2030-06-10'), city: 'Rome' },
        destination('2030-06-09', '2030-06-19'),
      ];
      await expect(
        service.addDestination(reversed ? items.reverse() : items, 7),
      ).rejects.toThrow(ConflictException);
      expect(destinationRepo.save).not.toHaveBeenCalled();
      expect(tripRepo.update).not.toHaveBeenCalled();
    },
  );

  it('allows a future single-day destination through DTO validation', async () => {
    const dto = Object.assign(
      new AddTripDestinationDto(),
      destination('2030-06-15', '2030-06-15'),
    );
    await expect(validate(dto)).resolves.toEqual([]);
  });
});
