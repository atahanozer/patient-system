"use client";

import { Loader2Icon } from "lucide-react";

import type { Patient } from "@/lib/contracts/patient";
import { useDeletePatient } from "@/lib/patients/hooks";
import type { ListParams } from "@/lib/patients/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeletePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  listParams: ListParams;
  /** Optional hook for callers (e.g. detail page) to react after deletion. */
  onDeleted?: () => void;
}

export function DeletePatientDialog({
  open,
  onOpenChange,
  patient,
  listParams,
  onDeleted,
}: DeletePatientDialogProps) {
  const deleteMutation = useDeletePatient(listParams);

  const handleConfirm = () => {
    if (!patient) return;
    deleteMutation.mutate(patient.id, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted?.();
      },
    });
  };

  const name = patient ? `${patient.firstName} ${patient.lastName}` : "";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete patient?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <span className="font-medium text-foreground">{name}</span>{" "}
            from the system. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeletePatientDialog;
