import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';

describe('TripsController', () => {
  let controller: TripsController;
  const tripsService = {
    myTrips: jest.fn(),
    deleteTrip: jest.fn(),
    addInvite: jest.fn(),
    acceptInvite: jest.fn(),
    deleteParticipant: jest.fn(),
    updateDestination: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new TripsController(tripsService as unknown as TripsService);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards the authenticated user when listing trips', async () => {
    tripsService.myTrips.mockResolvedValue([{ id: 12 }]);

    await expect(controller.getMyTrips({ id: 7 })).resolves.toEqual([
      { id: 12 },
    ]);
    expect(tripsService.myTrips).toHaveBeenCalledWith(7);
  });

  it('converts the trip ID and forwards the user when deleting a trip', async () => {
    tripsService.deleteTrip.mockResolvedValue(true);

    await expect(
      controller.deleteTrip({ params: { id: '12' } }, { id: 7 }),
    ).resolves.toBe(true);
    expect(tripsService.deleteTrip).toHaveBeenCalledWith(12, 7);
  });

  it('forwards the trip, inviter, email, and role when inviting', async () => {
    tripsService.addInvite.mockResolvedValue({ id: 'invite-1' });

    await expect(
      controller.addInvite(
        12,
        { email: 'traveler@example.com', role: 'EDITOR' },
        { id: 7 },
      ),
    ).resolves.toEqual({ id: 'invite-1' });
    expect(tripsService.addInvite).toHaveBeenCalledWith(
      12,
      7,
      'traveler@example.com',
      'EDITOR',
    );
  });

  it('forwards the token and user when accepting an invite', async () => {
    tripsService.acceptInvite.mockResolvedValue({ tripId: 12, role: 'EDITOR' });

    await expect(
      controller.acceptInvite({ token: 'a'.repeat(64) }, { id: 7 }),
    ).resolves.toEqual({ tripId: 12, role: 'EDITOR' });
    expect(tripsService.acceptInvite).toHaveBeenCalledWith('a'.repeat(64), 7);
  });

  it('forwards the trip, target, and current user when deleting a participant', async () => {
    tripsService.deleteParticipant.mockResolvedValue(true);

    await expect(controller.deleteParticipant(12, 8, { id: 7 })).resolves.toBe(
      true,
    );
    expect(tripsService.deleteParticipant).toHaveBeenCalledWith(12, 8, 7);
  });

  describe('updateDestination', () => {
    const destinationId = '123e4567-e89b-12d3-a456-426614174000';
    const updateData = { city: 'Updated Destination city' };
    const user = { id: 7 };

    it('forwards the destination ID, update data, and user', async () => {
      tripsService.updateDestination.mockResolvedValue({ id: destinationId });

      await expect(
        controller.updateDestination(destinationId, updateData, user),
      ).resolves.toEqual({ id: destinationId });
      expect(tripsService.updateDestination).toHaveBeenCalledWith(
        destinationId,
        updateData,
        user.id,
      );
    });

    it('throws an error if the destination does not exist', async () => {
      tripsService.updateDestination.mockRejectedValue(
        new NotFoundException('Trip destination not found'),
      );

      await expect(
        controller.updateDestination(destinationId, updateData, user),
      ).rejects.toThrow(NotFoundException);
    });

    it.each([
      ['extending the stay', { endDate: '2026-08-07' }],
      ['shortening to the activity day', { endDate: '2026-08-04' }],
      [
        'keeping a single day',
        { startDate: '2026-08-04', endDate: '2026-08-04' },
      ],
    ])('returns the saved destination when %s', async (_scenario, dates) => {
      const savedDestination = {
        id: destinationId,
        city: 'Rome',
        startDate: 'startDate' in dates ? dates.startDate : '2026-08-03',
        endDate: dates.endDate,
        itineraries: [{ id: 'itin-1', name: 'Colosseum', day: '2026-08-04' }],
      };
      tripsService.updateDestination.mockResolvedValue(savedDestination);

      await expect(
        controller.updateDestination(destinationId, dates, user),
      ).resolves.toEqual(savedDestination);
      expect(tripsService.updateDestination).toHaveBeenCalledWith(
        destinationId,
        dates,
        user.id,
      );
    });

    it('preserves the conflict response with the affected itineraries', async () => {
      const conflict = new ConflictException({
        message: 'Destination dates would exclude existing itineraries',
        conflictingItineraries: [
          { id: 'itin-1', name: 'Colosseum', day: '2026-08-04' },
        ],
      });
      tripsService.updateDestination.mockRejectedValue(conflict);

      await expect(
        controller.updateDestination(
          destinationId,
          { endDate: '2026-08-03' },
          user,
        ),
      ).rejects.toBe(conflict);
      expect(conflict.getStatus()).toBe(409);
      expect(conflict.getResponse()).toEqual({
        message: 'Destination dates would exclude existing itineraries',
        conflictingItineraries: [
          { id: 'itin-1', name: 'Colosseum', day: '2026-08-04' },
        ],
      });
    });

    it('throws an error if the user is not authorized to update the destination', async () => {
      tripsService.updateDestination.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(
        controller.updateDestination(destinationId, updateData, user),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws an error if the update fails for any other reason', async () => {
      tripsService.updateDestination.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await expect(
        controller.updateDestination(destinationId, updateData, user),
      ).rejects.toThrow('Unexpected error');
    });
  });
});
