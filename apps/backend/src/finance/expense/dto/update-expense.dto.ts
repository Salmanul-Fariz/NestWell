import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EXPENSE_CATEGORIES } from '@nestwell/shared-types';
import type { ExpenseCategory } from '@nestwell/shared-types';
import { FinanceRecurrenceDto } from './create-expense.dto';

export class UpdateExpenseDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(EXPENSE_CATEGORIES)
  category?: ExpenseCategory;

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
