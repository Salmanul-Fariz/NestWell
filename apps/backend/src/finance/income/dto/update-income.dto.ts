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
import { INCOME_SOURCES } from '@nestwell/shared-types';
import type { IncomeSource } from '@nestwell/shared-types';
import { FinanceRecurrenceDto } from '../../expense/dto/create-expense.dto';

export class UpdateIncomeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(INCOME_SOURCES)
  source?: IncomeSource;

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
