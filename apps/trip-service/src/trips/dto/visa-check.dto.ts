import { IsNotEmpty } from 'class-validator';

export class VisaCheckDto {
  @IsNotEmpty()
  passport: string;

  @IsNotEmpty()
  destination: string;
}
