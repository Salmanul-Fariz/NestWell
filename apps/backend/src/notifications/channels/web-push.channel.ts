import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushSendResult {
  endpoint: string;
  ok: boolean;
  /** Set when the subscription is gone and should be dropped. */
  expired: boolean;
  error?: string;
}

@Injectable()
export class WebPushChannel {
  private readonly logger = new Logger(WebPushChannel.name);
  private readonly publicKey: string;
  private readonly privateKey: string;

  constructor(private readonly configService: ConfigService) {
    this.publicKey = this.configService.get<string>('WEB_PUSH_VAPID_PUBLIC') ?? '';
    this.privateKey = this.configService.get<string>('WEB_PUSH_VAPID_PRIVATE') ?? '';

    if (this.isConfigured) {
      const subject =
        this.configService.get<string>('WEB_PUSH_CONTACT') || 'mailto:admin@nestwell.local';
      webPush.setVapidDetails(subject, this.publicKey, this.privateKey);
    } else {
      this.logger.warn(
        'WEB_PUSH_VAPID_PUBLIC/PRIVATE are not set — web push notifications are disabled.',
      );
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.publicKey && this.privateKey);
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  async send(target: PushTarget, payload: PushPayload): Promise<PushSendResult> {
    if (!this.isConfigured) {
      return {
        endpoint: target.endpoint,
        ok: false,
        expired: false,
        error: 'VAPID keys are not configured on the server',
      };
    }

    try {
      await webPush.sendNotification(target, JSON.stringify(payload));
      return { endpoint: target.endpoint, ok: true, expired: false };
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      // 404/410 mean the browser dropped the subscription; it will never work again.
      const expired = statusCode === 404 || statusCode === 410;
      const message = (error as Error)?.message ?? 'Unknown web push error';

      if (!expired) {
        this.logger.error(`Push delivery failed (${statusCode ?? 'no status'}): ${message}`);
      }

      return { endpoint: target.endpoint, ok: false, expired, error: message };
    }
  }
}
