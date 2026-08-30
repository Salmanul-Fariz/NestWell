import { Type } from 'class-transformer';
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
import { EVENT_RECURRENCE_FREQS } from '@nestwell/shared-types';
import type { EventRecurrenceFreq } from '@nestwell/shared-types';

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
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

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
