import { IsOptional, IsString, MaxLength } from 'class-validator';

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
}
