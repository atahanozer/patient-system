"use client";

import { Loader2Icon } from "lucide-react";

import { type Patient, type PatientForm as PatientFormValues } from "@/lib/contracts/patient";
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

import { PatientForm } from "./patient-form";

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

  const onSubmit = (values: PatientFormValues) => {
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

        <PatientForm
          patient={patient}
          onSubmit={onSubmit}
          isSubmitting={isPending}
          // Re-seed when the dialog opens or targets a different patient, so edit
          // prefills and create starts empty.
          resetKey={open}
          footer={({ isSubmitting }) => (
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
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
          )}
        />
      </DialogContent>
    </Dialog>
  );
}

export default PatientFormDialog;
