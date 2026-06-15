"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

import type { Patient } from "@/lib/contracts/patient";
import { usePatients } from "@/lib/patients/hooks";
import type { ListParams } from "@/lib/patients/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PatientsTable,
  type SortBy,
  type SortOrder,
} from "@/components/patients/patients-table";
import { PatientsToolbar } from "@/components/patients/patients-toolbar";
import { PaginationBar } from "@/components/patients/pagination-bar";
import { TableSkeleton } from "@/components/patients/table-states";

// Code-split the mutation dialogs: they are only needed once a user interacts.
const PatientFormDialog = dynamic(
  () =>
    import("@/components/patients/patient-form-dialog").then(
      (m) => m.PatientFormDialog,
    ),
  { ssr: false },
);
const DeletePatientDialog = dynamic(
  () =>
    import("@/components/patients/delete-patient-dialog").then(
      (m) => m.DeletePatientDialog,
    ),
  { ssr: false },
);

const PAGE_SIZE = 10;
const SORT_FIELDS: SortBy[] = ["lastName", "firstName", "dob"];

function parseSortBy(value: string | null): SortBy {
  return SORT_FIELDS.includes(value as SortBy) ? (value as SortBy) : "lastName";
}

function parseSortOrder(value: string | null): SortOrder {
  return value === "desc" ? "desc" : "asc";
}

function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/**
 * Reads URL-driven params via useSearchParams (must be under <Suspense>) and
 * renders the full list experience: toolbar, table, pagination, and dialogs.
 */
function PatientsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parsePage(searchParams.get("page"));
  const search = searchParams.get("search") ?? "";
  const sortBy = parseSortBy(searchParams.get("sortBy"));
  const sortOrder = parseSortOrder(searchParams.get("sortOrder"));

  const listParams: ListParams = React.useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      sortBy,
      sortOrder,
      ...(search ? { search } : {}),
    }),
    [page, search, sortBy, sortOrder],
  );

  const { data, isLoading, isError, isPlaceholderData, refetch } =
    usePatients(listParams);

  // Write a new query string (shallow replace — no scroll jump, no history spam).
  const updateParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `/patients?${qs}` : "/patients", { scroll: false });
    },
    [router, searchParams],
  );

  const onSearchChange = React.useCallback(
    (value: string) => {
      // Reset to page 1 whenever the query changes.
      updateParams({ search: value || null, page: null });
    },
    [updateParams],
  );

  const onSortChange = React.useCallback(
    (nextBy: SortBy, nextOrder: SortOrder) => {
      updateParams({ sortBy: nextBy, sortOrder: nextOrder, page: null });
    },
    [updateParams],
  );

  const onPageChange = React.useCallback(
    (nextPage: number) => {
      updateParams({ page: nextPage <= 1 ? null : String(nextPage) });
    },
    [updateParams],
  );

  // Dialog state.
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Patient | null>(null);
  const [deleting, setDeleting] = React.useState<Patient | null>(null);

  const openCreate = React.useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);
  const openEdit = React.useCallback((patient: Patient) => {
    setEditing(patient);
    setFormOpen(true);
  }, []);
  const openDelete = React.useCallback((patient: Patient) => {
    setDeleting(patient);
  }, []);

  const patients = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold tracking-tight">Patients</h1>
        {/* Subtle hint that a background refetch (e.g. pagination) is in flight. */}
        {isPlaceholderData ? (
          <span
            className="text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Updating…
          </span>
        ) : null}
      </div>

      <PatientsToolbar
        search={search}
        onSearchChange={onSearchChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        onAdd={openCreate}
      />

      <PatientsTable
        patients={patients}
        isLoading={isLoading}
        isError={isError}
        hasSearch={Boolean(search)}
        onRetry={() => refetch()}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      {!isLoading && !isError && total > 0 ? (
        <PaginationBar
          page={page}
          limit={PAGE_SIZE}
          total={total}
          onPageChange={onPageChange}
        />
      ) : null}

      {formOpen ? (
        <PatientFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          patient={editing}
          listParams={listParams}
        />
      ) : null}

      {deleting ? (
        <DeletePatientDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          patient={deleting}
          listParams={listParams}
        />
      ) : null}
    </div>
  );
}

/** Page-level fallback while the search-params boundary resolves. */
function PatientsFallback() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-8 w-full sm:max-w-xs" />
      <TableSkeleton />
    </div>
  );
}

export default function PatientsPage() {
  return (
    <React.Suspense fallback={<PatientsFallback />}>
      <PatientsView />
    </React.Suspense>
  );
}
