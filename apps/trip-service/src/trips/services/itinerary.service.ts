import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TripsRepository } from '../repositories/trips.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { TripsDestinationsRepository } from '../repositories/tripsDestinations.repository';
import { ItineraryRepository } from '../repositories/itinerary.repository';
import type {
  AmountByCurrency,
  AmountByActivity,
} from '../repositories/itinerary.repository';
import { ItineraryDto } from '../dto/add-itinerary.dto';
import { ItineraryUpdateDto } from '../dto/update-itinerary.dto';
import { ItineraryEntity } from '../entities/itinerary.entity';
import { TripDestination } from '../entities/trips-destinations.entity';
import { canEditTrip, canViewTrip } from '../common/check-user-permission';

type ItineraryTotals = {
  totals: AmountByCurrency[];
  byCategory: AmountByActivity[];
};

@Injectable()
export class ItineraryService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly tripsParticipantsRepository: TripsParticipantsRepository,
    private readonly tripsDestinationsRepository: TripsDestinationsRepository,
    private readonly itineraryRepository: ItineraryRepository,
  ) {}

  private normalizeDate(date: Date | string): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private async validateItinerary(
    tripDestination: TripDestination,
    itinerary: ItineraryEntity,
    userId: number,
  ) {
    const trip = tripDestination.trip;

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (
      !(await canEditTrip(this.tripsParticipantsRepository, userId, trip.id))
    ) {
      throw new UnauthorizedException(
        'User does not have permission to manage itinerary',
      );
    }

    const itineraryDay = this.normalizeDate(itinerary.day);
    const tripStart = this.normalizeDate(trip.startDate);
    const tripEnd = this.normalizeDate(trip.endDate);
    const destStart = this.normalizeDate(tripDestination.startDate);
    const destEnd = this.normalizeDate(tripDestination.endDate);

    // we also need to check if the itinerary day is between the trip start and end date
    if (itineraryDay < tripStart || itineraryDay > tripEnd) {
      throw new ConflictException(
        'Itinerary day must be within the trip start and end dates',
      );
    }

    // and also check if the itinerary day is between the destination start and end date
    if (itineraryDay < destStart || itineraryDay > destEnd) {
      throw new ConflictException(
        'Itinerary day must be within the destination start and end dates',
      );
    }

    if (
      (itinerary.amount && !itinerary.currency) ||
      (itinerary.currency && !itinerary.amount)
    ) {
      throw new ConflictException(
        'Amount and currency must be provided together',
      );
    }

    return true;
  }

  async addItinerary(itineraryDto: ItineraryDto, userId: number) {
    const tripDestination = await this.tripsDestinationsRepository.findById(
      String(itineraryDto.tripDestinationId),
    );

    if (!tripDestination) {
      throw new NotFoundException('Trip destination not found');
    }

    const itinerary = {
      day: itineraryDto.day,
      time: itineraryDto.time,
      activity: itineraryDto.activity,
      notes: itineraryDto.notes,
      link: itineraryDto.link,
      latitude: itineraryDto.latitude,
      longitude: itineraryDto.longitude,
      amount: itineraryDto.amount,
      currency: itineraryDto.currency,
    } as ItineraryEntity;

    await this.validateItinerary(tripDestination, itinerary, userId);

    return await this.itineraryRepository.create({
      name: itineraryDto.name,
      tripDestination,
      day: itineraryDto.day,
      time: itineraryDto.time,
      activity: itineraryDto.activity,
      notes: itineraryDto.notes,
      link: itineraryDto.link,
      latitude: itineraryDto.latitude,
      longitude: itineraryDto.longitude,
      amount: itineraryDto.amount,
      currency: itineraryDto.currency,
    });
  }

  async updateItinerary(
    itineraryId: number,
    itineraryUpdateDto: ItineraryUpdateDto,
    userId: number,
  ) {
    const itinerary = await this.itineraryRepository.findById(
      String(itineraryId),
    );

    if (!itinerary) {
      throw new NotFoundException('Itinerary not found');
    }

    const tripDestination = await this.tripsDestinationsRepository.findById(
      String(itinerary.tripDestination.id),
    );

    if (!tripDestination) {
      throw new NotFoundException('Trip destination not found');
    }

    const effectiveItinerary: ItineraryEntity = {
      ...itinerary,
      ...itineraryUpdateDto,
    };

    await this.validateItinerary(tripDestination, effectiveItinerary, userId);

    try {
      const itineraryUpdated = await this.itineraryRepository.update(
        itineraryUpdateDto,
        itinerary.id,
      );

      return itineraryUpdated;
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error updating itinerary: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteItinerary(itineraryId: string, userId: number) {
    const itinerary = await this.itineraryRepository.findById(
      String(itineraryId),
    );
    if (!itinerary) {
      throw new NotFoundException('Itinerary not found');
    }
    // we need to get the user permission for the trip, not for the destination
    if (
      !(await canEditTrip(
        this.tripsParticipantsRepository,
        userId,
        itinerary.tripDestination.trip.id,
      ))
    ) {
      throw new UnauthorizedException(
        'User does not have permission to delete itinerary',
      );
    }
    try {
      await this.itineraryRepository.delete(String(itineraryId));
      return true;
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error deleting itinerary: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getItineraryDetails(
    itineraryId: string,
    userId: number,
  ): Promise<ItineraryEntity> {
    const itinerary = await this.itineraryRepository.findById(
      String(itineraryId),
    );
    if (!itinerary) {
      throw new NotFoundException('Itinerary not found');
    }
    if (
      !(await canViewTrip(
        this.tripsParticipantsRepository,
        userId,
        itinerary.tripDestination.trip.id,
      ))
    ) {
      throw new UnauthorizedException(
        'User does not have permission to delete itinerary',
      );
    }
    return itinerary;
  }

  async getItineraryByTripId(
    userId: number,
    tripId: string,
  ): Promise<ItineraryTotals> {
    try {
      const trip = await this.tripsRepository.findById(tripId);
      if (!trip) {
        throw new NotFoundException('Trip not found');
      }
      if (
        !(await canViewTrip(this.tripsParticipantsRepository, userId, trip.id))
      ) {
        throw new UnauthorizedException(
          'User does not have permission to view itinerary',
        );
      }

      const totals =
        await this.itineraryRepository.totalAmountByCurrency(tripId);

      const byCategory = await this.itineraryRepository.totalByCategory(tripId);

      return {
        totals,
        byCategory,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        `Error fetching itinerary: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async getItinerary(
    userId: number,
    tripDestinationId: string,
  ): Promise<ItineraryEntity[]> {
    try {
      const tripDestination =
        await this.itineraryRepository.getByTripDestinationId(
          tripDestinationId,
        );
      const trip = tripDestination.map((td) => td.tripDestination.trip.id);
      if (
        !(await canViewTrip(this.tripsParticipantsRepository, userId, trip[0]))
      ) {
        throw new UnauthorizedException(
          'User does not have permission to delete itinerary',
        );
      }
      return await this.itineraryRepository.getByTripDestinationId(
        tripDestinationId,
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `Error fetching itinerary: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
