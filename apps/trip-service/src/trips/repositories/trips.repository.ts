import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trips } from '../entities/trips.entity';
import { UpdateTripDto } from '../dto/update-trip.dto';

@Injectable()
export class TripsRepository {
  constructor(
    @InjectRepository(Trips) private readonly tripsRepo: Repository<Trips>,
  ) {}

  async findById(tripId: string): Promise<Trips | null> {
    return this.tripsRepo.findOne({
      where: { id: Number(tripId) },
      relations: ['destinations', 'participants'],
    });
  }

  async findByTitle(title: string): Promise<Trips | null> {
    return this.tripsRepo.findOne({
      where: { title },
    });
  }

  async findByUserId(userId: string): Promise<Trips[]> {
    return this.tripsRepo
      .createQueryBuilder('trip')
      .innerJoinAndSelect('trip.participants', 'participant')
      .leftJoinAndSelect('trip.destinations', 'destination')
      .where('participant.userId = :userId', { userId })
      .getMany();
  }

  async update(
    tripId: number,
    updateData: Partial<UpdateTripDto>,
  ): Promise<Trips> {
    await this.tripsRepo.update(tripId, updateData as any);
    return this.findById(tripId.toString()) as Promise<Trips>;
  }
}
