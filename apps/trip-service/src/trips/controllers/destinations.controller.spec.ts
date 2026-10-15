import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DestinationsService } from '../services/destinations.service';
import { ParticipantsService } from '../services/participants.service';
import { DestinationsController } from './destinations.controller';

describe('DestinationsController', () => {
  let controller: DestinationsController;
  const destinationsService = {
    updateDestination: jest.fn(),
  };
  const participantsService = {
    checkParticipantExists: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new DestinationsController(
      destinationsService as unknown as DestinationsService,
      participantsService as unknown as ParticipantsService,
    );
  });

  describe('updateDestination', () => {
    const destinationId = '123e4567-e89b-12d3-a456-426614174000';
    const updateData = { city: 'Updated Destination city' };
    const user = { id: 7 };

    it('forwards the destination ID, update data, and user', async () => {
      destinationsService.updateDestination.mockResolvedValue({
        id: destinationId,
      });

      await expect(
        controller.updateDestination(destinationId, updateData, user),
      ).resolves.toEqual({ id: destinationId });
      expect(destinationsService.updateDestination).toHaveBeenCalledWith(
        destinationId,
        updateData,
        user.id,
      );
    });

    it('throws an error if the destination does not exist', async () => {
      destinationsService.updateDestination.mockRejectedValue(
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
      destinationsService.updateDestination.mockResolvedValue(savedDestination);

      await expect(
        controller.updateDestination(destinationId, dates, user),
      ).resolves.toEqual(savedDestination);
      expect(destinationsService.updateDestination).toHaveBeenCalledWith(
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
      destinationsService.updateDestination.mockRejectedValue(conflict);

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
      destinationsService.updateDestination.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(
        controller.updateDestination(destinationId, updateData, user),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws an error if the update fails for any other reason', async () => {
      destinationsService.updateDestination.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await expect(
        controller.updateDestination(destinationId, updateData, user),
      ).rejects.toThrow('Unexpected error');
    });
  });
});
