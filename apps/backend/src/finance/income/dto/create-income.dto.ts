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
import { INCOME_SOURCES } from '@nestwell/shared-types';
import type { IncomeSource } from '@nestwell/shared-types';
import { FinanceRecurrenceDto } from '../../expense/dto/create-expense.dto';

export class CreateIncomeDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(INCOME_SOURCES)
  source: IncomeSource;

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
