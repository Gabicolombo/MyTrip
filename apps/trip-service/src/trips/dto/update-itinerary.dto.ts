import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Activity } from '../enums/activity.enum';

export class ItineraryUpdateDto {
  @IsNotEmpty()
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsDateString()
  day?: Date;

  @IsOptional()
  @IsEnum(Activity)
  activity?: Activity;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @ValidateIf((o) => o.name !== undefined)
  @IsNotEmpty()
  @IsNumber()
  latitude?: number;

  @ValidateIf((o) => o.name !== undefined)
  @IsNotEmpty()
  @IsNumber()
  longitude?: number;
}
