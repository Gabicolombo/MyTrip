import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsDateString,
  Validate,
} from 'class-validator';
import {
  IsDateNotPast,
  IsFutureDate,
  IsEndDateAfterStartDateConstraint,
} from '../common/date';

export class CreateTripDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsDateString()
  @IsDateNotPast({ message: 'Start date must be today or a future date' })
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  @IsFutureDate({ message: 'End date must be in the future' })
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate!: string;

  @IsOptional()
  status?: string = 'Initiated';
}
