import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * A few token-based tints. Each pairs a soft background with a readable
 * foreground so initials stay legible in both light and dark themes.
 */
const TINTS = [
  "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
  "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
  "bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100",
] as const;

/** Deterministic, stable hash of a string → a non-negative integer. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash);
}

function initials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

interface PatientAvatarProps {
  firstName: string;
  lastName: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}

/**
 * Initials avatar with a deterministic tint derived from the full name, so a
 * given patient always renders the same colour across the list and detail page.
 */
export function PatientAvatar({
  firstName,
  lastName,
  size = "default",
  className,
}: PatientAvatarProps) {
  const tint = TINTS[hashString(`${firstName} ${lastName}`) % TINTS.length];

  return (
    <Avatar size={size} className={className}>
      <AvatarFallback className={cn("font-medium", tint)}>
        {initials(firstName, lastName)}
      </AvatarFallback>
    </Avatar>
  );
}
