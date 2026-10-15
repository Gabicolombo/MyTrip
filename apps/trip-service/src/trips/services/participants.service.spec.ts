import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ParticipantsService } from './participants.service';
import { TripsRepository } from '../repositories/trips.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { User } from 'apps/auth-service/src/users/entities/user.entity';
import { TripsInvites } from '../entities/trips-invites.entity';
import { TripParticipant } from '../entities/trips-participants.entity';

const mockTripsRepository = {
  findById: jest.fn(),
  findByTitle: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
};

const mockUsersRepository = {
  findOneBy: jest.fn(),
  findOne: jest.fn(),
};

const mockTripsParticipantsRepository = {
  findParticipant: jest.fn(),
  addParticipant: jest.fn(),
  getParticipantsByTripId: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
  manager: { transaction: jest.fn() },
  createQueryRunner: jest.fn(),
};

describe('ParticipantsService', () => {
  let service: ParticipantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        { provide: TripsRepository, useValue: mockTripsRepository },
        {
          provide: TripsParticipantsRepository,
          useValue: mockTripsParticipantsRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<ParticipantsService>(ParticipantsService);

    jest.clearAllMocks();
  });

  describe('deleteParticipant', () => {
    const tripId = 12;
    const ownerId = 7;
    const targetId = 8;
    const manager = { delete: jest.fn() };

    beforeEach(() => {
      mockTripsParticipantsRepository.getParticipantsByTripId.mockResolvedValue(
        [
          { userId: ownerId, role: 'OWNER' },
          { userId: targetId, role: 'EDITOR' },
          { userId: 9, role: 'VIEWER' },
        ],
      );
      mockUsersRepository.findOne.mockResolvedValue({
        id: targetId,
        email: 'traveler@example.com',
      });
      manager.delete.mockResolvedValue({ affected: 1 });
      mockDataSource.manager.transaction.mockImplementation((callback) =>
        callback(manager),
      );
    });

    it('lets the owner remove a participant along with their invite', async () => {
      await expect(
        service.deleteParticipant(tripId, targetId, ownerId),
      ).resolves.toBe(true);

      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: targetId },
      });
      expect(manager.delete).toHaveBeenCalledWith(TripParticipant, {
        tripId,
        userId: targetId,
      });
      expect(manager.delete).toHaveBeenCalledWith(TripsInvites, {
        tripId,
        email: 'traveler@example.com',
      });
    });

    it('rejects a current user who is not a trip participant', async () => {
      await expect(
        service.deleteParticipant(tripId, targetId, 99),
      ).rejects.toThrow(NotFoundException);
      expect(mockDataSource.manager.transaction).not.toHaveBeenCalled();
    });

    it.each([
      ['an editor', targetId, 9],
      ['a viewer', 9, targetId],
    ])(
      'does not let %s remove a participant',
      async (_role, current, target) => {
        await expect(
          service.deleteParticipant(tripId, target, current),
        ).rejects.toThrow(UnauthorizedException);
        expect(mockDataSource.manager.transaction).not.toHaveBeenCalled();
      },
    );

    it('does not let the owner remove themselves', async () => {
      await expect(
        service.deleteParticipant(tripId, ownerId, ownerId),
      ).rejects.toThrow(BadRequestException);
      expect(mockDataSource.manager.transaction).not.toHaveBeenCalled();
    });

    it('returns not found when the target user does not exist', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteParticipant(tripId, targetId, ownerId),
      ).rejects.toThrow(NotFoundException);
      expect(mockDataSource.manager.transaction).not.toHaveBeenCalled();
    });

    it('reports a failed removal as an internal error', async () => {
      manager.delete.mockRejectedValue(new Error('connection lost'));

      await expect(
        service.deleteParticipant(tripId, targetId, ownerId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
