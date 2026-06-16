"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  patientFormSchema,
  toDateInputValue,
  type Patient,
  type PatientForm as PatientFormValues,
} from "@/lib/contracts/patient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Native date-picker bounds, mirroring the zod range check (1900-01-01 .. today).
// Computed once at module load so every render shares the same `max`.
const MIN_DOB = "1900-01-01";
const MAX_DOB = new Date().toISOString().slice(0, 10);

const EMPTY_DEFAULTS: PatientFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  dob: "",
};

function toDefaults(patient: Patient | null | undefined): PatientFormValues {
  if (!patient) return EMPTY_DEFAULTS;
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    email: patient.email,
    phoneNumber: patient.phoneNumber,
    // The wire `dob` may be a full ISO string (e.g. `1815-12-10T00:00:00.000Z`),
    // but `<input type="date">` only renders `yyyy-MM-dd` — otherwise it shows
    // blank. Normalize to the date part so the value survives the edit round-trip.
    dob: toDateInputValue(patient.dob),
  };
}

interface PatientFormProps {
  /** When provided the form prefills with this patient's details (edit). */
  patient?: Patient | null;
  /** Called with validated values when the form is submitted. */
  onSubmit: (values: PatientFormValues) => void;
  /** Disables the footer while a mutation is in flight. */
  isSubmitting?: boolean;
  /**
   * Renders the footer actions (buttons/layout). Each caller — the dialog and
   * the standalone edit page — supplies its own so they can lay actions out and
   * wrap them (e.g. in `DialogFooter`) as needed.
   */
  footer: (state: { isSubmitting: boolean }) => React.ReactNode;
  /** Re-seed signal: when this changes the form resets to the patient's values. */
  resetKey?: unknown;
}

/**
 * Shared patient form body: fields + `useForm` + `zodResolver(patientFormSchema)`
 * + submit wiring. Field errors surface inline via `FormMessage`. The caller owns
 * the footer (Cancel/Save) and any surrounding chrome (dialog vs. page).
 */
export function PatientForm({
  patient,
  onSubmit,
  isSubmitting = false,
  footer,
  resetKey,
}: PatientFormProps) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: toDefaults(patient),
  });

  // Re-seed the form whenever the target patient changes (or the caller signals
  // via `resetKey`, e.g. a dialog opening). Reset in an effect is the
  // RHF-sanctioned way and doesn't trip the set-state-in-effect rule.
  const { reset } = form;
  React.useEffect(() => {
    reset(toDefaults(patient));
  }, [patient, resetKey, reset]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl render={<Input autoComplete="given-name" {...field} />} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl render={<Input autoComplete="family-name" {...field} />} />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl render={<Input type="email" autoComplete="email" {...field} />} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl render={<Input type="tel" autoComplete="tel" {...field} />} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of birth</FormLabel>
              <FormControl render={<Input type="date" min={MIN_DOB} max={MAX_DOB} {...field} />} />
              <FormMessage />
            </FormItem>
          )}
        />

        {footer({ isSubmitting })}
      </form>
    </Form>
  );
}

export default PatientForm;
