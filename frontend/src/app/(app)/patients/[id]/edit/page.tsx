"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, Loader2Icon, UserXIcon } from "lucide-react";

import type { PatientForm as PatientFormValues } from "@/lib/contracts/patient";
import { usePatient, useUpdatePatient } from "@/lib/patients/hooks";
import { isApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { ListParams } from "@/lib/patients/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientForm } from "@/components/patients/patient-form";

// The edit page has no list-query context; the update still invalidates the
// broad ["patients"] key on settle, so any open list refreshes correctly.
const EDIT_LIST_PARAMS: ListParams = { page: 1, limit: 10 };

function EditSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-7 w-40" />
      <div className="space-y-4 rounded-xl border border-border p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
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

export default function PatientEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const detailHref = `/patients/${id}`;

  const { data, isLoading, isError, error } = usePatient(id);
  const updateMutation = useUpdatePatient(EDIT_LIST_PARAMS);

  // Admin guard: non-admins can't use this page even by typing the URL. Redirect
  // to the detail view once auth has resolved. Done in an effect because
  // `router.replace` can't run during render.
  React.useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.replace(detailHref);
    }
  }, [isAuthLoading, isAdmin, router, detailHref]);

  // While auth resolves, or for a non-admin mid-redirect, don't flash the form.
  if (isAuthLoading || !isAdmin) return <EditSkeleton />;

  if (isLoading) return <EditSkeleton />;

  if (isError) {
    if (isApiError(error) && error.status === 404) return <NotFound />;
    return <NotFound />;
  }

  if (!data) return <NotFound />;

  const onSubmit = (values: PatientFormValues) => {
    updateMutation.mutate({ id, body: values }, { onSuccess: () => router.push(detailHref) });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href={detailHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-4" />
        Back to patient
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Edit patient</h1>
        <p className="text-sm text-muted-foreground">
          Update {data.firstName} {data.lastName}&apos;s details.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <PatientForm
          patient={data}
          onSubmit={onSubmit}
          isSubmitting={updateMutation.isPending}
          footer={({ isSubmitting }) => (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" type="button" render={<Link href={detailHref} />}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
