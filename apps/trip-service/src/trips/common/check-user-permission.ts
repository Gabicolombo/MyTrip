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
    return false;
  }

  if ((participant.role as Role) === Role.VIEWER) {
    return false;
  }

  return true;
};
