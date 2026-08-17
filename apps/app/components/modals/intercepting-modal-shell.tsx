"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { cn } from "@repo/design-system/lib/utils";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

interface InterceptingModalShellProps {
  readonly children: ReactNode;
  readonly closeDisabled?: boolean;
  readonly onClose?: () => void;
  readonly size?: "narrow" | "default" | "wide";
  readonly title?: string;
}

export const InterceptingModalShell = ({
  children,
  closeDisabled = false,
  onClose,
  title,
  size = "default",
}: InterceptingModalShellProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  const handleOpenChange = (value: boolean) => {
    if (!(value || closeDisabled)) {
      if (onClose) {
        onClose();
        return;
      }
      router.back();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        aria-busy={closeDisabled}
        className={cn(
          "max-h-[92dvh] w-full overflow-y-auto rounded-2xl p-10 duration-150",
          {
            "sm:max-w-[400px]": size === "narrow",
            "sm:max-w-[560px]": size === "default",
            "sm:max-w-[720px]": size === "wide",
          }
        )}
        onEscapeKeyDown={(event) => {
          if (closeDisabled) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (closeDisabled) {
            event.preventDefault();
          }
        }}
        showCloseButton={!closeDisabled}
      >
        {title ? (
          <DialogHeader className="mb-4">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        ) : null}
        {children}
      </DialogContent>
    </Dialog>
  );
};
