import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { isDateString } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TripsRepository } from './repositories/trips.repository';
import { TripsParticipantsRepository } from './repositories/tripsParticipants.repository';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { UpdateTripDestinationDto } from './dto/update-trip-destination.dto';
import { VisaCheckDto } from './dto/visa-check.dto';
import { ItineraryDto } from './dto/add-itinerary.dto';
import { Trips } from './entities/trips.entity';
import { TripParticipant } from './entities/trips-participants.entity';
import { Status } from './enums/status.enum';
import { Role } from './enums/role.enum';
import { AddTripDestinationDto } from './dto/add-trip-destination.dto';
import { TripsDestinationsRepository } from './repositories/tripsDestinations.repository';
import { UploadService } from '../upload/upload.service';
import { VisaRepository } from './repositories/visa.repository';
import { checkUserPermission } from './common/check-user-permission';
import { ItineraryRepository } from './repositories/itinerary.repository';
import { ItineraryUpdateDto } from './dto/update-itinerary.dto';
import { ItineraryEntity } from './entities/itinerary.entity';
import { TripDestination } from './entities/trips-destinations.entity';
import { parseDateAsLocal } from './common/date';
export interface UploadImageResult {
  imageUrl: string;
  imagePublicId: string;
}

type DestinationsDates = {
  startDate: string;
  endDate: string;
};

type TripsWithDates = {
  startDate: string | Date;
  endDate: string | Date;
};

type DestinationPeriod = {
  id?: string;
  city: string;
  country: string;
  startDate: string | Date;
  endDate: string | Date;
};

