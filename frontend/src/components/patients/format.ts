import { format, parseISO } from "date-fns";

/** Format a `yyyy-MM-dd` date-of-birth string as e.g. "Jan 1, 1990". */
export function formatDob(dob: string): string {
  try {
    // DOB is a date-only string; parse without timezone shifting.
    return format(parseISO(dob), "MMM d, yyyy");
  } catch {
    return dob;
  }
}

/** Format an ISO timestamp (e.g. createdAt) as e.g. "Jan 1, 2024". */
export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}
