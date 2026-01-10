import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TripsRepository } from './repositories/trips.repository';
import { TripsParticipantsRepository } from './repositories/tripsParticipants.repository';
import { CreateTripDto } from './dto/create-trip.dto';
import { Trips } from './entities/trips.entity';
import { TripParticipant } from './entities/trips-participants.entity';
import { Status } from './enums/status.enum';

@Injectable()
export class TripsService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly tripsParticipantsRepository: TripsParticipantsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async createTrip(userId: number, tripData: CreateTripDto) {
    const trip = await this.tripsRepository.findByTitle(tripData.title);
    if (trip) {
      throw new Error('Trip with this title already exists');
    }

    // Use transaction to ensure both operations succeed or fail together
    return await this.dataSource.transaction(async (manager) => {
      // Save the trip within the transaction
      const tripEntity = manager.create(Trips, {
        title: tripData.title,
        description: tripData.description,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        userId,
        status: (tripData.status ?? Status.Initiated) as Status,
      });
      const newTrip = await manager.save(tripEntity);

      // Add the participant within the same transaction
      await manager.save(TripParticipant, {
        tripId: newTrip.id,
        userId,
        role: 'OWNER',
        joinedAt: new Date(),
      });

      return newTrip;
    });
  }
}