@Injectable()
export class TripsService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly tripsParticipantsRepository: TripsParticipantsRepository,
    private readonly tripsDestinationsRepository: TripsDestinationsRepository,
    private readonly itineraryRepository: ItineraryRepository,
    private readonly uploadService: UploadService,
    private readonly visaRepository: VisaRepository,
    private readonly dataSource: DataSource,
    @InjectRepository(Trips)
    private readonly tripsDetailsQuery: Repository<Trips>,
  ) {}

  async createTrip(
    userId: number,
    tripData: CreateTripDto,
    file: Express.Multer.File,
  ) {
    const trip = await this.tripsRepository.findByTitle(tripData.title);
    if (trip) {
      throw new ConflictException('Trip with this title already exists');
    }

    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;

    if (file) {
      const uploadResult: UploadImageResult =
        await this.uploadService.uploadTripImage(file);

      imageUrl = uploadResult.imageUrl;
      imagePublicId = uploadResult.imagePublicId;
    }

    // Use transaction to ensure both operations succeed or fail together
    return await this.dataSource.transaction(async (manager) => {
      const tripsRepo = manager.getRepository(Trips);
      const participantsRepo = manager.getRepository(TripParticipant);

      const tripEntity = tripsRepo.create();
      // Save the trip within the transaction
      Object.assign(tripEntity, {
        title: tripData.title,
        description: tripData.description,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        userId,
        status: (tripData.status ?? Status.Initiated) as Status,
        imageUrl,
        imagePublicId,
      });
      // Add the participant within the same transaction
      const newTrip = await tripsRepo.save(tripEntity);

      await participantsRepo.save({
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

  async visaCheck(input: VisaCheckDto) {
    return await this.visaRepository.checkVisaRequirements(input);
  }

  private validateTripDates(
    trip: TripsWithDates,
    destination: DestinationsDates,
  ) {
    const destStart = parseDateAsLocal(destination.startDate);
    const destEnd = parseDateAsLocal(destination.endDate);
    const tripStart = parseDateAsLocal(trip.startDate);
    const tripEnd = parseDateAsLocal(trip.endDate);

    return destStart >= tripStart && destEnd <= tripEnd && destEnd > destStart;
  }

  private differenceInDays(newDate: string, endDate: string): number {
    const newD = parseDateAsLocal(newDate);
    const end = parseDateAsLocal(endDate);
    return (end.getTime() - newD.getTime()) / (1000 * 60 * 60 * 24);
  }

  async updateTrip(
    tripId: string,
    updateData: UpdateTripDto,
    file: Express.Multer.File,
  ): Promise<Trips> {
    const trip = await this.tripsRepository.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    let imageUrl: string | null = null;
    if (file) {
      const uploadResult: UploadImageResult =
        await this.uploadService.uploadTripImage(file);

      imageUrl = uploadResult.imageUrl;
    }

    updateData.imageUrl = imageUrl ?? trip.imageUrl;

    return await this.tripsRepository.update(Number(tripId), updateData);
  }

  // async updateTripDetails(
  //   tripId: string,
  //   updateData: UpdateTripDto,
  //   file: Express.Multer.File,
  // ): Promise<Trips> {
  //   const trip = await this.tripsRepository.findById(tripId);
  //   if (!trip) {
  //     throw new NotFoundException('Trip not found');
  //   }

  //   let imageUrl: string | null = null;
  //   if (file) {
  //     const uploadResult: UploadImageResult =
  //       await this.uploadService.uploadTripImage(file);

  //     imageUrl = uploadResult.imageUrl;
  //   }

  //   updateData.imageUrl = imageUrl ?? trip.imageUrl;

  //   await this.dataSource.transaction(async (manager) => {
  //     const destinationsRepo = manager.getRepository(TripDestination);

  //     const incomingDestinations = updateData.destinations
  //       ?.filter((d) => d.id)
  //       .map((d) => d.id);

  //     await destinationsRepo.delete({
  //       trip: { id: Number(tripId) },
  //       id: Not(In(incomingDestinations!)),
  //     });

  //     if (updateData.destinations) {
  //       for (const destination of updateData.destinations) {
  //         if (destination.id) {
  //           await destinationsRepo.update(
  //             { id: destination.id },
  //             {
  //               city: destination.city,
  //               country: destination.country,
  //               startDate: destination.startDate,
  //               endDate: destination.endDate,
  //             },
  //           );
  //         } else {
  //           await destinationsRepo.save({
  //             trip: { id: Number(tripId) },
  //             city: destination.city,
  //             country: destination.country,
  //             startDate: destination.startDate,
  //             endDate: destination.endDate,
  //           });
  //         }
  //       }
  //       const startDate = updateData.destinations
  //         .map((d) => d.startDate)
  //         .sort()[0];
  //       const endDate = updateData.destinations
  //         .map((d) => d.endDate)
  //         .sort()
  //         .at(-1);
  //       await manager.getRepository(Trips).update(
  //         { id: Number(tripId) },
  //         {
  //           title: updateData.title ?? trip.title,
  //           description: updateData.description ?? trip.description,
  //           startDate: startDate ?? trip.startDate,
  //           endDate: endDate ?? trip.endDate,
  //           imageUrl: updateData.imageUrl ?? trip.imageUrl,
  //         },
  //       );
  //     }
  //   });

  //   return this.tripsRepository.findById(tripId) as Promise<Trips>;
  // }

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
        !(await checkUserPermission(
          this.tripsParticipantsRepository,
          userId,
          trip.id,
        ))
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

  async getTripDetails(userId: number, tripId: number): Promise<Trips | null> {
    return this.tripsDetailsQuery
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.destinations', 'destination')
      .addSelect('destination.tripId')
      .innerJoinAndSelect('trip.participants', 'participant')
      .where('trip.id = :tripId', { tripId })
      .andWhere('participant.userId = :userId', { userId })
      .orderBy('destination.startDate', 'ASC')
      .addOrderBy('destination.id', 'ASC')
      .getOne();
  }

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
      !(await checkUserPermission(
        this.tripsParticipantsRepository,
        userId,
        trip.id,
      ))
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
      !(await checkUserPermission(
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

  async deleteTrip(tripId: number, userId: number) {
    if (
      !(await checkUserPermission(
        this.tripsParticipantsRepository,
        userId,
        tripId,
      ))
    ) {
      throw new UnauthorizedException(
        'User does not have permission to delete itinerary',
      );
    }

    const trip = await this.tripsRepository.findById(String(tripId));
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    try {
      await this.tripsRepository.delete(tripId);
      return true;
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error deleting trip: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async myTrips(userId: number): Promise<Trips[]> {
    return this.tripsRepository.findByUserId(String(userId));
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
      !(await checkUserPermission(
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
        !(await checkUserPermission(
          this.tripsParticipantsRepository,
          userId,
          trip[0],
        ))
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
