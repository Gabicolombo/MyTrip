import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TripInviteEmail {
  to: string;
  tripTitle: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  async sendTripInvite(input: TripInviteEmail): Promise<void> {
    const baseUrl = this.config.get<string>('TRIP_INVITE_URL');
    let acceptUrl: URL;
    try {
      acceptUrl = new URL(baseUrl ?? '');
      if (!['http:', 'https:'].includes(acceptUrl.protocol)) {
        throw new Error('Invalid invitation URL protocol');
      }
    } catch {
      throw new ServiceUnavailableException(
        'TRIP_INVITE_URL is not configured correctly',
      );
    }
    // The original token goes in the link; its hash can be stored in the database.
    acceptUrl.searchParams.set('token', input.token);

    await this.sendText({
      to: input.to,
      subject: `Invite to participate in${input.tripTitle}`,
      textContent: [
        `You got the invitation to participate in "${input.tripTitle}" in TripInOrder.`,
        '',
        `To accept, visit: ${acceptUrl.toString()}`,
        'Enter or create an account with the same email and confirm your address.',
        `The invitation is valid until ${input.expiresAt.toISOString()} (UTC).`,
        '',
        'If you were not expecting this invitation, you can ignore this message.',
      ].join('\n'),
    });
  }

  private async sendText(message: {
    to: string;
    subject: string;
    textContent: string;
  }): Promise<void> {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const from = this.config.get<string>('BREVO_EMAIL_FROM');
    if (!apiKey || !from) {
      throw new ServiceUnavailableException('Email delivery is not configured');
    }

    const sender = from.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: {
            name: sender?.[1] || 'TripInOrder',
            email: (sender?.[2] || from).trim(),
          },
          to: [{ email: message.to }],
          subject: message.subject,
          textContent: message.textContent,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Email provider rejected delivery');
    } catch {
      throw new ServiceUnavailableException('Unable to send invitation email');
    }
  }
}
