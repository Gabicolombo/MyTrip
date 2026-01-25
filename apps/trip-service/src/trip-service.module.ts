import { Module } from '@nestjs/common';
import { TripServiceController } from './trip-service.controller';
import { TripServiceService } from './trip-service.service';
import { DatabaseModule } from 'y/database';
import { TripsModule } from './trips/trips.module';
import { UploadModule } from './upload/upload.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/trip-service/.env',
    }),
    DatabaseModule,
    TripsModule,
    UploadModule,
  ],
  controllers: [TripServiceController],
  providers: [TripServiceService],
})
export class TripServiceModule {}
