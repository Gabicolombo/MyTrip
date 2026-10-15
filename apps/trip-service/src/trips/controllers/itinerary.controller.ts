import {
  Controller,
  UseGuards,
  Post,
  Request,
  Body,
  Patch,
  Get,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { CurrentUser } from 'apps/auth-service/src/decorator/current-user.decorator';
import { ItineraryService } from '../services/itinerary.service';
import { ItineraryDto } from '../dto/add-itinerary.dto';
import { ItineraryUpdateDto } from '../dto/update-itinerary.dto';

@UseGuards(AuthGuard)
@Controller('trips')
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Get('itinerary/:tripDestinationId')
  async getItinerary(
    @Request() req: { params: { tripDestinationId: string } },
    @CurrentUser() user: { id: number },
  ) {
    return await this.itineraryService.getItinerary(
      user.id,
      req.params.tripDestinationId,
    );
  }

  @Get('itinerary-by-trip/:tripId')
  async getItineraryByTripId(
    @Request() req: { params: { tripId: string } },
    @CurrentUser() user: { id: number },
  ) {
    return await this.itineraryService.getItineraryByTripId(
      user.id,
      req.params.tripId,
    );
  }

  @Get('itinerary-details/:itineraryId')
  async getItineraryDetails(
    @Request() req: { params: { itineraryId: string } },
    @CurrentUser() user: { id: number },
  ) {
    return await this.itineraryService.getItineraryDetails(
      req.params.itineraryId,
      user.id,
    );
  }

  @Post('add-itinerary')
  async addItinerary(
    @Body() itineraryDto: ItineraryDto,
    @Request() req: { user: { id: number } },
  ) {
    return await this.itineraryService.addItinerary(itineraryDto, req.user.id);
  }

  @Patch('update-itinerary/:id')
  async updateItinerary(
    @Request() req: { params: { id: number } },
    @Body() itineraryUpdateDto: ItineraryUpdateDto,
    @CurrentUser() user: { id: number },
  ) {
    return await this.itineraryService.updateItinerary(
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
    return await this.itineraryService.deleteItinerary(req.params.id, user.id);
  }
}
