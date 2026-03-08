import { NotFoundException } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';

export const checkUserPermission = async (
  tripParticipantModel: TripsParticipantsRepository,
  userId: number,
  tripId: number,
) => {
  // This function should check if the user has the right role to perform certain actions on the trip

  const participant = await tripParticipantModel.findParticipant(
    tripId,
    userId,
  );
  if (!participant) {
    throw new NotFoundException('User is not a participant of this trip');
  }

  if ((participant.role as Role) === Role.VIEWER) {
    return false; // User does not have permission to perform the action
  }

  return true; // User has permission to perform the action
};
