"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { FetchErrorState } from "../../components/states/fetch-error-state";
import { PermissionDeniedState } from "../../components/states/permission-denied-state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (
    error.name === "PermissionDeniedError" ||
    error.message === "Permission denied"
  ) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <PermissionDeniedState />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <FetchErrorState
        entityName="page"
        retrySlot={
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
        }
      />
    </div>
  );
}
