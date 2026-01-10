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
}
