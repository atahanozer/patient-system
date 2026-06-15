import { format, parseISO } from "date-fns";

/**
 * Format an ISO date/datetime string as e.g. "Jan 1, 1990", falling back to the
 * raw input if it can't be parsed. Date-only strings (e.g. a `yyyy-MM-dd` DOB)
 * are parsed without timezone shifting.
 */
function formatIso(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

/** Format a `yyyy-MM-dd` date-of-birth string as e.g. "Jan 1, 1990". */
export function formatDob(dob: string): string {
  return formatIso(dob);
}

/** Format an ISO timestamp (e.g. createdAt) as e.g. "Jan 1, 2024". */
export function formatDate(iso: string): string {
  return formatIso(iso);
}
