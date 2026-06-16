import { IsDateString, IsEmail, IsString, Matches, MinLength } from 'class-validator';

// CONTRACT: mirrored by the frontend zod schema in
// frontend/src/lib/contracts/patient.ts (patientFormSchema) — keep field
// names + validation rules in sync. No shared package by design (see TRADEOFFS.md).
export class CreatePatientDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsEmail()
  email!: string;

  // Accepts realistic phone formats incl. seeded faker numbers with extensions
  // (e.g. '(709) 821-1354 x2612', '1-210-735-9247 ext. 202') while rejecting
  // garbage like 'asdad'. Kept in sync with the frontend zod schema (see CONTRACT above).
  @IsString()
  @Matches(/^\+?[\d\s().-]{7,}(?:\s*(?:x|ext\.?)\s*\d+)?$/i, {
    message: 'Enter a valid phone number',
  })
  phoneNumber!: string;

  // Accepts a date-only string (e.g. '1990-01-01') at the boundary; the service
  // converts it to a Date before persisting.
  @IsDateString()
  dob!: string;
}
