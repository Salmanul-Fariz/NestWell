import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class PushSubscriptionKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class SubscribePushDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;

  @Transform(trimmed)
  @IsOptional()
  @IsString()
  label?: string;
}

export class UnsubscribePushDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s-()]/g, '') : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^(\+?[1-9]\d{7,14})?$/, {
    message: 'whatsappPhone must be in international format, e.g. +919876543210',
  })
  whatsappPhone?: string;

  @Transform(trimmed)
  @IsOptional()
  @IsString()
  whatsappApiKey?: string;
}
