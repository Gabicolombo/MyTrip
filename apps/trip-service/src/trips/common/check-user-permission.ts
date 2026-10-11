import { TripsParticipantsRepository } from '../repositories/tripsParticipants.repository';

export const canViewTrip = async (
  repo: TripsParticipantsRepository,
  userId: number,
  tripId: number,
) => !!(await repo.findParticipant(tripId, userId));

export const canEditTrip = async (
  repo: TripsParticipantsRepository,
  userId: number,
  tripId: number,
) => {
  const participant = await repo.findParticipant(tripId, userId);
  return !!participant && participant.role !== 'VIEWER';
};
