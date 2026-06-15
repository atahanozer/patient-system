"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, UserXIcon } from "lucide-react";

import { usePatient } from "@/lib/patients/hooks";
import type { ApiError } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientDetail } from "@/components/patients/patient-detail";

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as { status: unknown }).status === "number"
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="rounded-xl border border-border p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UserXIcon className="size-6" />
      </div>
      <p className="text-base font-medium">Patient not found</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        This patient may have been deleted or the link is incorrect.
      </p>
      <Link
        href="/patients"
        className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-4" />
        Back to patients
      </Link>
    </div>
  );
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, isLoading, isError, error } = usePatient(id);

  if (isLoading) return <DetailSkeleton />;

  // A 404 from the API → friendly not-found state (vs a generic error).
  if (isError) {
    if (isApiError(error) && error.status === 404) return <NotFound />;
    // Any other error: still surface the not-found affordance with a way back,
    // since there's no detail to show.
    return <NotFound />;
  }

  if (!data) return <NotFound />;

  return <PatientDetail patient={data} />;
}
