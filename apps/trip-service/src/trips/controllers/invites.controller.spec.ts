import { InvitesService } from '../services/invites.service';
import { InvitesController } from './invites.controller';

describe('InvitesController', () => {
  let controller: InvitesController;
  const invitesService = {
    addInvite: jest.fn(),
    acceptInvite: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new InvitesController(
      invitesService as unknown as InvitesService,
    );
  });

  it('forwards the trip, inviter, email, and role when inviting', async () => {
    invitesService.addInvite.mockResolvedValue({ id: 'invite-1' });

    await expect(
      controller.addInvite(
        12,
        { email: 'traveler@example.com', role: 'EDITOR' },
        { id: 7 },
      ),
    ).resolves.toEqual({ id: 'invite-1' });
    expect(invitesService.addInvite).toHaveBeenCalledWith(
      12,
      7,
      'traveler@example.com',
      'EDITOR',
    );
  });

  it('forwards the token and user when accepting an invite', async () => {
    invitesService.acceptInvite.mockResolvedValue({
      tripId: 12,
      role: 'EDITOR',
    });

    await expect(
      controller.acceptInvite({ token: 'a'.repeat(64) }, { id: 7 }),
    ).resolves.toEqual({ tripId: 12, role: 'EDITOR' });
    expect(invitesService.acceptInvite).toHaveBeenCalledWith('a'.repeat(64), 7);
  });
});
