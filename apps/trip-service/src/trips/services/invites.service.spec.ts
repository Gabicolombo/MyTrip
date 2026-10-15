import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { InvitesService } from './invites.service';
import { TripsRepository } from '../repositories/trips.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { TripsInvitesRepository } from '../repositories/tripsInvites.repository';
import { EmailService } from '../../email/email.service';
import { User } from 'apps/auth-service/src/users/entities/user.entity';
import { TripsInvites } from '../entities/trips-invites.entity';

const mockTripsRepository = {
  findById: jest.fn(),
  findByTitle: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
};

const mockTripsInvitesRepository = {
  addInvite: jest.fn(),
  findInviteByTripAndEmail: jest.fn(),
};

const mockEmailService = {
  sendTripInvite: jest.fn(),
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

describe('InvitesService', () => {
  let service: InvitesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: TripsRepository, useValue: mockTripsRepository },
        {
          provide: TripsParticipantsRepository,
          useValue: mockTripsParticipantsRepository,
        },
        {
          provide: TripsInvitesRepository,
          useValue: mockTripsInvitesRepository,
        },
        { provide: EmailService, useValue: mockEmailService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<InvitesService>(InvitesService);

    jest.clearAllMocks();
  });

  describe('trip invites', () => {
    const createdAt = new Date();

    beforeEach(() => {
      mockTripsRepository.findById.mockResolvedValue({
        id: 12,
        title: 'Lisbon',
      });
      mockTripsParticipantsRepository.findParticipant.mockResolvedValue({
        role: 'OWNER',
      });
      mockTripsInvitesRepository.findInviteByTripAndEmail.mockResolvedValue(
        null,
      );
      mockTripsInvitesRepository.addInvite.mockImplementation(
        async (invite) => ({ id: 'invite-1', createdAt, ...invite }),
      );
      mockUsersRepository.findOneBy.mockResolvedValue(null);
    });

    it('renews and resends an existing invite that was not accepted', async () => {
      mockTripsInvitesRepository.findInviteByTripAndEmail.mockResolvedValue({
        id: 'invite-old',
        tripId: 12,
        email: 'traveler@example.com',
        role: 'VIEWER',
        status: 'REJECTED',
        expiredAt: new Date(Date.now() - 60_000),
        createdAt,
      });

      const result = await service.addInvite(
        12,
        7,
        'traveler@example.com',
        'EDITOR',
      );

      expect(mockTripsInvitesRepository.addInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'invite-old',
          role: 'EDITOR',
          status: 'PENDING',
        }),
      );
      expect(result.expiredAt.getTime()).toBeGreaterThan(Date.now());
      expect(mockEmailService.sendTripInvite).toHaveBeenCalledTimes(1);
    });

    it('rejects an invite that was already accepted', async () => {
      mockTripsInvitesRepository.findInviteByTripAndEmail.mockResolvedValue({
        id: 'invite-old',
        status: 'ACCEPTED',
      });

      await expect(
        service.addInvite(12, 7, 'traveler@example.com', 'EDITOR'),
      ).rejects.toThrow(ConflictException);
      expect(mockTripsInvitesRepository.addInvite).not.toHaveBeenCalled();
      expect(mockEmailService.sendTripInvite).not.toHaveBeenCalled();
    });

    it('rejects an invite for someone who is already a participant', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue({ id: 8 });

      await expect(
        service.addInvite(12, 7, 'traveler@example.com', 'EDITOR'),
      ).rejects.toThrow(ConflictException);
      expect(
        mockTripsParticipantsRepository.findParticipant,
      ).toHaveBeenCalledWith(12, 8);
      expect(mockTripsInvitesRepository.addInvite).not.toHaveBeenCalled();
      expect(mockEmailService.sendTripInvite).not.toHaveBeenCalled();
    });

    it('stores only a token hash and emails the raw token', async () => {
      const result = await service.addInvite(
        12,
        7,
        'traveler@example.com',
        'EDITOR',
      );
      const sentEmail = mockEmailService.sendTripInvite.mock.calls[0][0];

      expect(sentEmail.token).toMatch(/^[a-f0-9]{64}$/);
      expect(mockTripsInvitesRepository.addInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: createHash('sha256').update(sentEmail.token).digest('hex'),
        }),
      );
      expect(result).not.toHaveProperty('tokenHash');
    });

    it('accepts a valid invite for the verified matching account', async () => {
      const token = 'a'.repeat(64);
      const invite = {
        tripId: 12,
        email: 'traveler@example.com',
        role: 'EDITOR',
        status: 'PENDING',
        expiredAt: new Date(Date.now() + 60_000),
      };
      const inviteRepository = {
        findOne: jest.fn().mockResolvedValue(invite),
        save: jest.fn().mockImplementation(async (value) => value),
      };
      const participantsRepository = {
        findOneBy: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue({}),
      };
      mockUsersRepository.findOneBy.mockResolvedValue({
        id: 7,
        email: 'traveler@example.com',
        emailVerified: true,
      });
      mockDataSource.transaction.mockImplementation((callback) =>
        callback({
          getRepository: (entity) =>
            entity === TripsInvites ? inviteRepository : participantsRepository,
        }),
      );

      await expect(service.acceptInvite(token, 7)).resolves.toEqual({
        tripId: 12,
        role: 'EDITOR',
      });
      expect(inviteRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tokenHash: createHash('sha256').update(token).digest('hex'),
          },
        }),
      );
      expect(participantsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ tripId: 12, userId: 7, role: 'EDITOR' }),
      );
      expect(invite.status).toBe('ACCEPTED');
    });
  });
});
