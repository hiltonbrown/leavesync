"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useRouter } from "next/navigation";

export function DashboardRetryButton() {
  const router = useRouter();

  return (
    <Button onClick={() => router.refresh()} type="button" variant="outline">
      Retry
    </Button>
  );
}
