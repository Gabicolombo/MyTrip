import {
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  Validate,
} from 'class-validator';
import { UpdateTripDestinationDto } from './update-trip-destination.dto';
import { Transform } from 'class-transformer';
import {
  IsDateNotPast,
  IsFutureDate,
  IsEndDateAfterStartDateConstraint,
} from '../common/date';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  @IsDateNotPast({ message: 'Start date must be today or a future date' })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @IsFutureDate({ message: 'End date must be in the future' })
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @Transform(({ value }): UpdateTripDestinationDto[] => {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  })
  destinations?: UpdateTripDestinationDto[];
}
