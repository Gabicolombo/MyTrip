import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { ItineraryDto } from './dto/add-itinerary.dto';
import { ItineraryUpdateDto } from './dto/update-itinerary.dto';
import { Activity } from './enums/activity.enum';
import * as permissionHelper from './common/check-user-permission';
import { Trips } from './entities/trips.entity';
import { UploadService } from '../upload/upload.service';
import { DataSource } from 'typeorm';
import { TripsRepository } from './repositories/trips.repository';
import { TripsParticipantsRepository } from './repositories/tripsParticipants.repository';
import { TripsDestinationsRepository } from './repositories/tripsDestinations.repository';
import { ItineraryRepository } from './repositories/itinerary.repository';
import { VisaRepository } from './repositories/visa.repository';

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
};

const mockTripsDestinationsRepository = {
  findById: jest.fn(),
  addDestination: jest.fn(),
};

const mockItineraryRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

const mockVisaRepository = {
  checkVisaRequirements: jest.fn(),
};

const mockUploadService = {
  uploadTripImage: jest.fn(),
};

describe('TripsService - Itinerary', () => {
  let service: TripsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
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
        { provide: VisaRepository, useValue: mockVisaRepository },
        {
          provide: getRepositoryToken(Trips),
          useValue: { createQueryBuilder: jest.fn() },
        },
        { provide: UploadService, useValue: mockUploadService },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn(), createQueryRunner: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);

    jest.clearAllMocks();
    jest.spyOn(permissionHelper, 'checkUserPermission').mockResolvedValue(true);
  });
  describe('addItinerary', () => {
    const userId = 1;

    const validDto: ItineraryDto = {
      name: 'Visit Museum',
      tripDestinationId: 'dest-1',
      day: new Date('2025-07-10'),
      time: '10:00',
      activity: Activity.Museum,
      notes: 'Buy tickets in advance',
      link: 'https://museum.com',
      latitude: -23.5505,
      longitude: -46.6333,
    };

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
      jest
        .spyOn(permissionHelper, 'checkUserPermission')
        .mockResolvedValue(false);

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
      id: 'itin-1',
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

      const result = await service.updateItinerary(validUpdateDto, userId);

      expect(mockItineraryRepository.update).toHaveBeenCalledWith(
        validUpdateDto,
        itinerary.id,
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when itinerary does not exist', () => {
      mockItineraryRepository.findById.mockResolvedValue(null);

      return expect(
        service.updateItinerary(validUpdateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when tripDestination does not exist', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(null);

      return expect(
        service.updateItinerary(validUpdateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when trip does not exist', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination({ trip: null }),
      );

      return expect(
        service.updateItinerary(validUpdateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when user has no permission', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination(),
      );
      mockTripsRepository.findById.mockResolvedValue(makeTrip());
      jest
        .spyOn(permissionHelper, 'checkUserPermission')
        .mockResolvedValue(false);

      return expect(
        service.updateItinerary(validUpdateDto, userId),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ConflictException when day is outside trip date range', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination({ endDate: new Date('2025-07-05') }),
      );

      return expect(
        service.updateItinerary(validUpdateDto, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when day is outside tripDestination date range', () => {
      mockItineraryRepository.findById.mockResolvedValue(makeItineraryEntity());
      mockTripsDestinationsRepository.findById.mockResolvedValue(
        makeTripDestination({ endDate: new Date('2025-07-08') }),
      );
      mockTripsRepository.findById.mockResolvedValue(makeTrip());

      return expect(
        service.updateItinerary(validUpdateDto, userId),
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
        service.updateItinerary(validUpdateDto, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
