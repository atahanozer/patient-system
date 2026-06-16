import { AlertTriangleIcon, SearchXIcon, UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Shimmering placeholder rows shown while the first page loads. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div data-testid="table-skeleton" className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="hidden h-3 w-24 sm:block" />
          <Skeleton className="size-7 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state — distinguishes "no patients exist yet" from "a search/filter
 * returned nothing", so the call to action is honest.
 */
export function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  const Icon = hasSearch ? SearchXIcon : UsersIcon;
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      {hasSearch ? (
        <>
          <p className="text-sm font-medium">No patients match your search</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try a different name, email, or phone number.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">No patients yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Patients you add will appear here.
          </p>
        </>
      )}
    </div>
  );
}

/** Error state with a retry affordance (drives the chaos 503 recovery path). */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-testid="error-state"
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-16 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangleIcon className="size-6" />
      </div>
      <p className="text-sm font-medium">Couldn&apos;t load patients</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Something went wrong while fetching the list.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
