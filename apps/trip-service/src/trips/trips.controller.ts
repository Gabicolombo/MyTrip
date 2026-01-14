import {
  Controller,
  UseGuards,
  Post,
  Request,
  Body,
  Patch,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@UseGuards(AuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post('create-trip')
  async createTrip(
    @Request() req: { user: { id: number } },
    @Body() trip: CreateTripDto,
  ) {
    return await this.tripsService.createTrip(req.user.id, trip);
  }

  @Patch('update-trip/:id')
  async updateTripDetails(
    @Request() req: { params: { id: string } },
    @Body() updateData: UpdateTripDto,
  ) {
    return await this.tripsService.updateTripDetails(req.params.id, updateData);
  }
}
