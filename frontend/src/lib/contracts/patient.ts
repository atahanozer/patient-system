import { z } from "zod";

// CONTRACT: mirrors backend src/patients/dto/* — keep field names/validation in sync.
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
