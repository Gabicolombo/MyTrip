import { NotFoundException } from '@nestjs/common';
import { TripsService } from './trips.service';

describe('Trip read access', () => {
  const userId = 7;
  const tripId = 12;
  let service: TripsService;
  const participants = { findParticipant: jest.fn() };
  const itineraries = { findById: jest.fn() };
  const query = {
    createQueryBuilder: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    addSelect: jest.fn(),
    innerJoinAndSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = Object.assign(
      Object.create(TripsService.prototype) as TripsService,
      {
        tripsParticipantsRepository: participants,
        itineraryRepository: itineraries,
        tripsDetailsQuery: query,
      },
    );
    query.createQueryBuilder.mockReturnValue(query);
    query.leftJoinAndSelect.mockReturnValue(query);
    query.addSelect.mockReturnValue(query);
    query.innerJoinAndSelect.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.andWhere.mockReturnValue(query);
    query.getOne.mockResolvedValue({ id: tripId });
  });

  it('returns trip details only for the requested participant', async () => {
    await expect(service.getTripDetails(userId, tripId)).resolves.toEqual({
      id: tripId,
    });

    expect(query.innerJoinAndSelect).toHaveBeenCalledWith(
      'trip.participants',
      'participant',
    );
    expect(query.where).toHaveBeenCalledWith('trip.id = :tripId', { tripId });
    expect(query.andWhere).toHaveBeenCalledWith(
      'participant.userId = :userId',
      { userId },
    );
    expect(participants.findParticipant).not.toHaveBeenCalled();
  });

  it('returns null when the requested user is not a trip participant', async () => {
    query.getOne.mockResolvedValue(null);

    await expect(service.getTripDetails(userId, tripId)).resolves.toBeNull();
    expect(query.andWhere).toHaveBeenCalledWith(
      'participant.userId = :userId',
      { userId },
    );
  });

  it('returns not found when itinerary details do not exist', async () => {
    itineraries.findById.mockResolvedValue(null);
    await expect(
      service.getItineraryDetails('missing', userId),
    ).rejects.toThrow(NotFoundException);
  });
});
