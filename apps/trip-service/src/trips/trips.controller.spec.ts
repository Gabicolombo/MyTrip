import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { Role } from './enums/role.enum';

describe('TripsController', () => {
  let controller: TripsController;
  const tripsService = {
    myTrips: jest.fn(),
    deleteTrip: jest.fn(),
    checkParticipantExists: jest.fn(),
    addParticipant: jest.fn(),
    updateTripDetails: jest.fn(),
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

  describe('addParticipant', () => {
    const body = { tripId: 12, userId: 8, role: Role.EDITOR };

    it('requires a trip ID and role', async () => {
      await expect(
        controller.addParticipant({ role: Role.EDITOR }, { id: 7 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.addParticipant({ tripId: 12 }, { id: 7 }),
      ).rejects.toThrow(ConflictException);
      expect(tripsService.checkParticipantExists).not.toHaveBeenCalled();
    });

    it('rejects a nonparticipant', async () => {
      tripsService.checkParticipantExists.mockResolvedValue(null);

      await expect(controller.addParticipant(body, { id: 7 })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tripsService.addParticipant).not.toHaveBeenCalled();
    });

    it('rejects a viewer and allows an editor to add a participant', async () => {
      tripsService.checkParticipantExists.mockResolvedValue({
        role: Role.VIEWER,
      });
      await expect(controller.addParticipant(body, { id: 7 })).rejects.toThrow(
        UnauthorizedException,
      );

      tripsService.checkParticipantExists.mockResolvedValue({
        role: Role.EDITOR,
      });
      tripsService.addParticipant.mockResolvedValue({ userId: 8 });

      // eslint-disable-next-line prettier/prettier
      await expect(
        controller.addParticipant(body, { id: 7 }),
      ).resolves.toEqual({ userId: 8 });
      expect(tripsService.checkParticipantExists).toHaveBeenCalledWith(12, 7);
      expect(tripsService.addParticipant).toHaveBeenCalledWith(
        12,
        8,
        Role.EDITOR,
      );
    });
  });

  describe('updateTripDetails', () => {
    const request = { params: { id: 12 } };
    const update = { title: 'Updated trip' };
    const user = { id: 7 };
    const file = { originalname: 'cover.png' } as Express.Multer.File;

    it('rejects a nonparticipant', async () => {
      tripsService.checkParticipantExists.mockResolvedValue(null);

      await expect(
        controller.updateTripDetails(request, update, user, file),
      ).rejects.toThrow(NotFoundException);
      expect(tripsService.updateTripDetails).not.toHaveBeenCalled();
    });

    it('rejects a viewer', async () => {
      tripsService.checkParticipantExists.mockResolvedValue({
        role: Role.VIEWER,
      });

      await expect(
        controller.updateTripDetails(request, update, user, file),
      ).rejects.toThrow(UnauthorizedException);
      expect(tripsService.updateTripDetails).not.toHaveBeenCalled();
    });

    it('allows an editor and forwards the update', async () => {
      tripsService.checkParticipantExists.mockResolvedValue({
        role: Role.EDITOR,
      });
      tripsService.updateTripDetails.mockResolvedValue({ id: 12 });

      await expect(
        controller.updateTripDetails(request, update, user, file),
      ).resolves.toEqual({ id: 12 });
      expect(tripsService.updateTripDetails).toHaveBeenCalledWith(
        '12',
        update,
        file,
      );
    });
  });
});
