import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TripsRepository } from '../repositories/trips.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { RoleInvitation } from '../repositories/tripsInvites.repository';
import { TripParticipant } from '../entities/trips-participants.entity';
import { TripsInvites } from '../entities/trips-invites.entity';
import { User } from 'apps/auth-service/src/users/entities/user.entity';
import { Role } from '../enums/role.enum';

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly tripsParticipantsRepository: TripsParticipantsRepository,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async checkParticipantExists(
    tripId: number,
    userId: number,
  ): Promise<TripParticipant | null> {
    const participant = await this.tripsParticipantsRepository.findParticipant(
      tripId,
      userId,
    );
    return participant;
  }

  async addParticipant(tripId: number, userId: number, role: Role) {
    const trip = await this.tripsRepository.findById(String(tripId));
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const participantExists =
      await this.tripsParticipantsRepository.findParticipant(tripId, userId);
    if (participantExists) {
      throw new ConflictException('User is already a participant in this trip');
    }

    const participant = await this.tripsParticipantsRepository.addParticipant({
      tripId: Number(tripId),
      userId,
      role,
      joinedAt: new Date(),
    });
    return participant;
  }

  async deleteParticipant(
    tripId: number,
    userId: number,
    currentUserId: number,
  ) {
    const participants =
      await this.tripsParticipantsRepository.getParticipantsByTripId(tripId);
    const currentParticipant = participants.find(
      (p) => p.userId === currentUserId,
    );

    if (!currentParticipant) {
      throw new NotFoundException(
        'Current user is not a participant of this trip',
      );
    }

    if (String(currentParticipant.role) !== String(Role.OWNER)) {
      throw new UnauthorizedException(
        'Current user does not have permission to delete participants from this trip',
      );
    }

    if (userId === currentUserId) {
      throw new BadRequestException(
        'Current user cannot delete themselves from the trip',
      );
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.dataSource.manager.transaction(async (manager) => {
        await manager.delete(TripParticipant, {
          tripId,
          userId,
        });
        await manager.delete(TripsInvites, {
          tripId,
          email: user.email,
        });
      });
      return true;
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error deleting participant: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateParticipantRole(
    tripId: number,
    userId: number,
    newRole: RoleInvitation,
    currentUserId: number,
  ) {
    if (newRole !== 'EDITOR' && newRole !== 'VIEWER') {
      throw new BadRequestException('newRole must be EDITOR or VIEWER');
    }
    const participants =
      await this.tripsParticipantsRepository.getParticipantsByTripId(tripId);
    const currentParticipant = participants.find(
      (p) => p.userId === currentUserId,
    );

    if (!currentParticipant) {
      throw new NotFoundException(
        'Current user is not a participant of this trip',
      );
    }

    if (String(currentParticipant.role) !== String(Role.OWNER)) {
      throw new UnauthorizedException(
        'Current user does not have permission to update participant roles for this trip',
      );
    }

    const participant = participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.role === 'OWNER') {
      throw new BadRequestException('The trip owner role cannot be changed');
    }

    try {
      await this.tripsParticipantsRepository.updateRole(
        tripId,
        userId,
        newRole,
      );
      return true;
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error updating participant role: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
