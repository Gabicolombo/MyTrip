import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const settings = {
    BREVO_API_KEY: 'test-key',
    BREVO_EMAIL_FROM: 'TripInOrder <invites@example.com>',
    TRIP_INVITE_URL: 'https://example.com/convite',
  };
  const invite = {
    to: 'guest@example.com',
    tripTitle: 'Férias',
    token: 'secret+token&value',
    expiresAt: new Date('2026-10-17T12:00:00Z'),
  };

  beforeEach(() => {
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true } as Response);
  });
  afterEach(() => jest.restoreAllMocks());

  it('sends the invitation to the intended recipient with an encoded acceptance token', async () => {
    await new EmailService(new ConfigService(settings)).sendTripInvite(invite);
    const [endpoint, request] = fetchMock.mock.calls[0];
    expect(endpoint).toBe('https://api.brevo.com/v3/smtp/email');
    const body = JSON.parse(request!.body as string);
    expect(body.sender).toEqual({
      name: 'TripInOrder',
      email: 'invites@example.com',
    });
    expect(body.to).toEqual([{ email: invite.to }]);
    expect(body.textContent).toContain(invite.expiresAt.toISOString());
    const link = new URL(body.textContent.match(/https:\/\/\S+/)[0]);
    expect(link.pathname).toBe('/convite');
    expect(link.searchParams.get('token')).toBe(invite.token);
  });

  it.each(['BREVO_API_KEY', 'BREVO_EMAIL_FROM', 'TRIP_INVITE_URL'])(
    'does not send when %s is missing',
    async (key) => {
      await expect(
        new EmailService(
          new ConfigService({ ...settings, [key]: '' }),
        ).sendTripInvite(invite),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid invitation URL before contacting the provider', async () => {
    await expect(
      new EmailService(
        new ConfigService({
          ...settings,
          TRIP_INVITE_URL: 'javascript:alert(1)',
        }),
      ).sendTripInvite(invite),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports provider rejection as a delivery failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 } as Response);
    await expect(
      new EmailService(new ConfigService(settings)).sendTripInvite(invite),
    ).rejects.toThrow('Unable to send invitation email');
  });

  it('reports network failure without exposing provider details', async () => {
    fetchMock.mockRejectedValue(new Error('private provider details'));
    await expect(
      new EmailService(new ConfigService(settings)).sendTripInvite(invite),
    ).rejects.toThrow('Unable to send invitation email');
  });
});
