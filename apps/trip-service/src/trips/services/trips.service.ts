import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TripsRepository } from '../repositories/trips.repository';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';
import { CreateTripDto } from '../dto/create-trip.dto';
import { UpdateTripDto } from '../dto/update-trip.dto';
import { Trips } from '../entities/trips.entity';
import { TripParticipant } from '../entities/trips-participants.entity';
import { Status } from '../enums/status.enum';
import { UploadService } from '../../upload/upload.service';
import { canEditTrip } from '../common/check-user-permission';

export interface UploadImageResult {
  imageUrl: string;
  imagePublicId: string;
}

@Injectable()
export class TripsService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly tripsParticipantsRepository: TripsParticipantsRepository,
    private readonly uploadService: UploadService,
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

  async getTripDetails(tripId: number): Promise<Trips | null> {
    return this.tripsDetailsQuery
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.destinations', 'destination')
      .addSelect('destination.tripId')
      .innerJoinAndSelect('trip.participants', 'participant')
      .where('trip.id = :tripId', { tripId })
      .orderBy('destination.startDate', 'ASC')
      .addOrderBy('destination.id', 'ASC')
      .getOne();
  }

  async deleteTrip(tripId: number, userId: number) {
    if (
      !(await canEditTrip(this.tripsParticipantsRepository, userId, tripId))
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
}
