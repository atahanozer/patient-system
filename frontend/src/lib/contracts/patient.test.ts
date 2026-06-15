import { describe, expect, it } from "vitest";

import { paginatedPatientsSchema, patientSchema } from "./patient";

const sampleValidPayload = {
  data: [
    {
      id: "1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phoneNumber: "+1-555-0100",
      dob: "1815-12-10T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  page: 1,
  limit: 10,
  total: 1,
};

describe("paginatedPatientsSchema", () => {
  it("parses a valid paginated payload", () => {
    const result = paginatedPatientsSchema.parse(sampleValidPayload);
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].email).toBe("ada@example.com");
  });

  it("throws when total is missing", () => {
    const { total, ...withoutTotal } = sampleValidPayload;
    void total;
    expect(() => paginatedPatientsSchema.parse(withoutTotal)).toThrow();
  });

  it("throws when a patient has an invalid email", () => {
    const bad = {
      ...sampleValidPayload,
      data: [{ ...sampleValidPayload.data[0], email: "not-an-email" }],
    };
    expect(() => paginatedPatientsSchema.parse(bad)).toThrow();
  });
});

describe("patientSchema", () => {
  it("parses a single valid patient", () => {
    expect(() => patientSchema.parse(sampleValidPayload.data[0])).not.toThrow();
  });
});
