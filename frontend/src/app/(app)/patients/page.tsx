"use client";

import * as React from "react";

import { usePatients, type ListParams } from "@/lib/patients";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// NOTE: Phase 2b ships the data layer + a minimal list view. Search/sort/
// pagination controls and the full CRUD UI land in a later phase; this page
// exists so /patients resolves and the query hooks are wired end-to-end.
export default function PatientsPage() {
  const params: ListParams = { page: 1, limit: 10 };
  const { data, isLoading, isError, error } = usePatients(params);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Patients</h1>
        {data ? (
          <span className="text-sm text-muted-foreground">
            {data.total} total
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          Failed to load patients
          {error instanceof Error ? `: ${error.message}` : ""}.
        </div>
      ) : data && data.data.length > 0 ? (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>DOB</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.firstName} {p.lastName}
                  </TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>{p.phoneNumber}</TableCell>
                  <TableCell>{p.dob}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No patients yet.</p>
      )}
    </div>
  );
}
