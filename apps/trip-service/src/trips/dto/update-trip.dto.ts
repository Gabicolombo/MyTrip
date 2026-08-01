import { IsOptional, IsString, MaxLength, IsArray } from 'class-validator';
import { UpdateTripDestinationDto } from './update-trip-destination.dto';
import { Transform, Type } from 'class-transformer';

export class UpdateTripDto {
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Transform(({ value }) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsArray()
  @Type(() => UpdateTripDestinationDto)
  destinations?: UpdateTripDestinationDto[];
}
