import { IsNotEmpty, IsDateString, Matches } from 'class-validator';
import { IsDateNotPast, IsFutureDate } from '../common/date';

export class AddTripDestinationDto {
  @IsNotEmpty()
  tripId!: number;

  @IsNotEmpty()
  city!: string;

  @IsNotEmpty()
  country!: string;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  @IsDateNotPast({
    message: 'Trip destination - Start date must be today or a future date',
  })
  startDate!: string;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  @IsFutureDate({ message: 'End date must be in the future' })
  endDate!: string;
}
