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
import { Role } from './enums/role.enum';
import { CurrentUser } from 'apps/auth-service/src/decorator/current-user.decorator';

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

  @Post('add-participant')
  async addParticipant(
    @Body() body: { tripId: string; role: Role; userId: string },
    @CurrentUser() user: { id: number },
  ) {
    if (user.id == null) {
      throw new Error('Unauthorized');
    }
    const userExist = await this.tripsService.checkParticipantExists(
      body.tripId,
      user.id,
    );
    if (!userExist) {
      throw new Error("You're not a participant of this trip");
    }

    if (userExist.role === 'VIEWER') {
      throw new Error('User does not have permission to add participants');
    }

    return await this.tripsService.addParticipant(
      body.tripId,
      Number(body.userId),
      body.role,
    );
  }

  @Patch('update-trip/:id')
  async updateTripDetails(
    @Request() req: { params: { id: string } },
    @Body() updateData: UpdateTripDto,
    @CurrentUser() user: { id: number },
  ) {
    if (user.id == null) {
      throw new Error('Unauthorized');
    }
    const userExist = await this.tripsService.checkParticipantExists(
      req.params.id,
      user.id,
    );
    if (!userExist) {
      throw new Error('User is not a participant of this trip');
    }

    // we need also check the role of the user
    if (userExist.role === 'VIEWER') {
      throw new Error('User does not have permission to update the trip');
    }

    return await this.tripsService.updateTripDetails(req.params.id, updateData);
  }
}
