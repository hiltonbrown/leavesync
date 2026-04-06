"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useState } from "react";

interface ConfirmActionDialogProps {
  confirmLabel: string;
  description: string;
  destructive?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /** If set, user must type this exact string before confirming */
  requireTyping?: string;
  title: string;
}

export const ConfirmActionDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  requireTyping,
  destructive = false,
}: ConfirmActionDialogProps) => {
  const [typedValue, setTypedValue] = useState("");
  const canConfirm = requireTyping ? typedValue === requireTyping : true;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTypedValue("");
    }
    onOpenChange(next);
  };

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requireTyping && (
          <div className="space-y-2 py-2">
            <Label className="text-muted-foreground text-sm">
              Type{" "}
              <span className="font-mono font-semibold text-foreground">
                {requireTyping}
              </span>{" "}
              to confirm
            </Label>
            <Input
              autoComplete="off"
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={requireTyping}
              value={typedValue}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              destructive
                ? "bg-destructive text-white hover:bg-destructive/90 disabled:opacity-40"
                : undefined
            }
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
