import {
  Controller,
  UseGuards,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { CurrentUser } from 'apps/auth-service/src/decorator/current-user.decorator';
import { InvitesService } from '../services/invites.service';
import { TripInvitesDto } from '../dto/trip-invites.dto';
import { AcceptTripInviteDto } from '../dto/accept-trip-invite.dto';

@UseGuards(AuthGuard)
@Controller('trips')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post(':tripId/invites')
  async addInvite(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() body: TripInvitesDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.invitesService.addInvite(
      tripId,
      user.id,
      body.email,
      body.role,
    );
  }

  @Post('invites/accept')
  @HttpCode(200)
  async acceptInvite(
    @Body() body: AcceptTripInviteDto,
    @CurrentUser() user: { id: number },
  ) {
    return await this.invitesService.acceptInvite(body.token, user.id);
  }
}
