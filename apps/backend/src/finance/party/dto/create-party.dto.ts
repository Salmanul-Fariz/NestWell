import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

const trimOrUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export class CreatePartyDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(trimOrUndefined)
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsEmail()
  email?: string;

  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString()
  phone?: string;

  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString()
  notes?: string;
}
