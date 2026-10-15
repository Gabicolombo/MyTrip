import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TripInviteEmail {
  to: string;
  tripTitle: string;
  token: string;
  expiresAt: Date;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
      subject: `Invite to participate in ${input.tripTitle}`,
      htmlContent: [
        `<p>You got the invitation to participate in "<strong>${escapeHtml(input.tripTitle)}</strong>" in TripInOrder.</p>`,
        `<p>
            <a href="${acceptUrl.toString()}"
            style="display:inline-block;padding:12px 24px; background:#9333EA;color:#ffffff;text-decoration:none;border-radius:5px;font-family:Arial,sans-serif;font-weight:bold;"
            >To accept click here</a>
         </p>`,
        `<p>Enter or create an account with the same email and confirm your address.</p>`,
        `<p>The invitation is valid until ${input.expiresAt.getUTCDate()}-${input.expiresAt.getUTCMonth() + 1}-${input.expiresAt.getUTCFullYear()} (UTC).</p>`,
        `<p>If you were not expecting this invitation, you can ignore this message.</p>`,
      ].join('\n'),
    });
  }

  private async sendText(message: {
    to: string;
    subject: string;
    htmlContent: string;
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
          htmlContent: message.htmlContent,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Email provider rejected delivery');
    } catch {
      throw new ServiceUnavailableException('Unable to send invitation email');
    }
  }
}
