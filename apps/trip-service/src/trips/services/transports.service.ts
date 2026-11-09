import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { canEditTrip, canViewTrip } from '../common/check-user-permission';
import { AddTransportsDto } from '../dto/add-transports.dto';
import { UpdateTransportsDto } from '../dto/update-transports.dto';
import { Transports } from '../entities/transports.entity';
import { TransportsRepository } from '../repositories/transports.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { TripsDestinationsRepository } from '../repositories/tripsDestinations.repository';

@Injectable()
export class TransportsService {
  constructor(
    private readonly transportsRepository: TransportsRepository,
    private readonly tripsParticipantsRepository: TripsParticipantsRepository,
    private readonly tripsDestinationsRepository: TripsDestinationsRepository,
  ) {}

  private async validateDestinationIds(
    fromDestinationId: string,
    toDestinationId: string,
    tripId: number,
  ) {
    if (fromDestinationId === toDestinationId) {
      throw new BadRequestException(
        'From and To destination IDs cannot be the same',
      );
    }
    const destinationIds = [fromDestinationId, toDestinationId];
    const destinations =
      await this.tripsDestinationsRepository.findDestinationByTripId(
        tripId,
        destinationIds,
      );

    if (destinations.length !== 2) {
      throw new BadRequestException(
        'Destinations must exist and belong to this trip',
      );
    }

    return destinations;
  }

  async addTransport(
    tripId: number,
    userId: number,
    addTransportsDto: AddTransportsDto,
  ) {
    if (
      !(await canEditTrip(this.tripsParticipantsRepository, userId, tripId))
    ) {
      throw new ForbiddenException(
        'You do not have permission to edit this trip',
      );
    }
    const { fromDestinationId, toDestinationId, arrivalTime, departureTime } =
      addTransportsDto;
    await this.validateDestinationIds(
      fromDestinationId,
      toDestinationId,
      tripId,
    );
    if (
      new Date(`${addTransportsDto.arrivalDate}T${arrivalTime}`) <=
      new Date(`${addTransportsDto.departureDate}T${departureTime}`)
    ) {
      throw new BadRequestException(
        'Arrival time must be after departure time',
      );
    }
    const transport = this.transportsRepository.create({
      ...addTransportsDto,
      tripId,
    });
    return this.transportsRepository.save(transport);
  }

  async updateTransport(
    id: string,
    userId: number,
    updateTransportDto: UpdateTransportsDto,
    tripId: number,
  ) {
    const transport = await this.transportsRepository.findByIdAndTrip(
      id,
      tripId,
    );
    if (!transport) {
      throw new NotFoundException('Transport not found');
    }
    if (
      !(await canEditTrip(
        this.tripsParticipantsRepository,
        userId,
        transport.tripId,
      ))
    ) {
      throw new ForbiddenException(
        'You do not have permission to edit this trip',
      );
    }
    const { fromDestinationId, toDestinationId, arrivalTime, departureTime } =
      updateTransportDto;
    await this.validateDestinationIds(
      fromDestinationId,
      toDestinationId,
      transport.tripId,
    );
    if (
      new Date(`${updateTransportDto.arrivalDate}T${arrivalTime}`) <=
      new Date(`${updateTransportDto.departureDate}T${departureTime}`)
    ) {
      throw new BadRequestException(
        'Arrival time must be after departure time',
      );
    }
    Object.assign(transport, updateTransportDto);
    // The loaded relations would override the new destination ids on save
    delete (transport as Partial<Transports>).fromDestination;
    delete (transport as Partial<Transports>).toDestination;
    return this.transportsRepository.save(transport);
  }

  async deleteTransport(id: string, userId: number, tripId: number) {
    if (
      !(await canEditTrip(this.tripsParticipantsRepository, userId, tripId))
    ) {
      throw new ForbiddenException(
        'You do not have permission to edit this trip',
      );
    }
    const transport = await this.transportsRepository.findByIdAndTrip(
      id,
      tripId,
    );
    if (!transport) {
      throw new NotFoundException('Transport not found');
    }
    return this.transportsRepository.remove(transport);
  }

  async getAllTransports(tripId: number, userId: number) {
    if (
      !(await canViewTrip(this.tripsParticipantsRepository, userId, tripId))
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this trip',
      );
    }
    return this.transportsRepository.findAllByTrip(tripId);
  }

  async getTransportById(id: string, userId: number, tripId: number) {
    if (
      !(await canViewTrip(this.tripsParticipantsRepository, userId, tripId))
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this trip',
      );
    }
    const transport = await this.transportsRepository.findByIdAndTrip(
      id,
      tripId,
    );
    if (!transport) {
      throw new NotFoundException('Transport not found');
    }
    return transport;
  }
}
