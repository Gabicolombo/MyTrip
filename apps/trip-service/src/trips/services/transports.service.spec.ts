import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransportsService } from './transports.service';
import { TransportsRepository } from '../repositories/transports.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { TripsDestinationsRepository } from '../repositories/tripsDestinations.repository';
import { AddTransportsDto } from '../dto/add-transports.dto';
import { Transports as TransportType } from '../enums/transports.enum';

const TRIP_ID = 1;
const USER_ID = 10;
const TRANSPORT_ID = 'transport-1';
const FROM_ID = '11111111-1111-1111-1111-111111111111';
const TO_ID = '22222222-2222-2222-2222-222222222222';

const validDto: AddTransportsDto = {
  mode: TransportType.FLIGHT,
  fromDestinationId: FROM_ID,
  toDestinationId: TO_ID,
  departureDate: '2026-07-10',
  departureTime: '14:35',
  arrivalDate: '2026-07-10',
  arrivalTime: '18:05',
  carrier: 'Transavia TO 7647',
  reference: 'X9HB3T',
  amount: '189.00',
  currency: 'EUR',
};

const makeTransport = (overrides = {}) => ({
  id: TRANSPORT_ID,
  tripId: TRIP_ID,
  ...validDto,
  ...overrides,
});

const mockTransportsRepository = {
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  findAllByTrip: jest.fn(),
  findByIdAndTrip: jest.fn(),
};

const mockTripsParticipantsRepository = {
  findParticipant: jest.fn(),
};

const mockTripsDestinationsRepository = {
  findDestinationByTripId: jest.fn(),
};

const asEditor = () =>
  mockTripsParticipantsRepository.findParticipant.mockResolvedValue({
    role: 'EDITOR',
  });
const asViewer = () =>
  mockTripsParticipantsRepository.findParticipant.mockResolvedValue({
    role: 'VIEWER',
  });
const asNonParticipant = () =>
  mockTripsParticipantsRepository.findParticipant.mockResolvedValue(null);
const destinationsFound = () =>
  mockTripsDestinationsRepository.findDestinationByTripId.mockResolvedValue([
    { id: FROM_ID },
    { id: TO_ID },
  ]);

