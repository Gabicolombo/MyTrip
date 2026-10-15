import { TripsService } from '../services/trips.service';
import { ParticipantsService } from '../services/participants.service';
import { TripsController } from './trips.controller';

describe('TripsController', () => {
  let controller: TripsController;
  const tripsService = {
    myTrips: jest.fn(),
    deleteTrip: jest.fn(),
  };
  const participantsService = {
    checkParticipantExists: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new TripsController(
      tripsService as unknown as TripsService,
      participantsService as unknown as ParticipantsService,
    );
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
});
