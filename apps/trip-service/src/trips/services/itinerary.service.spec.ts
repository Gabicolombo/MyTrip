import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { Test, TestingModule } from '@nestjs/testing';
import { ItineraryService } from './itinerary.service';
import { ItineraryDto } from '../dto/add-itinerary.dto';
import { ItineraryUpdateDto } from '../dto/update-itinerary.dto';
import { Activity } from '../enums/activity.enum';
import * as permissionHelper from '../common/check-user-permission';
import { TripsRepository } from '../repositories/trips.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { TripsDestinationsRepository } from '../repositories/tripsDestinations.repository';
import { ItineraryRepository } from '../repositories/itinerary.repository';

const makeTrip = (overrides = {}) => ({
  id: 'trip-1',
  startDate: new Date('2025-07-01'),
  endDate: new Date('2025-07-31'),
  ...overrides,
});

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

const makeItineraryEntity = (overrides = {}) => ({
  id: 'itin-1',
  tripDestination: { id: 'dest-1' },
  day: new Date('2025-07-10'),
  time: '10:00',
  activity: Activity.Museum,
  notes: '',
  link: '',
  latitude: -23.5505,
  longitude: -46.6333,
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

const mockTripsDestinationsRepository = {
  findById: jest.fn(),
  addDestination: jest.fn(),
};

const mockItineraryRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const validDto: ItineraryDto = {
  name: 'Visit Museum',
  tripDestinationId: 'dest-1',
  day: '2025-07-10',
  time: '10:00',
  activity: Activity.Museum,
  notes: 'Buy tickets in advance',
  link: 'https://museum.com',
  latitude: -23.5505,
  longitude: -46.6333,
};

describe('ItineraryService', () => {
  let service: ItineraryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItineraryService,
        { provide: TripsRepository, useValue: mockTripsRepository },
        {
          provide: TripsParticipantsRepository,
          useValue: mockTripsParticipantsRepository,
        },
        {
          provide: TripsDestinationsRepository,
          useValue: mockTripsDestinationsRepository,
        },
        { provide: ItineraryRepository, useValue: mockItineraryRepository },
      ],
    }).compile();

    service = module.get<ItineraryService>(ItineraryService);

    jest.clearAllMocks();
    jest.spyOn(permissionHelper, 'canEditTrip').mockResolvedValue(true);
    jest.spyOn(permissionHelper, 'canViewTrip').mockResolvedValue(true);
  });

  describe('addItinerary', () => {
    const userId = 1;

    it('should create and return the itinerary when data is valid', async () => {
      const destination = makeTripDestination();
      const trip = makeTrip();
      const created = { id: 'itin-new', ...validDto };

      mockTripsDestinationsRepository.findById.mockResolvedValue(destination);
      mockTripsRepository.findById.mockResolvedValue(trip);
      mockItineraryRepository.create.mockResolvedValue(created);

      const result = await service.addItinerary(validDto, userId);

      expect(mockItineraryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validDto.name,
          latitude: validDto.latitude,
          longitude: validDto.longitude,
        }),
      );
      expect(result).toEqual(created);
    });

    it('saves amount and currency together', async () => {
      const destination = makeTripDestination();
      const paidItinerary = {
        ...validDto,
        amount: '40.00',
        currency: 'GBP',
      };
      mockTripsDestinationsRepository.findById.mockResolvedValue(destination);
      mockItineraryRepository.create.mockResolvedValue(paidItinerary);

      await service.addItinerary(paidItinerary, userId);

      expect(mockItineraryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '40.00',
          currency: 'GBP',
        }),
      );
    });

    it.each([
      ['amount without currency', { amount: '40.00' }],
      ['currency without amount', { currency: 'GBP' }],
    ])('rejects %s', async (_scenario, cost) => {
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination(),
      );

      await expect(
        service.addItinerary({ ...validDto, ...cost }, userId),
      ).rejects.toThrow(ConflictException);
      expect(mockItineraryRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when tripDestination does not exist', () => {
      mockTripsDestinationsRepository.findById.mockResolvedValue(null);

      return expect(service.addItinerary(validDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when trip does not exist', () => {
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination({ trip: null }),
      );

      return expect(service.addItinerary(validDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException when user has no permission', () => {
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination(),
      );
      mockTripsRepository.findById.mockResolvedValue(makeTrip());
      jest.spyOn(permissionHelper, 'canEditTrip').mockResolvedValue(false);

      return expect(service.addItinerary(validDto, userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ConflictException when day is before trip startDate', () => {
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination({}, { startDate: new Date('2025-07-15') }),
      );
      mockItineraryRepository.create.mockResolvedValue({});

      return expect(service.addItinerary(validDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when day is after trip endDate', () => {
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination({}, { endDate: new Date('2025-07-05') }),
      );
      return expect(service.addItinerary(validDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when day is outside tripDestination date range', () => {
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination({ endDate: new Date('2025-07-08') }),
      );
      mockTripsRepository.findById.mockResolvedValue(makeTrip());

      return expect(service.addItinerary(validDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });
  });
  describe('updateItinerary', () => {
    const userId = 1;

    const validUpdateDto: ItineraryUpdateDto = {
      tripDestinationId: 'dest-1',
      name: 'Updated name',
      time: '14:00',
    };

    it('should update and return the itinerary when data is valid', async () => {
      const itinerary = makeItineraryEntity();
      const destination = makeTripDestination();
      const trip = makeTrip();
      const updated = { ...itinerary, name: 'Updated name', time: '14:00' };

      mockItineraryRepository.findById.mockResolvedValue(itinerary);
      mockTripsDestinationsRepository.findById.mockResolvedValue(destination);
      mockTripsRepository.findById.mockResolvedValue(trip);
      mockItineraryRepository.update.mockResolvedValue(updated);

      const result = await service.updateItinerary(1, validUpdateDto, userId);

      expect(mockItineraryRepository.update).toHaveBeenCalledWith(
        validUpdateDto,
        itinerary.id,
      );
      expect(result).toEqual(updated);
    });

    it('updates amount and currency together', async () => {
      const itinerary = makeItineraryEntity();
      mockItineraryRepository.findById.mockResolvedValue(itinerary);
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination(),
      );
      mockItineraryRepository.update.mockResolvedValue({
        ...itinerary,
        amount: '40.00',
        currency: 'GBP',
      });
      const update = {
        ...validUpdateDto,
        amount: '40.00',
        currency: 'GBP',
      };

      await service.updateItinerary(1, update, userId);

      expect(mockItineraryRepository.update).toHaveBeenCalledWith(
        update,
        itinerary.id,
      );
    });

    it.each([
      ['amount without currency', { amount: '40.00' }],
      ['currency without amount', { currency: 'GBP' }],
    ])(
      'rejects updating %s when the existing itinerary has no cost',
      async (_scenario, cost) => {
        const itinerary = makeItineraryEntity();
        mockItineraryRepository.findById.mockResolvedValue(itinerary);
        mockTripsDestinationsRepository.findById.mockResolvedValue(
          makeTripDestination(),
        );

        await expect(
          service.updateItinerary(1, { ...validUpdateDto, ...cost }, userId),
        ).rejects.toThrow(ConflictException);
        expect(mockItineraryRepository.update).not.toHaveBeenCalled();
      },
    );

    it('validates a partial cost update against the existing itinerary value', async () => {
      const itinerary = makeItineraryEntity({ currency: 'GBP' });
      mockItineraryRepository.findById.mockResolvedValue(itinerary);
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination(),
      );
      mockItineraryRepository.update.mockResolvedValue({
        ...itinerary,
        amount: '40.00',
      });
      const update = { ...validUpdateDto, amount: '40.00' };

      await service.updateItinerary(1, update, userId);

      expect(mockItineraryRepository.update).toHaveBeenCalledWith(
        update,
        itinerary.id,
      );
    });

    it('accepts null amount and currency together to clear the cost', async () => {
      const update = Object.assign(new ItineraryUpdateDto(), {
        tripDestinationId: 'dest-1',
        amount: null,
        currency: null,
      });

      await expect(validate(update)).resolves.toEqual([]);

      const itinerary = makeItineraryEntity({
        amount: '40.00',
        currency: 'GBP',
      });
      mockItineraryRepository.findById.mockResolvedValue(itinerary);
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination(),
      );
      mockItineraryRepository.update.mockResolvedValue({
        ...itinerary,
        amount: null,
        currency: null,
      });

      await expect(
        service.updateItinerary(1, update, userId),
      ).resolves.toMatchObject({ amount: null, currency: null });
      expect(mockItineraryRepository.update).toHaveBeenCalledWith(
        update,
        itinerary.id,
      );
    });

    it('should throw NotFoundException when itinerary does not exist', () => {
      mockItineraryRepository.findById.mockResolvedValue(null);

      return expect(
        service.updateItinerary(1, validUpdateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when tripDestination does not exist', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(null);

      return expect(
        service.updateItinerary(1, validUpdateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when trip does not exist', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination({ trip: null }),
      );

      return expect(
        service.updateItinerary(1, validUpdateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when user has no permission', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination(),
      );
      mockTripsRepository.findById.mockResolvedValue(makeTrip());
      jest.spyOn(permissionHelper, 'canEditTrip').mockResolvedValue(false);

      return expect(
        service.updateItinerary(1, validUpdateDto, userId),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ConflictException when day is outside trip date range', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination({ endDate: new Date('2025-07-05') }),
      );

      return expect(
        service.updateItinerary(1, validUpdateDto, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when day is outside tripDestination date range', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination({ endDate: new Date('2025-07-08') }),
      );
      mockTripsRepository.findById.mockResolvedValue(makeTrip());

      return expect(
        service.updateItinerary(1, validUpdateDto, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException when repository throws on update', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination(),
      );
      mockTripsRepository.findById.mockResolvedValue(makeTrip());
      mockItineraryRepository.update.mockRejectedValue(
        new Error('DB connection lost'),
      );

      return expect(
        service.updateItinerary(1, validUpdateDto, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteItinerary', () => {
    const userId = 1;

    const itinerary = makeItineraryEntity({
      tripDestination: {
        id: 'dest-1',
        trip: { id: 'trip-1' },
      },
    });

    it('should delete the itinerary when user has permission', async () => {
      mockItineraryRepository.findById.mockResolvedValue(itinerary);
      mockItineraryRepository.delete.mockResolvedValue(true);

      const result = await service.deleteItinerary(itinerary.id, userId);

      expect(mockItineraryRepository.delete).toHaveBeenCalledWith(itinerary.id);
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when itinerary does not exist', () => {
      mockItineraryRepository.findById.mockResolvedValue(null);

      return expect(service.deleteItinerary('itin-1', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException when user has no permission', () => {
      mockItineraryRepository.findById.mockResolvedValue(itinerary);
      jest.spyOn(permissionHelper, 'canEditTrip').mockResolvedValue(false);

      return expect(
        service.deleteItinerary(itinerary.id, userId),
      ).rejects.toThrow(UnauthorizedException);
    });
    it('should throw InternalServerErrorException when repository throws on delete', () => {
      mockItineraryRepository.findById.mockResolvedValue(itinerary);
      mockItineraryRepository.delete.mockRejectedValue(
        new Error('DB connection lost'),
      );

      return expect(
        service.deleteItinerary(itinerary.id, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
