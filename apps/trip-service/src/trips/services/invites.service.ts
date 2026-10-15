import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TripsRepository } from '../repositories/trips.repository';
import {
  RoleInvitation,
  TripsInvitesRepository,
} from '../repositories/tripsInvites.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { InviteStatus } from '../enums/invite-status.enum';
import { TripParticipant } from '../entities/trips-participants.entity';
import { TripsInvites } from '../entities/trips-invites.entity';
import { User } from 'apps/auth-service/src/users/entities/user.entity';
import { EmailService } from '../../email/email.service';

@Injectable()
export class InvitesService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly tripsParticipantsRepository: TripsParticipantsRepository,
    private readonly tripsInvitesRepository: TripsInvitesRepository,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async addInvite(
    tripId: number,
    userId: number,
    email: string,
    role: RoleInvitation,
  ) {
    const trip = await this.tripsRepository.findById(String(tripId));
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const participant = await this.tripsParticipantsRepository.findParticipant(
      tripId,
      userId,
    );
    if (!participant) {
      throw new UnauthorizedException('User is not a participant of this trip');
    }
    if (participant.role === 'VIEWER') {
      throw new UnauthorizedException(
        'User does not have permission to invite participants',
      );
    }

    const inviteExists =
      await this.tripsInvitesRepository.findInviteByTripAndEmail(tripId, email);
    if (inviteExists?.status === InviteStatus.ACCEPTED) {
      throw new ConflictException('Invite already accepted for this email');
    }

    const userExists = await this.usersRepository.findOneBy({ email });
    if (userExists) {
      const participantExists =
        await this.tripsParticipantsRepository.findParticipant(
          tripId,
          userExists.id,
        );
      if (participantExists) {
        throw new ConflictException(
          'User is already a participant of this trip',
        );
      }
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const invite = await this.tripsInvitesRepository.addInvite({
      ...inviteExists,
      tripId,
      email,
      role,
      tokenHash,
      status: InviteStatus.PENDING,
      expiredAt,
    });
    await this.emailService.sendTripInvite({
      to: email,
      tripTitle: trip.title,
      token,
      expiresAt: invite.expiredAt,
    });
    return {
      id: invite.id,
      tripId: invite.tripId,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiredAt: invite.expiredAt,
      createdAt: invite.createdAt,
    };
  }

  async acceptInvite(token: string, userId: number) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user || !user.emailVerified) {
      throw new UnauthorizedException(
        'A verified account is required to accept an invite',
      );
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    return this.dataSource.transaction(async (manager) => {
      const invitesRepository = manager.getRepository(TripsInvites);
      const invite = await invitesRepository.findOne({
        where: { tokenHash },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invite) {
        throw new NotFoundException('Invite not found');
      }
      if (invite.status !== InviteStatus.PENDING) {
        throw new ConflictException('Invite is no longer pending');
      }
      if (invite.expiredAt <= new Date()) {
        throw new UnauthorizedException('Invite has expired');
      }
      if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new UnauthorizedException(
          'Invite email does not match the current user',
        );
      }

      const participantsRepository = manager.getRepository(TripParticipant);
      const existingParticipant = await participantsRepository.findOneBy({
        tripId: invite.tripId,
        userId,
      });
      if (existingParticipant) {
        throw new ConflictException(
          'User is already a participant in this trip',
        );
      }

      await participantsRepository.save({
        tripId: invite.tripId,
        userId,
        role: invite.role,
        joinedAt: new Date(),
      });
      invite.status = InviteStatus.ACCEPTED;
      await invitesRepository.save(invite);

      return { tripId: invite.tripId, role: invite.role };
    });
  }
}
