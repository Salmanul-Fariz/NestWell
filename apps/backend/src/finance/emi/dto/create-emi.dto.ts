import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateEmiDto {
  @IsString()
  @IsNotEmpty()
  loanName: string;

  @IsNumber()
  @Min(0)
  principal: number;

  @IsNumber()
  @Min(0)
  interestRate: number;

  @IsNumber()
  @Min(1)
  tenureMonths: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  installmentAmount?: number;
}
