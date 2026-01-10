import { Controller, UseGuards, Post, Request, Body } from '@nestjs/common';
import { TripsService } from './trips.service';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { CreateTripDto } from './dto/create-trip.dto';

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
}
