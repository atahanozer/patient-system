"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import type { Patient } from "@/lib/contracts/patient";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PatientAvatar } from "./patient-avatar";
import { EmptyState, ErrorState, TableSkeleton } from "./table-states";
import { formatDob } from "./format";

export type SortBy = "lastName" | "firstName" | "dob";
export type SortOrder = "asc" | "desc";

interface PatientsTableProps {
  patients: Patient[];
  isLoading: boolean;
  isError: boolean;
  hasSearch: boolean;
  onRetry: () => void;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
  onEdit: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
}

/** Header cell that toggles the sort field/direction and shows a direction caret. */
function SortableHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSortChange,
  className,
}: {
  label: string;
  field: SortBy;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
  className?: string;
}) {
  const active = sortBy === field;
  const next: SortOrder = active && sortOrder === "asc" ? "desc" : "asc";
  const Icon = !active
    ? ArrowUpDownIcon
    : sortOrder === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSortChange(field, next)}
        aria-label={`Sort by ${label} ${next === "asc" ? "ascending" : "descending"}`}
        className="-mx-1 inline-flex items-center gap-1 rounded px-1 font-medium hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {label}
        <Icon
          className={
            active ? "size-3.5 text-foreground" : "size-3.5 text-muted-foreground"
          }
        />
      </button>
    </TableHead>
  );
}

/** Row-level Edit/Delete controls; rendered only for admins. */
function RowActions({
  patient,
  onEdit,
  onDelete,
}: {
  patient: Patient;
  onEdit: (p: Patient) => void;
  onDelete: (p: Patient) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${patient.firstName} ${patient.lastName}`}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(patient);
        }}
      >
        <PencilIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${patient.firstName} ${patient.lastName}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(patient);
        }}
      >
        <Trash2Icon className="size-4 text-destructive" />
      </Button>
    </div>
  );
}

export function PatientsTable({
  patients,
  isLoading,
  isError,
  hasSearch,
  onRetry,
  sortBy,
  sortOrder,
  onSortChange,
  onEdit,
  onDelete,
}: PatientsTableProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const goToDetail = React.useCallback(
    (id: string) => router.push(`/patients/${id}`),
    [router],
  );

  if (isLoading) return <TableSkeleton />;
  if (isError) return <ErrorState onRetry={onRetry} />;
  if (patients.length === 0) return <EmptyState hasSearch={hasSearch} />;

  return (
    <>
      {/* Desktop: a comfortable table. Hidden below md. */}
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                label="Name"
                field="lastName"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
                className="px-4"
              />
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <SortableHeader
                label="Date of birth"
                field="dob"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
              <TableHead className="w-0 px-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p) => (
              <TableRow
                key={p.id}
                tabIndex={0}
                role="button"
                aria-label={`View ${p.firstName} ${p.lastName}`}
                onClick={() => goToDetail(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToDetail(p.id);
                  }
                }}
                className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <PatientAvatar
                      firstName={p.firstName}
                      lastName={p.lastName}
                    />
                    <span className="font-medium">
                      {p.firstName} {p.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-muted-foreground">
                  {p.email}
                </TableCell>
                <TableCell className="py-3 text-muted-foreground">
                  {p.phoneNumber}
                </TableCell>
                <TableCell className="py-3 text-muted-foreground">
                  {formatDob(p.dob)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  {isAdmin ? (
                    <RowActions
                      patient={p}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards (NOT an overflow-scrolling table). */}
      <ul className="space-y-3 md:hidden">
        {patients.map((p) => (
          <li key={p.id}>
            <div
              role="button"
              tabIndex={0}
              aria-label={`View ${p.firstName} ${p.lastName}`}
              onClick={() => goToDetail(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToDetail(p.id);
                }
              }}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <PatientAvatar firstName={p.firstName} lastName={p.lastName} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate font-medium">
                  {p.firstName} {p.lastName}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {p.email}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {p.phoneNumber} · {formatDob(p.dob)}
                </p>
              </div>
              {isAdmin ? (
                <RowActions patient={p} onEdit={onEdit} onDelete={onDelete} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
