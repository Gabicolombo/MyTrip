import { ParticipantsService } from '../services/participants.service';
import { ParticipantsController } from './participants.controller';

describe('ParticipantsController', () => {
  let controller: ParticipantsController;
  const participantsService = {
    deleteParticipant: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new ParticipantsController(
      participantsService as unknown as ParticipantsService,
    );
  });

  it('forwards the trip, target, and current user when deleting a participant', async () => {
    participantsService.deleteParticipant.mockResolvedValue(true);

    await expect(controller.deleteParticipant(12, 8, { id: 7 })).resolves.toBe(
      true,
    );
    expect(participantsService.deleteParticipant).toHaveBeenCalledWith(
      12,
      8,
      7,
    );
  });
});
