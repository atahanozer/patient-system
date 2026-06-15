import { z } from "zod";

// CONTRACT: mirrors backend src/patients/dto/{create,update}-patient.dto.ts — keep
// field names + validation in sync. No shared package by design (see docs/TRADEOFFS.md).
// zod v4: top-level z.email() replaces the deprecated z.string().email() method.
export const patientSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  phoneNumber: z.string(),
  dob: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Patient = z.infer<typeof patientSchema>;

export const patientFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Enter a valid email"),
  phoneNumber: z.string().min(3, "Enter a valid phone number"),
  dob: z.string().min(1, "Date of birth is required"),
});
export type PatientForm = z.infer<typeof patientFormSchema>;

export const paginatedPatientsSchema = z.object({
  data: z.array(patientSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});
export type PaginatedPatients = z.infer<typeof paginatedPatientsSchema>;

/**
 * Normalize a wire `dob` (which may be a full ISO string like
 * `1815-12-10T00:00:00.000Z`) to the `yyyy-MM-dd` value an
 * `<input type="date">` requires. Anything already `yyyy-MM-dd` or shorter is
 * returned untouched, so blank/partial values can't be corrupted.
 */
export function toDateInputValue(iso: string): string {
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}
