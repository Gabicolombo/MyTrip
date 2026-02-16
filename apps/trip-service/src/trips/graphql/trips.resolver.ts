import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { TripDetailsType } from './types/trip-details.type';
import { TripsService } from '../trips.service';
import { Role } from '../enums/role.enum';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';

@UseGuards(AuthGuard)
@Resolver(() => TripDetailsType)
export class TripsResolver {
  constructor(private readonly tripsService: TripsService) {}

  @Query(() => TripDetailsType, { name: 'tripDetails' })
  async getTripDetails(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<TripDetailsType> {
    const trip = await this.tripsService.getTripDetails(id);

    if (!trip) {
      throw new Error('Trip not found');
    }

    return {
      ...trip,
      startDate: new Date(trip.startDate),
      endDate: new Date(trip.endDate),
      destinations: trip.destinations.map((destination) => ({
        ...destination,
        tripId: trip.id,
        startDate: new Date(destination.startDate),
        endDate: new Date(destination.endDate),
      })),
      participants: trip.participants.map((participant) => ({
        ...participant,
        role: participant.role as Role,
        joinedAt: new Date(participant.joinedAt),
        user: participant.user,
      })),
    };
  }
}
