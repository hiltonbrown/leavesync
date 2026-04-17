"use client";

import {
  Dialog,
  DialogContent,
} from "@repo/design-system/components/ui/dialog";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

interface RouteModalProperties {
  readonly children: ReactNode;
}

const RouteModal = ({ children }: RouteModalProperties) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      router.back();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-h-[92dvh] w-full overflow-y-auto sm:max-w-[640px]">
        {children}
      </DialogContent>
    </Dialog>
  );
};

export { RouteModal };
