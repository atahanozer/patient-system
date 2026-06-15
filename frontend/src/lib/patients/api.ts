import { apiClient } from "@/lib/api/client";
import {
  paginatedPatientsSchema,
  patientSchema,
  type PaginatedPatients,
  type Patient,
  type PatientForm,
} from "@/lib/contracts/patient";

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** GET /patients with query params; response validated against the contract. */
export async function listPatients(
  params: ListParams,
): Promise<PaginatedPatients> {
  const res = await apiClient.get("/patients", { params });
  return paginatedPatientsSchema.parse(res.data);
}

/** GET /patients/:id (404 → rejected ApiError from the client interceptor). */
export async function getPatient(id: string): Promise<Patient> {
  const res = await apiClient.get(`/patients/${id}`);
  return patientSchema.parse(res.data);
}

/** POST /patients (admin-only, 201). */
export async function createPatient(body: PatientForm): Promise<Patient> {
  const res = await apiClient.post("/patients", body);
  return patientSchema.parse(res.data);
}

/** PUT /patients/:id (admin-only). */
export async function updatePatient(
  id: string,
  body: Partial<PatientForm>,
): Promise<Patient> {
  const res = await apiClient.put(`/patients/${id}`, body);
  return patientSchema.parse(res.data);
}

/** DELETE /patients/:id (admin-only) → { ok: true }. */
export async function deletePatient(id: string): Promise<{ ok: boolean }> {
  const res = await apiClient.delete(`/patients/${id}`);
  return res.data as { ok: boolean };
}
