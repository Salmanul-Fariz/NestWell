import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const CALLMEBOT_ENDPOINT = 'https://api.callmebot.com/whatsapp.php';

export interface WhatsappSendResult {
  ok: boolean;
  detail: string;
}

@Injectable()
export class WhatsappChannel {
  private readonly logger = new Logger(WhatsappChannel.name);
  private readonly defaultApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultApiKey = this.configService.get<string>('CALLMEBOT_API_KEY') ?? '';
  }

  get isConfigured(): boolean {
    return Boolean(this.defaultApiKey);
  }

  /**
   * CallMeBot answers with plain text/HTML rather than a status code on logical
   * failures, so the body is surfaced to the caller for display.
   */
  async send(phone: string, message: string, apiKey?: string): Promise<WhatsappSendResult> {
    const key = apiKey?.trim() || this.defaultApiKey;

    if (!key) {
      return { ok: false, detail: 'CALLMEBOT_API_KEY is not configured on the server.' };
    }
    if (!phone) {
      return { ok: false, detail: 'No WhatsApp phone number is saved.' };
    }

    // CallMeBot needs the number without the leading '+'.
    const normalizedPhone = phone.trim().replace(/[^\d]/g, '');

    try {
      const res = await axios.get(CALLMEBOT_ENDPOINT, {
        params: { phone: normalizedPhone, text: message, apikey: key },
        timeout: 20_000,
        responseType: 'text',
        // Inspect the body ourselves; CallMeBot explains failures in the response text.
        validateStatus: () => true,
      });

      const plain = String(res.data ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // The response echoes the message back, so drop it before judging success —
      // otherwise a word like "error" in the user's own text would look like a failure.
      const verdictText = plain.split(message).join(' ');

      // CallMeBot signals rejected requests with 203 and an explanatory body,
      // reserving 200 for genuinely queued messages.
      if (res.status !== 200) {
        return {
          ok: false,
          detail:
            verdictText.slice(0, 300) || `CallMeBot returned HTTP ${res.status}.`,
        };
      }

      const queued = /queued|sent|success/i.test(verdictText);
      if (queued) {
        return {
          ok: true,
          detail:
            'CallMeBot queued the message. Delivery is usually quick, but the free tier ' +
            'can batch messages and take a few minutes to arrive.',
        };
      }

      this.logger.warn(`Unexpected CallMeBot response: ${plain.slice(0, 300)}`);
      return {
        ok: false,
        detail:
          verdictText.slice(0, 300) ||
          'CallMeBot returned an empty response. Check that the number is registered with the bot.',
      };
    } catch (error) {
      const detail = (error as Error)?.message ?? 'Unknown CallMeBot error';
      this.logger.error(`WhatsApp delivery failed: ${detail}`);
      return { ok: false, detail };
    }
  }
}
