import { IsOptional, IsNumber, IsString, IsDateString, Min } from 'class-validator';

export class SettleEntryDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
