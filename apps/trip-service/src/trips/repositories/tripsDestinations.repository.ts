import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripDestination } from '../entities/trips-destinations.entity';
import { AddTripDestinationDto } from '../dto/add-trip-destination.dto';

@Injectable()
export class TripsDestinationsRepository {
  constructor(
    @InjectRepository(TripDestination)
    private readonly tripsDestinationsRepo: Repository<TripDestination>,
  ) {}

  async addDestination(
    tripDestinationDto: AddTripDestinationDto[],
  ): Promise<TripDestination[]> {
    try {
      const entities = tripDestinationDto.map((dto) =>
        this.tripsDestinationsRepo.create({
          ...dto,
          trip: { id: dto.tripId },
        }),
      );
      return await this.tripsDestinationsRepo.save(entities);
    } catch (error) {
      // Optionally log the error
      console.error(error);
      throw new InternalServerErrorException('Failed to save destinations');
    }
  }
}
