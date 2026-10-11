import {
  Controller,
  UseGuards,
  Post,
  Request,
  Body,
  Patch,
  NotFoundException,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TripsService } from './trips.service';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { VisaCheckDto } from './dto/visa-check.dto';
import { ItineraryDto } from './dto/add-itinerary.dto';
import { CurrentUser } from 'apps/auth-service/src/decorator/current-user.decorator';
import { AddTripDestinationDto } from './dto/add-trip-destination.dto';
import { ItineraryUpdateDto } from './dto/update-itinerary.dto';
import { UpdateTripDestinationDto } from './dto/update-trip-destination.dto';
import { TripInvitesDto } from './dto/trip-invites.dto';
import { AcceptTripInviteDto } from './dto/accept-trip-invite.dto';

@UseGuards(AuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('my-trips')
  async getMyTrips(@CurrentUser() user: { id: number }) {
    return await this.tripsService.myTrips(user.id);
  }

  @Delete('delete-trip/:id')
  async deleteTrip(
    @Request() req: { params: { id: string } },
    @CurrentUser() user: { id: number },
  ) {
    return await this.tripsService.deleteTrip(Number(req.params.id), user.id);
  }

  @Get('itinerary/:tripDestinationId')
  async getItinerary(
    @Request() req: { params: { tripDestinationId: string } },
    @CurrentUser() user: { id: number },
  ) {
    return await this.tripsService.getItinerary(
      user.id,
      req.params.tripDestinationId,
    );
  }

  @Get('itinerary-by-trip/:tripId')
  async getItineraryByTripId(
    @Request() req: { params: { tripId: string } },
    @CurrentUser() user: { id: number },
  ) {
    return await this.tripsService.getItineraryByTripId(
      user.id,
      req.params.tripId,
    );
  }

  @Get('itinerary-details/:itineraryId')
  async getItineraryDetails(
    @Request() req: { params: { itineraryId: string } },
    @CurrentUser() user: { id: number },
  ) {
    return await this.tripsService.getItineraryDetails(
      req.params.itineraryId,
      user.id,
    );
  }

  @Post('create-trip')
  @UseInterceptors(FileInterceptor('file'))
  async createTrip(
    @Request() req: { user: { id: number } },
    @Body() trip: CreateTripDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.tripsService.createTrip(req.user.id, trip, file);
  }

  @Post('visa-check')
  async checkVisaRequirements(@Body() input: VisaCheckDto) {
    return await this.tripsService.visaCheck(input);
  }

  @Post(':tripId/invites')
  async addInvite(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() body: TripInvitesDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.tripsService.addInvite(tripId, user.id, body.email, body.role);
  }

  @Post('invites/accept')
  @HttpCode(200)
  async acceptInvite(
    @Body() body: AcceptTripInviteDto,
    @CurrentUser() user: { id: number },
  ) {
    return await this.tripsService.acceptInvite(body.token, user.id);
  }

  @Post('add-destination')
  async create(
    @Body() tripDestinationDto: AddTripDestinationDto[],
    @Request() req: { user: { id: number } },
  ) {
    const userExist = await this.tripsService.checkParticipantExists(
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
    return await this.tripsService.addDestination(
      tripDestinationDto,
      req.user.id,
    );
  }

  @Post('add-itinerary')
  async addItinerary(
    @Body() itineraryDto: ItineraryDto,
    @Request() req: { user: { id: number } },
  ) {
    return await this.tripsService.addItinerary(itineraryDto, req.user.id);
  }

  @Patch('update-itinerary/:id')
  async updateItinerary(
    @Request() req: { params: { id: number } },
    @Body() itineraryUpdateDto: ItineraryUpdateDto,
    @CurrentUser() user: { id: number },
  ) {
    return await this.tripsService.updateItinerary(
      req.params.id,
      itineraryUpdateDto,
      user.id,
    );
  }

  @Delete('delete-itinerary/:id')
  async deleteItinerary(
    @Request() req: { params: { id: string } },
    @CurrentUser() user: { id: number },
  ) {
    return await this.tripsService.deleteItinerary(req.params.id, user.id);
  }

  @Delete('delete-participant/:tripId/:userId')
  async deleteParticipant(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: { id: number },
  ) {
    return await this.tripsService.deleteParticipant(
      tripId,
      userId,
      currentUser.id,
    );
  }

  @Patch('update-destination/:destinationId')
  async updateDestination(
    @Param('destinationId', ParseUUIDPipe) destinationId: string,
    @Body() updateData: UpdateTripDestinationDto,
    @CurrentUser() user: { id: number },
  ) {
    return await this.tripsService.updateDestination(
      destinationId,
      updateData,
      user.id,
    );
  }

  @Patch('update-trip/:id')
  @UseInterceptors(FileInterceptor('file'))
  async updateTrip(
    @Request() req: { params: { id: number } },
    @Body() updateData: UpdateTripDto,
    @CurrentUser() user: { id: number },
    @UploadedFile() file: Express.Multer.File,
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
    return await this.tripsService.updateTrip(
      String(req.params.id),
      updateData,
      file,
    );
  }
}
