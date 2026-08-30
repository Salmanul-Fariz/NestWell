import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LEND_BORROW_TYPES } from '@nestwell/shared-types';
import type { LendBorrowType } from '@nestwell/shared-types';

export class AddEntryDto {
  @IsEnum(LEND_BORROW_TYPES)
  type: LendBorrowType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
