import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { EVENT_CATEGORIES, EVENT_RECURRENCE_FREQS } from '@nestwell/shared-types';
import type { EventCategory, EventRecurrenceFreq } from '@nestwell/shared-types';

/** Treat empty / null as omitted so optional ISO fields do not fail validation. */
function emptyToUndefined({ value }: { value: unknown }) {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

export class RecurrenceDto {
  @IsEnum(EVENT_RECURRENCE_FREQS)
  freq: EventRecurrenceFreq;

  @IsOptional()
  @IsNumber()
  interval?: number;

  @IsOptional()
  @IsDateString()
  until?: string;
}

export class ReminderDto {
  @IsNumber()
  offsetMinutes: number;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsEnum(EVENT_CATEGORIES)
  category?: EventCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startAt: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReminderDto)
  reminders?: ReminderDto[];
}
