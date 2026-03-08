import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Activity } from '../enums/activity.enum';

export class ItineraryDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  tripDestinationId!: string;

  @IsNotEmpty()
  @IsDateString()
  day!: Date;

  @IsNotEmpty()
  @IsString()
  time!: string;

  @IsNotEmpty()
  @IsEnum(Activity)
  activity!: Activity;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsNotEmpty()
  @IsNumber()
  latitude!: number;

  @IsNotEmpty()
  @IsNumber()
  longitude!: number;
}
