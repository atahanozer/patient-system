"use client";

import * as React from "react";
import { PlusIcon, SearchIcon } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { SortBy, SortOrder } from "./patients-table";

/** Encodes a (field, order) pair into a single Select value, and back. */
const SORT_OPTIONS: { value: string; label: string; by: SortBy; order: SortOrder }[] = [
  { value: "lastName:asc", label: "Last name (A–Z)", by: "lastName", order: "asc" },
  { value: "lastName:desc", label: "Last name (Z–A)", by: "lastName", order: "desc" },
  { value: "firstName:asc", label: "First name (A–Z)", by: "firstName", order: "asc" },
  { value: "firstName:desc", label: "First name (Z–A)", by: "firstName", order: "desc" },
  { value: "dob:asc", label: "DOB (oldest)", by: "dob", order: "asc" },
  { value: "dob:desc", label: "DOB (newest)", by: "dob", order: "desc" },
];

const SORT_ITEMS = Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, o.label]));

interface PatientsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
  onAdd: () => void;
}

export function PatientsToolbar({
  search,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  onAdd,
}: PatientsToolbarProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Local input value so typing is responsive; the URL `search` param is only
  // updated after a debounce. Seeded from the prop (URL) for back/forward nav.
  const [value, setValue] = React.useState(search);
  // Keep the local value in sync if the URL search changes externally (e.g.
  // browser back). Derived comparison avoids a setState-in-effect lint hit.
  const [lastSearch, setLastSearch] = React.useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setValue(search);
  }

  const handleChange = (next: string) => {
    setValue(next);
  };

  // Debounce: push the local value to the parent ~300ms after typing stops.
  // onSearchChange is a stable useCallback from the page, so including it is safe.
  React.useEffect(() => {
    const id = setTimeout(() => {
      if (value !== search) onSearchChange(value);
    }, 300);
    return () => clearTimeout(id);
  }, [value, search, onSearchChange]);

  const sortValue = `${sortBy}:${sortOrder}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Label htmlFor="patient-search" className="sr-only">
          Search patients
        </Label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="patient-search"
          type="search"
          placeholder="Search by name, email, phone…"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="patient-sort" className="sr-only">
          Sort patients
        </Label>
        <Select
          items={SORT_ITEMS}
          value={sortValue}
          onValueChange={(next) => {
            const opt = SORT_OPTIONS.find((o) => o.value === next);
            if (opt) onSortChange(opt.by, opt.order);
          }}
        >
          <SelectTrigger id="patient-sort" className="w-[180px]" aria-label="Sort patients">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin ? (
          <Button onClick={onAdd}>
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">Add patient</span>
            <span className="sm:hidden">Add</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
