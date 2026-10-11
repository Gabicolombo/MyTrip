import { TripsInvites } from '../entities/trips-invites.entity';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { InviteStatus } from '../enums/invite-status.enum';

export type RoleInvitation = 'EDITOR' | 'VIEWER';

@Injectable()
export class TripsInvitesRepository {
  constructor(
    @InjectRepository(TripsInvites)
    private readonly tripsInvitesRepository: Repository<TripsInvites>,
  ) {}

  async addInvite(invite: DeepPartial<TripsInvites>): Promise<TripsInvites> {
    try {
      return await this.tripsInvitesRepository.save(
        this.tripsInvitesRepository.create(invite),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to add invite',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async findInviteByTokenHash(tokenHash: string): Promise<TripsInvites | null> {
    try {
      return await this.tripsInvitesRepository.findOne({
        where: { tokenHash },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to find invite by token',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async findInviteByTripAndEmail(
    tripId: number,
    email: string,
  ): Promise<TripsInvites | null> {
    try {
      return await this.tripsInvitesRepository.findOne({
        where: { tripId, email },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to find invite by trip and email',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async updateStatus(
    tokenHash: string,
    status: InviteStatus,
  ): Promise<TripsInvites> {
    try {
      const invite = await this.findInviteByTokenHash(tokenHash);
      if (!invite) {
        throw new InternalServerErrorException('Invite not found');
      }
      invite.status = status;
      return await this.tripsInvitesRepository.save(invite);
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to update invite status',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async deleteInviteByTripIdAndEmail(
    tripId: number,
    email: string,
  ): Promise<void> {
    try {
      await this.tripsInvitesRepository.delete({ tripId, email });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete invite by trip and email',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
