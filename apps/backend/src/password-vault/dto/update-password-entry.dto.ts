import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { toConstantCase } from '@nestwell/shared-types';

export class UpdatePasswordEntryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

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
