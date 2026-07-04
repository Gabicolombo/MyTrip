import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateTripDestinationDto {
  @IsOptional()
  id!: string;

  @IsString()
  city?: string;

  @IsString()
  country?: string;

  @IsDateString()
  startDate?: string;

  @IsDateString()
  endDate?: string;
}
