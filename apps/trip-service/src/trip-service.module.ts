import { Module } from '@nestjs/common';
import { TripServiceController } from './trip-service.controller';
import { TripServiceService } from './trip-service.service';
import { DatabaseModule } from 'y/database';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [DatabaseModule, TripsModule],
  controllers: [TripServiceController],
  providers: [TripServiceService],
})
export class TripServiceModule {}
