import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { TripsRepository } from './repositories/trips.repository';
import { TripsParticipantsRepository } from './repositories/tripsParticipants.repository';
import { DatabaseModule } from 'y/database/database.module';
import { Trips } from './entities/trips.entity';
import { TripParticipant } from './entities/trips-participants.entity';
import { TripDestination } from './entities/trips-destinations.entity';
import { AuthModule } from 'apps/auth-service/src/auth/auth.module';
import { UsersModule } from 'apps/auth-service/src/users/users.module';
import { TripsDestinationsRepository } from './repositories/tripsDestinations.repository';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Trips, TripParticipant, TripDestination]),
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
    TripsRepository,
    TripsParticipantsRepository,
    TripsDestinationsRepository,
  ],
  controllers: [TripsController],
})
export class TripsModule {}
