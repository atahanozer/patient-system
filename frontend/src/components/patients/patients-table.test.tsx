import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { Patient } from "@/lib/contracts/patient";
import type { AuthUser } from "@/lib/contracts/auth";

// Mock next/navigation: the table uses useRouter to navigate on row click and
// sortable-header changes. A no-op spy keeps it inert in tests.
const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

// Mock useAuth so each test can flip the role between admin and user.
let mockUser: AuthUser | null = { email: "admin@demo.health", role: "admin" };
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    token: "t",
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

import { PatientsTable } from "./patients-table";

function makePatient(id: string): Patient {
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

const noop = () => {};

const baseProps = {
  sortBy: "lastName" as const,
  sortOrder: "asc" as const,
  onSortChange: noop,
  onEdit: noop,
  onDelete: noop,
};

describe("PatientsTable", () => {
  beforeEach(() => {
    mockUser = { email: "admin@demo.health", role: "admin" };
    pushMock.mockReset();
    replaceMock.mockReset();
  });

  it("(a) shows a loading skeleton while loading", () => {
    render(
      <PatientsTable
        {...baseProps}
        patients={[]}
        isLoading
        isError={false}
        hasSearch={false}
        onRetry={noop}
      />,
    );

    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
    // No data rows render while loading.
    expect(screen.queryByText(/First1/)).not.toBeInTheDocument();
  });

  it("(b) shows an empty state when there are no patients", () => {
    render(
      <PatientsTable
        {...baseProps}
        patients={[]}
        isLoading={false}
        isError={false}
        hasSearch={false}
        onRetry={noop}
      />,
    );

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no patients yet/i)).toBeInTheDocument();
  });

  it("(b2) shows a 'no results' empty state when a search yields nothing", () => {
    render(
      <PatientsTable
        {...baseProps}
        patients={[]}
        isLoading={false}
        isError={false}
        hasSearch
        onRetry={noop}
      />,
    );

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no patients match/i)).toBeInTheDocument();
  });

  it("(c) shows an error state with a retry button that calls onRetry", async () => {
    const onRetry = vi.fn();
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    render(
      <PatientsTable
        {...baseProps}
        patients={[]}
        isLoading={false}
        isError
        hasSearch={false}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /retry/i });
    await user.click(retry);
    expect(onRetry).toHaveBeenCalled();
  });

  it("(d-admin) renders Edit and Delete actions when the role is admin", () => {
    mockUser = { email: "admin@demo.health", role: "admin" };
    render(
      <PatientsTable
        {...baseProps}
        patients={[makePatient("1"), makePatient("2")]}
        isLoading={false}
        isError={false}
        hasSearch={false}
        onRetry={noop}
      />,
    );

    // Rows render (both desktop table + mobile cards exist in jsdom; CSS
    // visibility classes aren't applied, so the name appears in each layout).
    expect(screen.getAllByText("First1 Last1").length).toBeGreaterThan(0);
    // Admin sees edit + delete controls (at least one of each).
    expect(screen.getAllByRole("button", { name: /edit/i }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /delete/i }).length,
    ).toBeGreaterThan(0);
  });

  it("(d-user) does NOT render Edit or Delete actions when the role is user", () => {
    mockUser = { email: "user@demo.health", role: "user" };
    render(
      <PatientsTable
        {...baseProps}
        patients={[makePatient("1"), makePatient("2")]}
        isLoading={false}
        isError={false}
        hasSearch={false}
        onRetry={noop}
      />,
    );

    // Rows still render for a viewer.
    expect(screen.getAllByText("First1 Last1").length).toBeGreaterThan(0);
    // But no mutate controls are present.
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
  });
});
