import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsController } from './controllers/trips.controller';
import { DestinationsController } from './controllers/destinations.controller';
import { ItineraryController } from './controllers/itinerary.controller';
import { ParticipantsController } from './controllers/participants.controller';
import { InvitesController } from './controllers/invites.controller';
import { VisaController } from './controllers/visa.controller';
import { TripsService } from './services/trips.service';
import { DestinationsService } from './services/destinations.service';
import { ItineraryService } from './services/itinerary.service';
import { ParticipantsService } from './services/participants.service';
import { InvitesService } from './services/invites.service';
import { VisaService } from './services/visa.service';
import { TripsRepository } from './repositories/trips.repository';
import { TripsParticipantsRepository } from './repositories/tripsParticipants.repository';
import { DatabaseModule } from 'y/database/database.module';
import { Trips } from './entities/trips.entity';
import { TripParticipant } from './entities/trips-participants.entity';
import { TripDestination } from './entities/trips-destinations.entity';
import { VisaCheckEntity } from './entities/visa-check.entity';
import { ItineraryEntity } from './entities/itinerary.entity';
import { AuthModule } from 'apps/auth-service/src/auth/auth.module';
import { UsersModule } from 'apps/auth-service/src/users/users.module';
import { TripsDestinationsRepository } from './repositories/tripsDestinations.repository';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { UploadModule } from '../upload/upload.module';
import { VisaRepository } from './repositories/visa.repository';
import { TripsResolver } from './graphql/trips.resolver';
import { TripsInvitesRepository } from './repositories/tripsInvites.repository';
import { User } from 'apps/auth-service/src/users/entities/user.entity';
import { ItineraryRepository } from './repositories/itinerary.repository';
import { EmailModule } from '../email/email.module';
import { TripsInvites } from './entities/trips-invites.entity';
@Module({
  imports: [
    EmailModule,
    DatabaseModule,
    TypeOrmModule.forFeature([
      Trips,
      TripParticipant,
      TripDestination,
      ItineraryEntity,
      VisaCheckEntity,
      TripsInvites,
      User,
    ]),
    AuthModule,
    UsersModule,
    UploadModule,
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
    }),
  ],
  providers: [
    TripsService,
    DestinationsService,
    ItineraryService,
    ParticipantsService,
    InvitesService,
    VisaService,
    TripsRepository,
    TripsParticipantsRepository,
    TripsDestinationsRepository,
    ItineraryRepository,
    TripsInvitesRepository,
    VisaRepository,
    TripsResolver,
  ],
  controllers: [
    TripsController,
    DestinationsController,
    ItineraryController,
    ParticipantsController,
    InvitesController,
    VisaController,
  ],
})
export class TripsModule {}
