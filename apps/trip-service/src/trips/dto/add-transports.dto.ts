import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  IsOptional,
  Length,
  IsEnum,
} from 'class-validator';
import { Transports } from '../enums/transports.enum';

export class AddTransportsDto {
  @IsEnum(Transports)
  mode!: Transports;

  @IsUUID()
  fromDestinationId!: string;

  @IsUUID()
  toDestinationId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  departureDate!: string;

  @Matches(/^\d{2}:\d{2}$/)
  departureTime!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  arrivalDate!: string;

  @Matches(/^\d{2}:\d{2}$/)
  arrivalTime!: string;

  @IsString()
  @IsNotEmpty()
  carrier!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
