import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from 'apps/auth-service/src/users/entities/user.entity';
import { TripsService } from './trips.service';
import { TripsResolver } from './graphql/trips.resolver';
import { TripsParticipantsRepository } from './repositories/tripsParticipants.repository';

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
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
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
    query.orderBy.mockReturnValue(query);
    query.addOrderBy.mockReturnValue(query);
    query.getOne.mockResolvedValue({ id: tripId });
  });

  it('loads the trip with all of its participants', async () => {
    await expect(service.getTripDetails(tripId)).resolves.toEqual({
      id: tripId,
    });

    expect(query.innerJoinAndSelect).toHaveBeenCalledWith(
      'trip.participants',
      'participant',
    );
    expect(query.where).toHaveBeenCalledWith('trip.id = :tripId', { tripId });
    expect(query.andWhere).not.toHaveBeenCalled();
    expect(query.orderBy).toHaveBeenCalledWith('destination.startDate', 'ASC');
    expect(query.addOrderBy).toHaveBeenCalledWith('destination.id', 'ASC');
  });

  it('returns null when the trip does not exist', async () => {
    query.getOne.mockResolvedValue(null);

    await expect(service.getTripDetails(tripId)).resolves.toBeNull();
  });

  describe('tripDetails query', () => {
    const tripsService = { getTripDetails: jest.fn() };
    const users = { find: jest.fn() };
    const context = { req: { user: { id: userId } } };
    const trip = {
      id: tripId,
      startDate: '2026-08-01',
      endDate: '2026-08-10',
      destinations: [],
      participants: [
        { userId: 3, role: 'OWNER', joinedAt: '2026-07-01' },
        { userId, role: 'VIEWER', joinedAt: '2026-07-02' },
      ],
    };
    let resolver: TripsResolver;

    beforeEach(() => {
      resolver = new TripsResolver(
        tripsService as unknown as TripsService,
        users as unknown as Repository<User>,
        participants as unknown as TripsParticipantsRepository,
      );
      tripsService.getTripDetails.mockResolvedValue(trip);
      users.find.mockResolvedValue([
        { id: 3, name: 'Ana', nationality: 'BR' },
        { id: userId, name: 'Bia', nationality: 'PT' },
      ]);
    });

    it('rejects a user who is not a trip participant', async () => {
      participants.findParticipant.mockResolvedValue(null);

      await expect(resolver.getTripDetails(tripId, context)).rejects.toThrow(
        'User does not have permission to view this trip',
      );
      expect(participants.findParticipant).toHaveBeenCalledWith(tripId, userId);
      expect(users.find).not.toHaveBeenCalled();
    });

    it('shows every participant to a viewer', async () => {
      participants.findParticipant.mockResolvedValue({ role: 'VIEWER' });

      const result = await resolver.getTripDetails(tripId, context);

      expect(result.participants).toEqual([
        expect.objectContaining({ userId: 3, role: 'OWNER' }),
        expect.objectContaining({ userId, role: 'VIEWER' }),
      ]);
      expect(result.participants.map((p) => p.user.name)).toEqual([
        'Ana',
        'Bia',
      ]);
    });

    it('reports a missing trip as not found', async () => {
      tripsService.getTripDetails.mockResolvedValue(null);

      await expect(resolver.getTripDetails(tripId, context)).rejects.toThrow(
        'Trip not found',
      );
    });
  });

  it('returns not found when itinerary details do not exist', async () => {
    itineraries.findById.mockResolvedValue(null);
    await expect(
      service.getItineraryDetails('missing', userId),
    ).rejects.toThrow(NotFoundException);
  });
});
