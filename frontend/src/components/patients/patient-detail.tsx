"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";

import type { Patient } from "@/lib/contracts/patient";
import type { ListParams } from "@/lib/patients/api";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";

import { PatientAvatar } from "./patient-avatar";
import { formatDate, formatDob } from "./format";

// Editing from the detail view navigates to the dedicated admin-only Edit page
// (/patients/[id]/edit); the list keeps its inline modal. Delete stays a dialog.
const DeletePatientDialog = dynamic(
  () => import("./delete-patient-dialog").then((m) => m.DeletePatientDialog),
  { ssr: false },
);

// The detail page has no list-query context; deletes/updates still invalidate
// the broad ["patients"] key on settle, so any open list refreshes correctly.
const DETAIL_LIST_PARAMS: ListParams = { page: 1, limit: 10 };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function PatientDetail({ patient }: { patient: Patient }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-4" />
        Back to patients
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <PatientAvatar
            firstName={patient.firstName}
            lastName={patient.lastName}
            size="lg"
            className="size-14 text-lg"
          />
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold tracking-tight">{fullName}</h1>
            <p className="text-sm text-muted-foreground">#{patient.id}</p>
          </div>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/patients/${patient.id}/edit`)}
            >
              <PencilIcon className="size-4" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon className="size-4" />
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <dl className="grid gap-6 sm:grid-cols-2">
          <Field label="Email" value={patient.email} />
          <Field label="Phone" value={patient.phoneNumber} />
          <Field label="Date of birth" value={formatDob(patient.dob)} />
          <Field label="Added" value={formatDate(patient.createdAt)} />
        </dl>
      </div>

      {deleteOpen ? (
        <DeletePatientDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          patient={patient}
          listParams={DETAIL_LIST_PARAMS}
          onDeleted={() => router.push("/patients")}
        />
      ) : null}
    </div>
  );
}
