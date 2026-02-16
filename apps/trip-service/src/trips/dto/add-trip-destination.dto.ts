import { IsNotEmpty, IsDate } from 'class-validator';

export class AddTripDestinationDto {
  @IsNotEmpty()
  tripId!: number;

  @IsNotEmpty()
  city!: string;

  @IsNotEmpty()
  country!: string;

  @IsNotEmpty()
  @IsDate()
  startDate!: Date;

  @IsNotEmpty()
  @IsDate()
  endDate!: Date;
}
