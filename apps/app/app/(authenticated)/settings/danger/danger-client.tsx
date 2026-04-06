"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import { KeyRoundIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "@repo/design-system/components/ui/sonner";
import { revokeAllTokens } from "@/app/actions/settings/revoke-tokens";
import { ConfirmActionDialog } from "../components/confirm-action-dialog";
import { SettingsSectionHeader } from "../components/settings-section-header";

interface DangerClientProps {
  orgName: string;
}

export const DangerClient = ({ orgName }: DangerClientProps) => {
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRevokeTokens = () => {
    setRevokeOpen(false);
    startTransition(async () => {
      const result = await revokeAllTokens();
      if (result.ok) {
        toast.success("All feed tokens revoked");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDeleteOrg = () => {
    setDeleteOpen(false);
    // Organisation deletion requires deeper DB + Clerk teardown — stub for now
    toast.error(
      "Organisation deletion is not yet available. Contact support to delete your organisation."
    );
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="These actions are permanent and cannot be undone. Proceed with caution."
        title="Danger Zone"
      />

      <Alert variant="destructive">
        <TriangleAlertIcon className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Actions on this page are irreversible. Make sure you understand the
          consequences before proceeding.
        </AlertDescription>
      </Alert>

      {/* Revoke tokens card */}
      <div
        className="space-y-3 rounded-2xl p-5"
        style={{
          background: "color-mix(in srgb, var(--destructive) 6%, var(--muted))",
          border:
            "1px solid color-mix(in srgb, var(--destructive) 15%, transparent)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <KeyRoundIcon
              className="h-4 w-4 text-destructive"
              strokeWidth={1.75}
            />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Revoke all feed tokens</p>
            <p className="mt-0.5 text-muted-foreground text-sm">
              Immediately invalidates all calendar feed URLs. Subscribers will
              lose access until new URLs are distributed.
            </p>
          </div>
          <Button
            className="shrink-0"
            disabled={isPending}
            onClick={() => setRevokeOpen(true)}
            size="sm"
            variant="destructive"
          >
            Revoke tokens
          </Button>
        </div>
      </div>

      {/* Delete organisation card */}
      <div
        className="space-y-3 rounded-2xl p-5"
        style={{
          background: "color-mix(in srgb, var(--destructive) 6%, var(--muted))",
          border:
            "1px solid color-mix(in srgb, var(--destructive) 15%, transparent)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <Trash2Icon
              className="h-4 w-4 text-destructive"
              strokeWidth={1.75}
            />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Delete organisation</p>
            <p className="mt-0.5 text-muted-foreground text-sm">
              Permanently delete{" "}
              <span className="font-semibold text-foreground">{orgName}</span>{" "}
              and all associated data — employees, feeds, connections, and
              history. This cannot be undone.
            </p>
          </div>
          <Button
            className="shrink-0"
            disabled={isPending}
            onClick={() => setDeleteOpen(true)}
            size="sm"
            variant="destructive"
          >
            Delete organisation
          </Button>
        </div>
      </div>

      <ConfirmActionDialog
        confirmLabel="Revoke all tokens"
        description="All calendar feed URLs will be immediately invalidated. Anyone subscribed to your feeds will lose access until you distribute new URLs."
        destructive
        onConfirm={handleRevokeTokens}
        onOpenChange={setRevokeOpen}
        open={revokeOpen}
        title="Revoke all feed tokens?"
      />

      <ConfirmActionDialog
        confirmLabel="Permanently delete"
        description={`This will permanently delete ${orgName} and all associated data. There is no recovery. Type the organisation name to confirm.`}
        destructive
        onConfirm={handleDeleteOrg}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        requireTyping={orgName}
        title={`Delete ${orgName}?`}
      />
    </div>
  );
};
