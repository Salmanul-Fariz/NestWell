import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SprintSettingsDto {
  @IsDateString()
  startDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  totalDays: number;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekendDays: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(120, { each: true })
  tasks?: string[];
}

export class ExtendSprintDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days = 15;
}

export class UpdateSprintStartDateDto {
  @IsDateString()
  startDate: string;
}

export class CreateSprintTaskDto {
  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsIn(['todo', 'doing', 'done'])
  status?: 'todo' | 'doing' | 'done';

  @IsOptional()
  @IsIn(['high', 'medium', 'low'])
  priority?: 'high' | 'medium' | 'low';

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(90)
  @IsDateString({}, { each: true })
  dates?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  hours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class BulkDeleteSprintTasksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsMongoId({ each: true })
  ids: string[];
}

export class UpdateSprintTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsIn(['todo', 'doing', 'done'])
  status?: 'todo' | 'doing' | 'done';

  @IsOptional()
  @IsIn(['high', 'medium', 'low'])
  priority?: 'high' | 'medium' | 'low';

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  hours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class UpdateSprintDayLogDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  sleepHours?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  focusHours?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  focusVision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  accomplishments?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  obstacles?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000000000)
  spendingAmount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  spendingNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  followUps?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  tomorrowPriorities?: string[];
}

export class CreateSprintReviewDto {
  @IsIn(['weekly', 'final'])
  type: 'weekly' | 'final';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  week?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  change?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  tests?: string;
}
