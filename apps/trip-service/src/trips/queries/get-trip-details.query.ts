import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Trips } from '../entities/trips.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetTripDetailsQuery {
  constructor(
    @InjectRepository(Trips)
    private readonly tripsRepository: Repository<Trips>,
  ) {}

  async getTripDetails(tripId: number): Promise<Trips | null> {
    return this.tripsRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.destinations', 'destination')
      .leftJoinAndSelect('trip.participants', 'participant')
      .where('trip.id = :tripId', { tripId })
      .getOne();
  }
}
