import { IsNotEmpty, IsDateString, Validate } from 'class-validator';
import {
  IsDateNotPast,
  IsFutureDate,
  IsEndDateAfterStartDateConstraint,
} from '../common/date';

export class AddTripDestinationDto {
  @IsNotEmpty()
  tripId!: number;

  @IsNotEmpty()
  city!: string;

  @IsNotEmpty()
  country!: string;

  @IsNotEmpty()
  @IsDateString()
  @IsDateNotPast({
    message: 'Trip destination - Start date must be today or a future date',
  })
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  @IsFutureDate({ message: 'End date must be in the future' })
  @Validate(IsEndDateAfterStartDateConstraint)
  endDate!: string;
}
