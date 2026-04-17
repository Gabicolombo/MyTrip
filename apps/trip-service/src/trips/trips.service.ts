import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TripsRepository } from './repositories/trips.repository';
import { TripsParticipantsRepository } from './repositories/tripsParticipants.repository';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
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

export interface UploadImageResult {
  imageUrl: string;
  imagePublicId: string;
}

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

  async updateTripDetails(
    tripId: string,
    updateData: Partial<UpdateTripDto>,
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

  async addDestination(
    tripDestinationDto: AddTripDestinationDto[],
    userId: number,
  ) {
    // we need to check if the trip is valid, and if the user is a participant of the trip
    const trip = await this.tripsRepository.findById(
      String(tripDestinationDto[0].tripId),
    );
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const participantExists =
      await this.tripsParticipantsRepository.findParticipant(
        tripDestinationDto[0].tripId,
        userId,
      );
    if (!participantExists) {
      throw new NotFoundException('User is not a participant of this trip');
    }

    // we need to check also the data of the destination, it needs to be between the trip start and end date
    for (const destination of tripDestinationDto) {
      if (
        destination.startDate < trip.startDate ||
        destination.endDate > trip.endDate
      ) {
        throw new ConflictException(
          'Destination dates must be within the trip start and end dates',
        );
      }
    }

    return await this.tripsDestinationsRepository.addDestination(
      tripDestinationDto,
    );
  }

  async getTripDetails(tripId: number): Promise<Trips | null> {
    return this.tripsDetailsQuery
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.destinations', 'destination')
      .addSelect('destination.tripId')
      .leftJoinAndSelect('trip.participants', 'participant')
      .where('trip.id = :tripId', { tripId })
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
        'User does not have permission to manage itinerary',
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

  async myTrips(userId: number): Promise<Trips[]> {
    return this.tripsRepository.findByUserId(String(userId));
  }

  async getItinerary(tripDestinationId: string): Promise<ItineraryEntity[]> {
    try {
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
