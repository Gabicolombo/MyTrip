import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDate,
} from 'class-validator';
import { Activity } from '../enums/activity.enum';
import { Type } from 'class-transformer';

export class ItineraryDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  tripDestinationId!: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
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
