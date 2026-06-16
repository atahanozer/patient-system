"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";

import {
  patientFormSchema,
  toDateInputValue,
  type Patient,
  type PatientForm,
} from "@/lib/contracts/patient";
import { useCreatePatient, useUpdatePatient } from "@/lib/patients/hooks";
import type { ListParams } from "@/lib/patients/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const EMPTY_DEFAULTS: PatientForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  dob: "",
};

function toDefaults(patient: Patient | null | undefined): PatientForm {
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

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this patient; otherwise it creates one. */
  patient?: Patient | null;
  /** The current list params so the optimistic cache update targets the right key. */
  listParams: ListParams;
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  listParams,
}: PatientFormDialogProps) {
  const isEdit = Boolean(patient);
  const createMutation = useCreatePatient(listParams);
  const updateMutation = useUpdatePatient(listParams);

  const form = useForm<PatientForm>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: toDefaults(patient),
  });

  // Re-seed the form whenever the dialog opens or targets a different patient,
  // so edit prefills and create starts empty. Reset in an effect is the
  // RHF-sanctioned way and doesn't trip the set-state-in-effect rule.
  const { reset } = form;
  React.useEffect(() => {
    if (open) reset(toDefaults(patient));
  }, [open, patient, reset]);

  const onSubmit = (values: PatientForm) => {
    if (isEdit && patient) {
      updateMutation.mutate(
        { id: patient.id, body: values },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit patient" : "Add patient"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this patient's details." : "Enter the patient's details to add them."}
          </DialogDescription>
        </DialogHeader>

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
                  <FormControl render={<Input type="date" {...field} />} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : isEdit ? (
                  "Save changes"
                ) : (
                  "Add patient"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default PatientFormDialog;
