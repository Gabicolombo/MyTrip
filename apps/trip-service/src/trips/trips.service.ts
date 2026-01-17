import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TripsRepository } from './repositories/trips.repository';
import { TripsParticipantsRepository } from './repositories/tripsParticipants.repository';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Trips } from './entities/trips.entity';
import { TripParticipant } from './entities/trips-participants.entity';
import { Status } from './enums/status.enum';
import { Role } from './enums/role.enum';

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
      throw new ConflictException('Trip with this title already exists');
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

  async updateTripDetails(
    tripId: string,
    updateData: Partial<UpdateTripDto>,
  ): Promise<Trips> {
    const trip = await this.tripsRepository.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    return this.tripsRepository.update(trip.id, updateData);
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
}
