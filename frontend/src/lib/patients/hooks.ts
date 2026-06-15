import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  PaginatedPatients,
  Patient,
  PatientForm,
} from "@/lib/contracts/patient";
import {
  createPatient,
  deletePatient,
  getPatient,
  listPatients,
  updatePatient,
  type ListParams,
} from "./api";

const listKey = (params: ListParams) => ["patients", params] as const;

export function usePatients(params: ListParams) {
  return useQuery({
    queryKey: listKey(params),
    queryFn: () => listPatients(params),
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(id),
    enabled: Boolean(id),
  });
}

export function useCreatePatient(params: ListParams) {
  const qc = useQueryClient();
  const key = listKey(params);
  return useMutation({
    mutationFn: (body: PatientForm) => createPatient(body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<PaginatedPatients>(key);
      // Optimistically prepend a temporary row so the list updates instantly.
      const now = new Date().toISOString();
      const optimistic: Patient = {
        id: `optimistic-${now}`,
        ...body,
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<PaginatedPatients>(key, (o) =>
        o
          ? { ...o, data: [optimistic, ...o.data], total: o.total + 1 }
          : o,
      );
      return { prev };
    },
    onError: (_e, _body, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Create failed — restored");
    },
    onSuccess: () => {
      toast.success("Patient created");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient(params: ListParams) {
  const qc = useQueryClient();
  const key = listKey(params);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<PatientForm> }) =>
      updatePatient(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<PaginatedPatients>(key);
      qc.setQueryData<PaginatedPatients>(key, (o) =>
        o
          ? {
              ...o,
              data: o.data.map((p) =>
                p.id === id
                  ? { ...p, ...body, updatedAt: new Date().toISOString() }
                  : p,
              ),
            }
          : o,
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Update failed — restored");
    },
    onSuccess: () => {
      toast.success("Patient updated");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useDeletePatient(params: ListParams) {
  const qc = useQueryClient();
  const key = listKey(params);
  return useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<PaginatedPatients>(key);
      qc.setQueryData<PaginatedPatients>(key, (o) =>
        o
          ? {
              ...o,
              data: o.data.filter((p) => p.id !== id),
              total: o.total - 1,
            }
          : o,
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Delete failed — restored");
    },
    onSuccess: () => {
      toast.success("Patient deleted");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}
