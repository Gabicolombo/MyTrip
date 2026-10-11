import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripParticipant } from '../entities/trips-participants.entity';
import { AddParticipantDto } from '../dto/add-participant.dto';

@Injectable()
export class TripsParticipantsRepository {
  constructor(
    @InjectRepository(TripParticipant)
    private readonly tripsParticipantsRepo: Repository<TripParticipant>,
  ) {}

  async addParticipant(
    tripParticipantDto: AddParticipantDto,
  ): Promise<TripParticipant> {
    return this.tripsParticipantsRepo.save(tripParticipantDto);
  }

  async findParticipant(
    tripId: number,
    userId: number,
  ): Promise<TripParticipant | null> {
    return this.tripsParticipantsRepo.findOne({
      where: { tripId, userId },
    });
  }

  async getParticipantsByTripId(tripId: number): Promise<TripParticipant[]> {
    return this.tripsParticipantsRepo.find({
      where: { tripId },
    });
  }

  async delete(tripId: number, userId: number): Promise<void> {
    const user = await this.findParticipant(tripId, userId);
    if (!user) {
      throw new Error('Participant not found');
    }
    await this.tripsParticipantsRepo.delete({ tripId, userId });
  }
}
