import {
  Controller,
  UseGuards,
  Post,
  Request,
  Body,
  Patch,
  NotFoundException,
  UnauthorizedException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { CurrentUser } from 'apps/auth-service/src/decorator/current-user.decorator';
import { DestinationsService } from '../services/destinations.service';
import { ParticipantsService } from '../services/participants.service';
import { AddTripDestinationDto } from '../dto/add-trip-destination.dto';
import { UpdateTripDestinationDto } from '../dto/update-trip-destination.dto';

@UseGuards(AuthGuard)
@Controller('trips')
export class DestinationsController {
  constructor(
    private readonly destinationsService: DestinationsService,
    private readonly participantsService: ParticipantsService,
  ) {}

  @Post('add-destination')
  async create(
    @Body() tripDestinationDto: AddTripDestinationDto[],
    @Request() req: { user: { id: number } },
  ) {
    const userExist = await this.participantsService.checkParticipantExists(
      tripDestinationDto[0].tripId,
      req.user.id,
    );
    if (!userExist) {
      throw new NotFoundException('User is not a participant of this trip');
    }
    if (userExist.role === 'VIEWER') {
      throw new UnauthorizedException(
        'User does not have permission to update the trip',
      );
    }
    return await this.destinationsService.addDestination(
      tripDestinationDto,
      req.user.id,
    );
  }

  @Patch('update-destination/:destinationId')
  async updateDestination(
    @Param('destinationId', ParseUUIDPipe) destinationId: string,
    @Body() updateData: UpdateTripDestinationDto,
    @CurrentUser() user: { id: number },
  ) {
    return await this.destinationsService.updateDestination(
      destinationId,
      updateData,
      user.id,
    );
  }
}
