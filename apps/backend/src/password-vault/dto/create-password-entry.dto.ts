import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { toConstantCase } from '@nestwell/shared-types';

export class CreatePasswordEntryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? toConstantCase(value) || undefined : value,
  )
  @IsOptional()
  @IsString()
  category?: string;
}
