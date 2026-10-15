import {
  Controller,
  UseGuards,
  Body,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { CurrentUser } from 'apps/auth-service/src/decorator/current-user.decorator';
import { ParticipantsService } from '../services/participants.service';
import type { RoleInvitation } from '../repositories/tripsInvites.repository';

@UseGuards(AuthGuard)
@Controller('trips')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Delete('delete-participant/:tripId/:userId')
  async deleteParticipant(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: { id: number },
  ) {
    return await this.participantsService.deleteParticipant(
      tripId,
      userId,
      currentUser.id,
    );
  }

  @Patch('update-participant-role/:tripId/:userId')
  async updateParticipantRole(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body('newRole') newRole: RoleInvitation,
    @CurrentUser() currentUser: { id: number },
  ) {
    return await this.participantsService.updateParticipantRole(
      tripId,
      userId,
      newRole,
      currentUser.id,
    );
  }
}
