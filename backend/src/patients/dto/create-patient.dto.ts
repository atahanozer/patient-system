import { IsDateString, IsEmail, IsString, MinLength } from 'class-validator';

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

  @IsString()
  @MinLength(3)
  phoneNumber!: string;

  // Accepts a date-only string (e.g. '1990-01-01') at the boundary; the service
  // converts it to a Date before persisting.
  @IsDateString()
  dob!: string;
}
