import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class EmailVerificationService {
  private readonly tokens = new JwtService();
  private readonly sendCooldown = new Map<number, number>();

  private tokenSecret(): Buffer {
    // Separate signing key: verification links cannot authenticate API requests.
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update('tripinorder:email-verification:v1')
      .digest();
  }

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async send(user: Pick<User, 'id' | 'email'>): Promise<void> {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const from = this.config.get<string>('BREVO_EMAIL_FROM');
    const baseUrl = this.config.get<string>('EMAIL_VERIFICATION_URL');
    if (!apiKey || !from || !baseUrl) {
      throw new ServiceUnavailableException('Email delivery is not configured');
    }
    const sender = from.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
    const senderName = sender?.[1] || 'TripInOrder';
    const senderEmail = sender?.[2] || from;
    const url = new URL(baseUrl);
    const now = Date.now();
    for (const [id, until] of this.sendCooldown) {
      if (until <= now) this.sendCooldown.delete(id);
    }
    if (this.sendCooldown.has(user.id)) return;
    const token = this.tokens.sign(
      { id: user.id, email: user.email, purpose: 'email-verification' },
      {
        secret: this.tokenSecret(),
        algorithm: 'HS256',
        expiresIn: '1h',
        audience: 'tripinorder:email-verification',
      },
    );
    this.sendCooldown.set(user.id, now + 60_000);
    url.searchParams.set('token', token);
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: user.email }],
          subject: 'Confirm your email for TripInOrder',
          textContent: `Confirm your email accessing the following link: ${url.toString()}\nThis link expires in 1 hour.`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        console.error(
          'Brevo recusou o envio:',
          response.status,
          await response.text(),
        );
        throw new Error('Email provider rejected delivery');
      }
    } catch {
      // Keep the cooldown on failures to prevent provider retry abuse.
      throw new ServiceUnavailableException(
        'Unable to send verification email. Try resending in one minute.',
      );
    }
  }

  async verify(token: string) {
    let payload: Record<string, unknown>;
    const secret = this.tokenSecret();
    try {
      payload = this.tokens.verify<Record<string, unknown>>(token, {
        secret,
        algorithms: ['HS256'],
        audience: 'tripinorder:email-verification',
      });
      if (
        payload.purpose !== 'email-verification' ||
        typeof payload.id !== 'number' ||
        !Number.isSafeInteger(payload.id) ||
        payload.id <= 0 ||
        typeof payload.email !== 'string' ||
        !payload.email ||
        typeof payload.exp !== 'number'
      ) {
        throw new Error('Invalid verification claims');
      }
    } catch {
      throw new BadRequestException('Invalid or expired verification link');
    }
    const result = await this.users.update(
      {
        id: payload.id,
        email: payload.email,
        emailVerified: false,
      },
      {
        emailVerified: true,
      },
    );
    if (!result.affected)
      throw new BadRequestException('Invalid or expired verification link');
    return { message: 'Email verified successfully' };
  }

  async resend(email: string) {
    const user = await this.users.findOne({
      where: { email, emailVerified: false },
    });
    if (user) {
      try {
        await this.send(user);
      } catch (error) {
        if (!(error instanceof ServiceUnavailableException)) throw error;
      }
    }
    return {
      message:
        'If the account requires verification, an email will be sent. Please wait one minute before trying again.',
    };
  }
}
