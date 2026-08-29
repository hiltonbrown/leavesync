"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

export function SubscribeUrlField({
  description,
  feedName,
  url,
}: {
  description?: string;
  feedName: string;
  url: string | null;
}) {
  const [copyStatus, setCopyStatus] = useState<"copied" | "error" | "idle">(
    "idle"
  );

  const copy = async () => {
    if (!url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <div className="font-medium text-sm">Subscribe URL</div>
        {description ? (
          <p className="mt-1 text-muted-foreground text-xs">{description}</p>
        ) : null}
      </div>
      {url ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label={`Subscribe URL for ${feedName}`}
            className="min-w-0 font-mono text-xs"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            value={url}
          />
          <Button onClick={copy} type="button" variant="secondary">
            {copyStatus === "copied" ? (
              <CheckIcon className="mr-2 size-4" />
            ) : (
              <CopyIcon className="mr-2 size-4" />
            )}
            {copyStatus === "copied" ? "Copied" : "Copy URL"}
          </Button>
        </div>
      ) : (
        <p className="rounded-xl bg-background p-3 text-muted-foreground text-sm">
          No active subscribe URL
        </p>
      )}
      {copyStatus === "copied" ? (
        <p className="text-sm" role="status">
          Subscribe URL copied.
        </p>
      ) : null}
      {copyStatus === "error" ? (
        <p className="text-destructive text-sm" role="alert">
          Could not copy the URL. Select the URL and copy it manually.
        </p>
      ) : null}
    </div>
  );
}
