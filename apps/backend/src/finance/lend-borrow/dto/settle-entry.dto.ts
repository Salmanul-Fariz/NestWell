import { IsOptional, IsNumber, Min } from 'class-validator';

export class SettleEntryDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
