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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { CurrentUser } from 'apps/auth-service/src/decorator/current-user.decorator';
import { TripsService } from '../services/trips.service';
import { ParticipantsService } from '../services/participants.service';
import { CreateTripDto } from '../dto/create-trip.dto';
import { UpdateTripDto } from '../dto/update-trip.dto';

@UseGuards(AuthGuard)
@Controller('trips')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly participantsService: ParticipantsService,
  ) {}

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

  @Post('create-trip')
  @UseInterceptors(FileInterceptor('file'))
  async createTrip(
    @Request() req: { user: { id: number } },
    @Body() trip: CreateTripDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.tripsService.createTrip(req.user.id, trip, file);
  }

  @Patch('update-trip/:id')
  @UseInterceptors(FileInterceptor('file'))
  async updateTrip(
    @Request() req: { params: { id: number } },
    @Body() updateData: UpdateTripDto,
    @CurrentUser() user: { id: number },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userExist = await this.participantsService.checkParticipantExists(
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
