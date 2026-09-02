import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NotificationSetting,
  NotificationSettingDocument,
} from './schemas/notification-setting.schema';
import {
  SubscribePushDto,
  UnsubscribePushDto,
  UpdateNotificationSettingsDto,
} from './dto/notification.dto';
import { PushPayload, WebPushChannel } from './channels/web-push.channel';
import { WhatsappChannel } from './channels/whatsapp.channel';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(NotificationSetting.name)
    private readonly settingModel: Model<NotificationSettingDocument>,
    private readonly webPush: WebPushChannel,
    private readonly whatsapp: WhatsappChannel,
  ) {}

  private async getOrCreate(userId: string): Promise<NotificationSettingDocument> {
    const objectId = new Types.ObjectId(userId);
    const existing = await this.settingModel.findOne({ userId: objectId }).exec();
    if (existing) return existing;

    return this.settingModel.create({ userId: objectId });
  }

  async getSettings(userId: string) {
    const setting = await this.getOrCreate(userId);

    return {
      pushEnabled: setting.pushEnabled,
      whatsappEnabled: setting.whatsappEnabled,
      whatsappPhone: setting.whatsappPhone,
      hasWhatsappApiKey: Boolean(setting.whatsappApiKey),
      devices: setting.pushSubscriptions.map((sub) => ({
        endpoint: sub.endpoint,
        label: sub.label,
        createdAt: sub.createdAt,
      })),
      // Capability flags so the UI can explain why a channel is unavailable.
      pushConfigured: this.webPush.isConfigured,
      whatsappConfigured: this.whatsapp.isConfigured || Boolean(setting.whatsappApiKey),
      vapidPublicKey: this.webPush.getPublicKey(),
    };
  }

  async updateSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    const setting = await this.getOrCreate(userId);

    if (dto.pushEnabled !== undefined) setting.pushEnabled = dto.pushEnabled;
    if (dto.whatsappEnabled !== undefined) setting.whatsappEnabled = dto.whatsappEnabled;
    if (dto.whatsappPhone !== undefined) setting.whatsappPhone = dto.whatsappPhone;
    if (dto.whatsappApiKey !== undefined) setting.whatsappApiKey = dto.whatsappApiKey;

    if (setting.whatsappEnabled && !setting.whatsappPhone) {
      throw new BadRequestException(
        'Add a WhatsApp phone number before enabling WhatsApp alerts.',
      );
    }

    await setting.save();
    return this.getSettings(userId);
  }

  async subscribePush(userId: string, dto: SubscribePushDto) {
    const setting = await this.getOrCreate(userId);

    const existing = setting.pushSubscriptions.find((s) => s.endpoint === dto.endpoint);
    if (existing) {
      existing.keys = dto.keys;
      if (dto.label) existing.label = dto.label;
    } else {
      setting.pushSubscriptions.push({
        endpoint: dto.endpoint,
        keys: dto.keys,
        label: dto.label ?? '',
        createdAt: new Date(),
      });
    }

    setting.pushEnabled = true;
    await setting.save();
    return this.getSettings(userId);
  }

  async unsubscribePush(userId: string, dto: UnsubscribePushDto) {
    const setting = await this.getOrCreate(userId);
    setting.pushSubscriptions = setting.pushSubscriptions.filter(
      (s) => s.endpoint !== dto.endpoint,
    );
    if (setting.pushSubscriptions.length === 0) {
      setting.pushEnabled = false;
    }
    await setting.save();
    return this.getSettings(userId);
  }

  /** Sends to every registered device, pruning any the browser has dropped. */
  async sendPush(userId: string, payload: PushPayload) {
    const setting = await this.getOrCreate(userId);

    if (!this.webPush.isConfigured) {
      throw new BadRequestException(
        'Web push is not configured on the server. Set WEB_PUSH_VAPID_PUBLIC and WEB_PUSH_VAPID_PRIVATE.',
      );
    }
    if (setting.pushSubscriptions.length === 0) {
      throw new BadRequestException(
        'No device is subscribed yet. Enable browser notifications first.',
      );
    }

    const results = await Promise.all(
      setting.pushSubscriptions.map((sub) =>
        this.webPush.send({ endpoint: sub.endpoint, keys: sub.keys }, payload),
      ),
    );

    const expired = results.filter((r) => r.expired).map((r) => r.endpoint);
    if (expired.length > 0) {
      setting.pushSubscriptions = setting.pushSubscriptions.filter(
        (s) => !expired.includes(s.endpoint),
      );
      if (setting.pushSubscriptions.length === 0) setting.pushEnabled = false;
      await setting.save();
    }

    const delivered = results.filter((r) => r.ok).length;
    const firstError = results.find((r) => !r.ok && !r.expired)?.error;

    return {
      ok: delivered > 0,
      delivered,
      removedExpired: expired.length,
      total: results.length,
      message:
        delivered > 0
          ? `Sent to ${delivered} of ${results.length} device(s).`
          : firstError ||
            'No device accepted the notification. Re-enable browser notifications and try again.',
    };
  }

  async sendWhatsapp(userId: string, message: string) {
    const setting = await this.getOrCreate(userId);

    if (!setting.whatsappPhone) {
      throw new BadRequestException('Save a WhatsApp phone number first.');
    }

    const result = await this.whatsapp.send(
      setting.whatsappPhone,
      message,
      setting.whatsappApiKey,
    );

    return { ok: result.ok, message: result.detail };
  }
}
