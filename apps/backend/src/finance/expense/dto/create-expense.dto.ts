import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EXPENSE_CATEGORIES, FINANCE_RECURRENCE_FREQS } from '@nestwell/shared-types';
import type { ExpenseCategory, FinanceRecurrenceFreq } from '@nestwell/shared-types';

export class FinanceRecurrenceDto {
  @IsEnum(FINANCE_RECURRENCE_FREQS)
  frequency: FinanceRecurrenceFreq;

  @IsOptional()
  @IsNumber()
  @Min(1)
  interval?: number;

  @IsDateString()
  nextRunDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateExpenseDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(EXPENSE_CATEGORIES)
  category: ExpenseCategory;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => FinanceRecurrenceDto)
  recurrence?: FinanceRecurrenceDto;
}
