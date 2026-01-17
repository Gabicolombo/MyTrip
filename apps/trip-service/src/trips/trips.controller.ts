import {
  Controller,
  UseGuards,
  Post,
  Request,
  Body,
  Patch,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
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
    @Body() body: Partial<AddParticipantDto>,
    @CurrentUser() user: { id: number },
  ) {
    if (!body.tripId) {
      throw new NotFoundException('Trip ID is required');
    }
    if (!body.role) {
      throw new ConflictException('Role is required');
    }
    const userExists = await this.tripsService.checkParticipantExists(
      body.tripId,
      user.id,
    );
    if (!userExists) {
      throw new UnauthorizedException("You're not a participant of this trip");
    }

    if (userExists.role === 'VIEWER') {
      throw new UnauthorizedException(
        'User does not have permission to add participants',
      );
    }

    return await this.tripsService.addParticipant(
      body.tripId,
      Number(body.userId),
      body.role,
    );
  }

  @Patch('update-trip/:id')
  async updateTripDetails(
    @Request() req: { params: { id: number } },
    @Body() updateData: UpdateTripDto,
    @CurrentUser() user: { id: number },
  ) {
    const userExist = await this.tripsService.checkParticipantExists(
      req.params.id,
      user.id,
    );
    if (!userExist) {
      throw new NotFoundException('User is not a participant of this trip');
    }

    if (userExist.role === 'VIEWER') {
      throw new UnauthorizedException(
        'User does not have permission to update the trip',
      );
    }

    return await this.tripsService.updateTripDetails(
      String(req.params.id),
      updateData,
    );
  }
}
