import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import { Repository } from 'typeorm';
import { EmailVerificationService } from './email-verification.service';
import { User } from './entities/user.entity';

describe('EmailVerificationService', () => {
  const users = { update: jest.fn(), findOne: jest.fn() };
  const user = { id: 7, email: 'test@example.com' };
  const jwt = new JwtService();
  const secret = createHmac('sha256', 'test-secret')
    .update('tripinorder:email-verification:v1')
    .digest();
  let service: EmailVerificationService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  function sign(payload: Record<string, unknown> = {}) {
    return jwt.sign(
      { ...user, purpose: 'email-verification', ...payload },
      {
        secret,
        algorithm: 'HS256',
        expiresIn: '1h',
        audience: 'tripinorder:email-verification',
      },
    );
  }

  function sentToken(index = 0) {
    const body = JSON.parse(fetchMock.mock.calls[index][1]!.body as string) as {
      text: string;
    };
    return new URL(body.text.match(/https:\/\/\S+/)![0]).searchParams.get(
      'token',
    )!;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-05T12:00:00Z'));
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true } as Response);
    service = new EmailVerificationService(
      users as unknown as Repository<User>,
      new ConfigService({
        JWT_SECRET: 'test-secret',
        RESEND_API_KEY: 'test-key',
        EMAIL_FROM: 'test@example.com',
        EMAIL_VERIFICATION_URL: 'https://example.com/verificar-email',
      }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('emails a signed token with a one-hour expiry without storing token data', async () => {
    await service.send(user);
    const payload = jwt.verify<Record<string, unknown>>(sentToken(), {
      secret,
    });
    expect(payload).toMatchObject({
      ...user,
      purpose: 'email-verification',
      aud: 'tripinorder:email-verification',
    });
    expect((payload.exp as number) - (payload.iat as number)).toBe(3600);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('limits concurrent sends in memory and allows resending after one minute', async () => {
    await Promise.all([service.send(user), service.send(user)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    jest.setSystemTime(new Date('2026-10-05T12:01:00Z'));
    await service.send(user);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps a previous link valid after resending', async () => {
    await service.send(user);
    const oldToken = sentToken();
    jest.setSystemTime(new Date('2026-10-05T12:01:00Z'));
    await service.send(user);
    users.update.mockResolvedValue({ affected: 1 });
    await expect(service.verify(oldToken)).resolves.toEqual({
      message: 'Email verified successfully',
    });
  });

  it('updates only the matching unverified account and rejects reuse', async () => {
    users.update
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });
    const token = sign();
    await expect(service.verify(token)).resolves.toEqual({
      message: 'Email verified successfully',
    });
    expect(users.update).toHaveBeenCalledWith(
      { ...user, emailVerified: false },
      { emailVerified: true },
    );
    await expect(service.verify(token)).rejects.toThrow(BadRequestException);
  });

  it('rejects expired tokens in the backend before accessing the database', async () => {
    const token = sign();
    jest.setSystemTime(new Date('2026-10-05T13:00:00Z'));
    await expect(service.verify(token)).rejects.toThrow(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('rejects modified tokens', async () => {
    const parts = sign().split('.');
    parts[1] = Buffer.from(JSON.stringify({ ...user, id: 99 })).toString(
      'base64url',
    );
    await expect(service.verify(parts.join('.'))).rejects.toThrow(
      BadRequestException,
    );
    expect(users.update).not.toHaveBeenCalled();
  });

  it.each([{ purpose: 'access' }, { id: '7' }, { email: null }])(
    'rejects invalid claims %j',
    async (claims) => {
      await expect(service.verify(sign(claims))).rejects.toThrow(
        BadRequestException,
      );
      expect(users.update).not.toHaveBeenCalled();
    },
  );

  it('rejects tokens without expiration', async () => {
    const token = jwt.sign(
      { ...user, purpose: 'email-verification' },
      { secret, audience: 'tripinorder:email-verification' },
    );
    await expect(service.verify(token)).rejects.toThrow(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('does not interchange verification tokens and access tokens', async () => {
    const accessToken = jwt.sign(user, { secret: 'test-secret' });
    await expect(service.verify(accessToken)).rejects.toThrow(
      BadRequestException,
    );
    await service.send(user);
    expect(() =>
      jwt.verify<object>(sentToken(), { secret: 'test-secret' }),
    ).toThrow();
    expect(users.update).not.toHaveBeenCalled();
  });

  it('rejects tokens for a deleted account or a changed email', async () => {
    users.update.mockResolvedValue({ affected: 0 });
    await expect(service.verify(sign())).rejects.toThrow(BadRequestException);
    expect(users.update).toHaveBeenCalledWith(
      { ...user, emailVerified: false },
      { emailVerified: true },
    );
  });

  it('reports provider failures and preserves the cooldown', async () => {
    fetchMock.mockResolvedValue({ ok: false } as Response);
    await expect(service.send(user)).rejects.toThrow(
      ServiceUnavailableException,
    );
    await service.send(user);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails before delivery when email is not configured', async () => {
    service = new EmailVerificationService(
      users as unknown as Repository<User>,
      new ConfigService({}),
    );
    await expect(service.send(user)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the same resend response for unknown accounts and delivery failures', async () => {
    users.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    const unknown = await service.resend(user.email);
    fetchMock.mockRejectedValue(new Error('network failure'));
    expect(await service.resend(user.email)).toEqual(unknown);
  });
});
