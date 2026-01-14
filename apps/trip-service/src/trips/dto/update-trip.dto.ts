import {
  IsOptional,
  IsString,
  IsDate,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
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

// Custom validator to check if endDate is after startDate
@ValidatorConstraint({ name: 'isEndDateAfterStartDate', async: false })
export class IsEndDateAfterStartDateConstraint implements ValidatorConstraintInterface {
  validate(endDate: any, args: ValidationArguments) {
    const object = args.object as { startDate?: Date };
    const startDate = object.startDate;

    if (!startDate || !endDate) return true; // Skip validation if either is missing

    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return end > start;
  }

  defaultMessage() {
    return 'End date must be after start date';
  }
}

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDate()
  @IsDateNotPast({ message: 'Start date must be today or a future date' })
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @IsFutureDate({ message: 'End date must be in the future' })
  @Validate(IsEndDateAfterStartDateConstraint)
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  status?: string;
}
