import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { isDateString } from 'class-validator';
import { DataSource } from 'typeorm';
import { TripsRepository } from '../repositories/trips.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { AddTripDestinationDto } from '../dto/add-trip-destination.dto';
import { UpdateTripDestinationDto } from '../dto/update-trip-destination.dto';
import { Trips } from '../entities/trips.entity';
import { TripDestination } from '../entities/trips-destinations.entity';
import { canEditTrip } from '../common/check-user-permission';
import { parseDateAsLocal } from '../common/date';

type DestinationPeriod = {
  id?: string;
  city: string;
  country: string;
  startDate: string | Date;
  endDate: string | Date;
};

@Injectable()
export class DestinationsService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly tripsParticipantsRepository: TripsParticipantsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async addDestination(
    tripDestinationDto: AddTripDestinationDto[],
    userId: number,
  ) {
    if (tripDestinationDto.length === 0) {
      throw new BadRequestException('At least one destination is required');
    }
    const tripId = tripDestinationDto[0].tripId;
    if (
      tripDestinationDto.some((destination) => destination.tripId !== tripId)
    ) {
      throw new BadRequestException(
        'All destinations must belong to the same trip',
      );
    }
    // we need to check if the trip is valid, and if the user is a participant of the trip
    const trip = await this.tripsRepository.findById(String(tripId));
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const participantExists =
      await this.tripsParticipantsRepository.findParticipant(tripId, userId);
    if (!participantExists) {
      throw new NotFoundException('User is not a participant of this trip');
    }
    if (participantExists.role === 'VIEWER') {
      throw new UnauthorizedException(
        'User does not have permission to add destinations',
      );
    }
    let tripStartDate = this.destinationDate(trip.startDate);
    let tripEndDate = this.destinationDate(trip.endDate);
    for (const destination of tripDestinationDto) {
      const startDate = this.destinationDate(destination.startDate);
      const endDate = this.destinationDate(destination.endDate);
      if (startDate > endDate) {
        throw new ConflictException(
          'Destination start date must not be after end date',
        );
      }

      if (startDate < tripStartDate) {
        tripStartDate = startDate;
      }

      if (endDate > tripEndDate) {
        tripEndDate = endDate;
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const destinationsRepo = manager.getRepository(TripDestination);
      const destinations = await destinationsRepo.findBy({
        trip: { id: tripId },
      });
      const cities = destinations.map((destination) => destination.city);
      const newDestinations = tripDestinationDto.filter(
        (d) => !cities.includes(d.city),
      );
      const scheduledDestinations: DestinationPeriod[] = [...destinations];
      for (const destination of newDestinations) {
        this.validateDestinationOverlap(destination, scheduledDestinations);
        scheduledDestinations.push(destination);
      }
      const entities = newDestinations.map((destination) =>
        destinationsRepo.create({
          city: destination.city,
          country: destination.country,
          startDate: parseDateAsLocal(destination.startDate),
          endDate: parseDateAsLocal(destination.endDate),
          trip: { id: tripId },
        }),
      );

      const savedDestinations = await destinationsRepo.save(entities);
      await manager.getRepository(Trips).update(tripId, {
        startDate: parseDateAsLocal(tripStartDate),
        endDate: parseDateAsLocal(tripEndDate),
      });
      return savedDestinations;
    });
  }

  private destinationDate(value: string | Date): string {
    const date =
      value instanceof Date ? value.toISOString().slice(0, 10) : value;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !isDateString(date, { strict: true })
    ) {
      throw new BadRequestException('Dates must be valid YYYY-MM-DD values');
    }
    return date;
  }

  private validateDestinationOverlap(
    destination: DestinationPeriod,
    others: DestinationPeriod[],
  ): void {
    const startDate = this.destinationDate(destination.startDate);
    const endDate = this.destinationDate(destination.endDate);
    const conflictingDestinations = others.filter((other) => {
      const otherStart = this.destinationDate(other.startDate);
      const otherEnd = this.destinationDate(other.endDate);
      return startDate < otherEnd && endDate > otherStart;
    });
    if (conflictingDestinations.length > 0) {
      throw new ConflictException({
        message: 'Destination dates overlap with other destinations',
        conflictingDestinations: conflictingDestinations.map((other) => ({
          id: other.id,
          city: other.city,
          country: other.country,
          startDate: this.destinationDate(other.startDate),
          endDate: this.destinationDate(other.endDate),
        })),
      });
    }
  }

  async updateDestination(
    destinationId: string,
    updateData: UpdateTripDestinationDto,
    userId: number,
  ): Promise<TripDestination> {
    return this.dataSource.transaction(async (manager) => {
      const destinationsRepo = manager.getRepository(TripDestination);
      const destination = await destinationsRepo.findOne({
        where: { id: destinationId },
        relations: ['trip', 'itineraries'],
      });
      if (!destination) {
        throw new NotFoundException('Trip destination not found');
      }
      const trip = destination.trip;
      if (
        !(await canEditTrip(this.tripsParticipantsRepository, userId, trip.id))
      ) {
        throw new UnauthorizedException(
          'User does not have permission to update the destination',
        );
      }

      const startDate = this.destinationDate(
        updateData.startDate ?? destination.startDate,
      );
      const endDate = this.destinationDate(
        updateData.endDate ?? destination.endDate,
      );
      if (startDate > endDate) {
        throw new ConflictException(
          'Destination start date must not be after end date',
        );
      }

      const conflictingItineraries = destination.itineraries.filter(
        (itinerary) => {
          const day = this.destinationDate(itinerary.day);
          return day < startDate || day > endDate;
        },
      );
      if (conflictingItineraries.length > 0) {
        throw new ConflictException({
          message: 'Destination dates would exclude existing itineraries',
          conflictingItineraries: conflictingItineraries.map((itinerary) => ({
            id: itinerary.id,
            name: itinerary.name,
            day: this.destinationDate(itinerary.day),
          })),
        });
      }

      const destinations = await destinationsRepo.findBy({
        trip: { id: trip.id },
      });
      this.validateDestinationOverlap(
        { ...destination, startDate, endDate },
        destinations.filter((other) => other.id !== destinationId),
      );

      const tripStart = this.destinationDate(trip.startDate);
      const tripEnd = this.destinationDate(trip.endDate);
      await destinationsRepo.update(destinationId, {
        city: updateData.city ?? destination.city,
        country: updateData.country ?? destination.country,
        startDate: startDate as unknown as Date,
        endDate: endDate as unknown as Date,
      });
      if (startDate < tripStart || endDate > tripEnd) {
        await manager.getRepository(Trips).update(trip.id, {
          startDate: (startDate < tripStart
            ? startDate
            : tripStart) as unknown as Date,
          endDate: (endDate > tripEnd ? endDate : tripEnd) as unknown as Date,
        });
      }
      return destinationsRepo.findOneOrFail({
        where: { id: destinationId },
        relations: ['trip', 'itineraries'],
      });
    });
  }
}
