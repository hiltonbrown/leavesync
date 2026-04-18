"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useTransition } from "react";
import {
  exportLeaveReportsCsvAction,
  exportOutOfOfficeCsvAction,
} from "../_actions";

export function ReportActions({
  exportInput,
  reportType,
}: {
  exportInput: Record<string, unknown>;
  reportType: "leave" | "ooo";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result =
              reportType === "leave"
                ? await exportLeaveReportsCsvAction(exportInput)
                : await exportOutOfOfficeCsvAction(exportInput);
            if (!result.ok) {
              return;
            }
            const blob = new Blob([result.value.csvContent], {
              type: "text/csv;charset=utf-8",
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = result.value.filename;
            anchor.click();
            URL.revokeObjectURL(url);
          })
        }
        type="button"
      >
        {isPending ? "Exporting" : "Export CSV"}
      </Button>
      <Button onClick={() => window.print()} type="button" variant="ghost">
        Print
      </Button>
    </div>
  );
}
