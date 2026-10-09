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
  tripDestinationId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsDateString()
  day?: string;

  @IsOptional()
  @IsEnum(Activity)
  activity?: Activity;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @ValidateIf((o: ItineraryUpdateDto) => o.name !== undefined)
  @IsNotEmpty()
  @IsNumber()
  latitude?: number;

  @ValidateIf((o: ItineraryUpdateDto) => o.name !== undefined)
  @IsNotEmpty()
  @IsNumber()
  longitude?: number;

  @ValidateIf(
    (o: ItineraryUpdateDto) => o.currency !== undefined && o.currency !== null,
  )
  @IsNotEmpty()
  @IsString()
  amount?: string;

  @ValidateIf(
    (o: ItineraryUpdateDto) => o.amount !== undefined && o.amount !== null,
  )
  @IsNotEmpty()
  @IsString()
  currency?: string;
}
