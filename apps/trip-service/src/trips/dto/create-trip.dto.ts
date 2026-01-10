import {
  IsNotEmpty,
  IsString,
  IsDate,
  MaxLength,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

// Custom validator to check if date is today or in the future
function IsDateNotPast(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateNotPast',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!(value instanceof Date)) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const inputDate = new Date(value);
          inputDate.setHours(0, 0, 0, 0);
          return inputDate >= today;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be today or a future date`;
        },
      },
    });
  };
}

// Custom validator to check if date is in the future
function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!(value instanceof Date)) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const inputDate = new Date(value);
          inputDate.setHours(0, 0, 0, 0);
          return inputDate > today;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a future date`;
        },
      },
    });
  };
}

export class CreateTripDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsDate()
  @IsDateNotPast({ message: 'Start date must be today or a future date' })
  @Type(() => Date)
  startDate: Date;

  @IsNotEmpty()
  @IsDate()
  @IsFutureDate({ message: 'End date must be in the future' })
  @Type(() => Date)
  endDate: Date;

  @IsOptional()
  status?: string = 'Initiated';
}
