import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

/** Empty string clears the field rather than failing validation. */
const trimOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export class UpdatePartyDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @Transform(trimOrNull)
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEmail()
  email?: string | null;

  @Transform(trimOrNull)
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  phone?: string | null;

  @Transform(trimOrNull)
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  notes?: string | null;
}
