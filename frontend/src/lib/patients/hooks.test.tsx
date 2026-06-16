import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { PaginatedPatients } from "@/lib/contracts/patient";
import type { ListParams } from "./api";

// Mock the API module so deletePatient can be made to reject.
vi.mock("./api", () => ({
  deletePatient: vi.fn(),
  createPatient: vi.fn(),
  updatePatient: vi.fn(),
  listPatients: vi.fn(),
  getPatient: vi.fn(),
}));

// Mock sonner's toast so we can assert toast.error was called on rollback.
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { createPatient, deletePatient, updatePatient } from "./api";
import { toast } from "sonner";
import { useCreatePatient, useDeletePatient, useUpdatePatient } from "./hooks";

const params: ListParams = { page: 1, limit: 10 };

function makePatient(id: string): PaginatedPatients["data"][number] {
  return {
    id,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    email: `p${id}@demo.health`,
    phoneNumber: "+1 555 000 0000",
    dob: "1990-01-01",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function seedCache(): { qc: QueryClient; seeded: PaginatedPatients } {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const seeded: PaginatedPatients = {
    data: [makePatient("1"), makePatient("2")],
    page: 1,
    limit: 10,
    total: 2,
  };
  qc.setQueryData(["patients", params], seeded);
  return { qc, seeded };
}

describe("useDeletePatient optimistic rollback", () => {
  beforeEach(() => {
    vi.mocked(deletePatient).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it("rolls the cache back to the previous value and toasts on error", async () => {
    const { qc, seeded } = seedCache();
    vi.mocked(deletePatient).mockRejectedValue(new Error("503"));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeletePatient(params), { wrapper });

    // Fire the mutation — it will optimistically remove patient "1", then fail.
    result.current.mutate("1");

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Cache must be restored to exactly the previous value (rollback).
    const restored = qc.getQueryData<PaginatedPatients>(["patients", params]);
    expect(restored).toEqual(seeded);
    expect(restored?.data).toHaveLength(2);
    expect(restored?.total).toBe(2);

    // And the user is told the delete failed.
    expect(toast.error).toHaveBeenCalled();
  });
});

describe("useCreatePatient optimistic rollback", () => {
  beforeEach(() => {
    vi.mocked(createPatient).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it("removes the optimistic temp row and restores the cache on error", async () => {
    const { qc, seeded } = seedCache();
    vi.mocked(createPatient).mockRejectedValue(new Error("503"));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreatePatient(params), { wrapper });

    // Fire the mutation — it optimistically prepends a temp row, then fails.
    result.current.mutate({
      firstName: "New",
      lastName: "Patient",
      email: "new@demo.health",
      phoneNumber: "+1 555 111 2222",
      dob: "2000-05-05",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Cache must be restored to exactly the previous value — temp row gone.
    const restored = qc.getQueryData<PaginatedPatients>(["patients", params]);
    expect(restored).toEqual(seeded);
    expect(restored?.data).toHaveLength(2);
    expect(restored?.total).toBe(2);
    expect(restored?.data.some((p) => p.id.startsWith("optimistic-"))).toBe(false);

    // And the user is told the create failed.
    expect(toast.error).toHaveBeenCalled();
  });
});

describe("useUpdatePatient optimistic rollback", () => {
  beforeEach(() => {
    vi.mocked(updatePatient).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it("reverts the optimistic patch and restores the cache on error", async () => {
    const { qc, seeded } = seedCache();
    vi.mocked(updatePatient).mockRejectedValue(new Error("503"));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdatePatient(params), { wrapper });

    // Fire the mutation — it optimistically patches patient "1", then fails.
    result.current.mutate({ id: "1", body: { firstName: "Changed" } });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Cache must be restored to exactly the previous value — patch reverted.
    const restored = qc.getQueryData<PaginatedPatients>(["patients", params]);
    expect(restored).toEqual(seeded);
    expect(restored?.data.find((p) => p.id === "1")?.firstName).toBe("First1");

    // And the user is told the update failed.
    expect(toast.error).toHaveBeenCalled();
  });
});