describe('TransportsService', () => {
  let service: TransportsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportsService,
        { provide: TransportsRepository, useValue: mockTransportsRepository },
        {
          provide: TripsParticipantsRepository,
          useValue: mockTripsParticipantsRepository,
        },
        {
          provide: TripsDestinationsRepository,
          useValue: mockTripsDestinationsRepository,
        },
      ],
    }).compile();

    service = module.get<TransportsService>(TransportsService);

    mockTransportsRepository.create.mockImplementation((data) => data);
    mockTransportsRepository.save.mockImplementation((data) =>
      Promise.resolve(data),
    );
  });

  describe('addTransport', () => {
    it('creates the transport when everything is valid', async () => {
      asEditor();
      destinationsFound();

      const result = await service.addTransport(TRIP_ID, USER_ID, validDto);

      expect(
        mockTripsDestinationsRepository.findDestinationByTripId,
      ).toHaveBeenCalledWith(TRIP_ID, [FROM_ID, TO_ID]);
      expect(mockTransportsRepository.save).toHaveBeenCalledWith({
        ...validDto,
        tripId: TRIP_ID,
      });
      expect(result).toEqual({ ...validDto, tripId: TRIP_ID });
    });

    it('accepts a leg that arrives on the next day', async () => {
      asEditor();
      destinationsFound();

      await expect(
        service.addTransport(TRIP_ID, USER_ID, {
          ...validDto,
          departureTime: '23:00',
          arrivalDate: '2026-07-11',
          arrivalTime: '07:00',
        }),
      ).resolves.toBeDefined();
    });

    it('throws Forbidden when the user is a VIEWER', async () => {
      asViewer();

      await expect(
        service.addTransport(TRIP_ID, USER_ID, validDto),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTransportsRepository.save).not.toHaveBeenCalled();
    });

    it('throws Forbidden when the user is not a participant', async () => {
      asNonParticipant();

      await expect(
        service.addTransport(TRIP_ID, USER_ID, validDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequest when from and to are the same destination', async () => {
      asEditor();

      await expect(
        service.addTransport(TRIP_ID, USER_ID, {
          ...validDto,
          toDestinationId: FROM_ID,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockTransportsRepository.save).not.toHaveBeenCalled();
    });

    it('throws BadRequest when a destination is not part of the trip', async () => {
      asEditor();
      mockTripsDestinationsRepository.findDestinationByTripId.mockResolvedValue(
        [{ id: FROM_ID }],
      );

      await expect(
        service.addTransport(TRIP_ID, USER_ID, validDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockTransportsRepository.save).not.toHaveBeenCalled();
    });

    it('throws BadRequest when arrival is before departure', async () => {
      asEditor();
      destinationsFound();

      await expect(
        service.addTransport(TRIP_ID, USER_ID, {
          ...validDto,
          arrivalTime: '12:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequest when arrival equals departure', async () => {
      asEditor();
      destinationsFound();

      await expect(
        service.addTransport(TRIP_ID, USER_ID, {
          ...validDto,
          arrivalTime: '14:35',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTransport', () => {
    it('updates the transport when everything is valid', async () => {
      asEditor();
      destinationsFound();
      mockTransportsRepository.findByIdAndTrip.mockResolvedValue(
        makeTransport(),
      );

      const dto = { ...validDto, carrier: 'TAP TP 1234' };
      const result = await service.updateTransport(
        TRANSPORT_ID,
        USER_ID,
        dto,
        TRIP_ID,
      );

      expect(mockTransportsRepository.findByIdAndTrip).toHaveBeenCalledWith(
        TRANSPORT_ID,
        TRIP_ID,
      );
      expect(result).toMatchObject({ carrier: 'TAP TP 1234' });
    });

    it('throws NotFound when the transport is not in this trip', async () => {
      asEditor();
      mockTransportsRepository.findByIdAndTrip.mockResolvedValue(null);

      await expect(
        service.updateTransport(TRANSPORT_ID, USER_ID, validDto, TRIP_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockTransportsRepository.save).not.toHaveBeenCalled();
    });

    it('throws Forbidden when the user is a VIEWER', async () => {
      asViewer();
      mockTransportsRepository.findByIdAndTrip.mockResolvedValue(
        makeTransport(),
      );

      await expect(
        service.updateTransport(TRANSPORT_ID, USER_ID, validDto, TRIP_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTransportsRepository.save).not.toHaveBeenCalled();
    });

    it('throws BadRequest when a destination is not part of the trip', async () => {
      asEditor();
      mockTransportsRepository.findByIdAndTrip.mockResolvedValue(
        makeTransport(),
      );
      mockTripsDestinationsRepository.findDestinationByTripId.mockResolvedValue(
        [{ id: FROM_ID }],
      );

      await expect(
        service.updateTransport(TRANSPORT_ID, USER_ID, validDto, TRIP_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a leg that arrives on the next day', async () => {
      asEditor();
      destinationsFound();
      mockTransportsRepository.findByIdAndTrip.mockResolvedValue(
        makeTransport(),
      );

      await expect(
        service.updateTransport(
          TRANSPORT_ID,
          USER_ID,
          {
            ...validDto,
            departureTime: '23:00',
            arrivalDate: '2026-07-11',
            arrivalTime: '07:00',
          },
          TRIP_ID,
        ),
      ).resolves.toBeDefined();
    });

    it('throws BadRequest when arrival is before departure', async () => {
      asEditor();
      destinationsFound();
      mockTransportsRepository.findByIdAndTrip.mockResolvedValue(
        makeTransport(),
      );

      await expect(
        service.updateTransport(
          TRANSPORT_ID,
          USER_ID,
          { ...validDto, arrivalTime: '12:00' },
          TRIP_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTransport', () => {
    it('removes the transport', async () => {
      asEditor();
      const transport = makeTransport();
      mockTransportsRepository.findByIdAndTrip.mockResolvedValue(transport);

      await service.deleteTransport(TRANSPORT_ID, USER_ID, TRIP_ID);

      expect(mockTransportsRepository.findByIdAndTrip).toHaveBeenCalledWith(
        TRANSPORT_ID,
        TRIP_ID,
      );
      expect(mockTransportsRepository.remove).toHaveBeenCalledWith(transport);
    });

    it('throws Forbidden when the user is a VIEWER', async () => {
      asViewer();

      await expect(
        service.deleteTransport(TRANSPORT_ID, USER_ID, TRIP_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTransportsRepository.remove).not.toHaveBeenCalled();
    });

    it('throws NotFound when the transport belongs to another trip', async () => {
      asEditor();
      mockTransportsRepository.findByIdAndTrip.mockResolvedValue(null);

      await expect(
        service.deleteTransport(TRANSPORT_ID, USER_ID, TRIP_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockTransportsRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getAllTransports', () => {
    it('returns the transports of the trip for a VIEWER', async () => {
      asViewer();
      const transports = [makeTransport()];
      mockTransportsRepository.findAllByTrip.mockResolvedValue(transports);

      const result = await service.getAllTransports(TRIP_ID, USER_ID);

      expect(mockTransportsRepository.findAllByTrip).toHaveBeenCalledWith(
        TRIP_ID,
      );
      expect(result).toBe(transports);
    });

    it('throws Forbidden when the user is not a participant', async () => {
      asNonParticipant();

      await expect(service.getAllTransports(TRIP_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockTransportsRepository.findAllByTrip).not.toHaveBeenCalled();
    });
  });

  describe('getTransportById', () => {
    it('returns the transport for a VIEWER', async () => {
      asViewer();
      const transport = makeTransport();
      mockTransportsRepository.findByIdAndTrip.mockResolvedValue(transport);

      const result = await service.getTransportById(
        TRANSPORT_ID,
        USER_ID,
        TRIP_ID,
      );

      expect(result).toBe(transport);
    });

    it('throws Forbidden when the user is not a participant', async () => {
      asNonParticipant();

      await expect(
        service.getTransportById(TRANSPORT_ID, USER_ID, TRIP_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFound when the transport belongs to another trip', async () => {
      asViewer();
      mockTransportsRepository.findByIdAndTrip.mockResolvedValue(null);

      await expect(
        service.getTransportById(TRANSPORT_ID, USER_ID, TRIP_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
