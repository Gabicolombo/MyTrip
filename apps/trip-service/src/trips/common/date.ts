import {
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export function parseDateAsLocal(value: string | Date): Date {
  if (value instanceof Date) return value;

  const [year, month, day] = value.split('T')[0].split('-').map(Number);
  const d = new Date(year, month - 1, day); // mês é 0-indexed
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function IsDateNotPast(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateNotPast',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return false;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const inputDate = parseDateAsLocal(value);
          return inputDate >= getToday();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be today or a future date`;
        },
      },
    });
  };
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return false;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const inputDate = parseDateAsLocal(value);
          return inputDate > getToday();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a future date`;
        },
      },
    });
  };
}

@ValidatorConstraint({ name: 'isEndDateAfterStartDate', async: false })
export class IsEndDateAfterStartDateConstraint implements ValidatorConstraintInterface {
  validate(endDate: any, args: ValidationArguments) {
    const object = args.object as { startDate?: string | Date };
    const startDate = object.startDate;

    if (!startDate || !endDate) return true;

    const start = parseDateAsLocal(startDate);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const end = parseDateAsLocal(endDate);

    return end > start;
  }

  defaultMessage() {
    return 'End date must be after start date';
  }
}
