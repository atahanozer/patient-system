import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Earliest accepted date of birth. Anything before 1900-01-01 (or in the future)
// is almost certainly a typo (e.g. a 4-digit year like 0555).
const MIN_DOB = '1900-01-01';

@ValidatorConstraint({ name: 'isDobInRange', async: false })
export class IsDobInRangeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const min = new Date(`${MIN_DOB}T00:00:00.000Z`);

    // Upper bound = end of "today" in UTC, so a dob of today still passes.
    const now = new Date();
    const todayEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    );

    return date.getTime() >= min.getTime() && date.getTime() <= todayEnd.getTime();
  }

  defaultMessage(): string {
    return 'Date of birth must be between 1900-01-01 and today';
  }
}

/**
 * Validates that an ISO date string falls within [1900-01-01, today]. Pair with
 * `@IsDateString()` for format validation. Mirrored by the frontend zod schema
 * (`patientFormSchema.dob`) in frontend/src/lib/contracts/patient.ts.
 */
export function IsDobInRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDobInRangeConstraint,
    });
  };
}
