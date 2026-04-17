import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
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
  day!: string;

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
