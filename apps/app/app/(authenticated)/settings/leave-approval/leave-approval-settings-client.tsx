"use client";

import type { OrganisationSettings } from "@repo/availability";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@repo/design-system/components/ui/radio-group";
import { toast } from "@repo/design-system/components/ui/sonner";
import { Switch } from "@repo/design-system/components/ui/switch";
import { useState, useTransition } from "react";
import { SettingsSectionHeader } from "../components/settings-section-header";
import {
  restoreLeaveApprovalDefaultsAction,
  updateLeaveApprovalSettingsAction,
} from "./_actions";

interface LeaveApprovalSettingsClientProps {
  organisationId: string;
  settings: OrganisationSettings;
}

export const LeaveApprovalSettingsClient = ({
  organisationId,
  settings,
}: LeaveApprovalSettingsClientProps) => {
  const [state, setState] = useState(settings);
  const [isPending, startTransition] = useTransition();

  const updatePatch = (
    patch: Partial<OrganisationSettings>,
    toastMessage = "Setting updated."
  ) => {
    const previous = state;
    const next = { ...state, ...patch };
    setState(next);

    startTransition(async () => {
      const result = await updateLeaveApprovalSettingsAction({
        organisationId,
        patch,
      });
      if (!result.ok) {
        setState(previous);
        toast.error(result.error.message);
        return;
      }
      toast.success(toastMessage);
    });
  };

  const restoreDefaults = () => {
    startTransition(async () => {
      const result = await restoreLeaveApprovalDefaultsAction({
        organisationId,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setState({
        ...state,
        defaultFeedPrivacyMode: "named",
        defaultLeaveRequestAdvanceDays: 0,
        defaultPrivacyMode: "named",
        feedsIncludePublicHolidaysDefault: false,
        managerVisibilityScope: "direct_reports_only",
        notifyManagersOnStatusChange: true,
        requireDeclineReason: true,
        showDeclinedOnApprovals: true,
        showPendingOnCalendar: true,
      });
      toast.success("Defaults restored.");
    });
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="Each change is saved immediately and applied across approvals, planning, calendar, people, and analytics."
        title="Leave Approval"
      />

      <SettingsToggleCard
        checked={state.showPendingOnCalendar}
        description="Show submitted leave in calendar views before it is fully approved."
        label="Show pending leave on calendar"
        onCheckedChange={(checked) =>
          updatePatch({ showPendingOnCalendar: checked })
        }
      />

      <SettingsToggleCard
        checked={state.showDeclinedOnApprovals}
        description="Include declined records in the default approvals view until a user applies their own filters."
        label="Show declined records by default"
        onCheckedChange={(checked) =>
          updatePatch({ showDeclinedOnApprovals: checked })
        }
      />

      <SettingsToggleCard
        checked={state.notifyManagersOnStatusChange}
        description="Send manager notifications when leave approval status changes."
        label="Notify managers on status change"
        onCheckedChange={(checked) =>
          updatePatch({ notifyManagersOnStatusChange: checked })
        }
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Manager visibility scope</CardTitle>
          <CardDescription>
            Controls whether managers see only direct reports or indirect
            reports as well.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            className="space-y-3"
            onValueChange={(value) => {
              if (
                value === "direct_reports_only" ||
                value === "all_team_leave"
              ) {
                updatePatch({
                  managerVisibilityScope: value,
                });
              }
            }}
            value={state.managerVisibilityScope}
          >
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3">
              <RadioGroupItem
                id="manager-scope-direct"
                value="direct_reports_only"
              />
              <Label htmlFor="manager-scope-direct">Direct reports only</Label>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3">
              <RadioGroupItem
                id="manager-scope-indirect"
                value="all_team_leave"
              />
              <Label htmlFor="manager-scope-indirect">
                All team leave including indirect reports
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Leave request advance days</CardTitle>
          <CardDescription>
            How many days in advance employees should submit leave. Zero means
            no minimum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="advance-days">Advance days</Label>
            <Input
              id="advance-days"
              min={0}
              onBlur={(event) =>
                updatePatch({
                  defaultLeaveRequestAdvanceDays: Number(
                    event.target.value || 0
                  ),
                })
              }
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  defaultLeaveRequestAdvanceDays: Number(
                    event.target.value || 0
                  ),
                }))
              }
              type="number"
              value={state.defaultLeaveRequestAdvanceDays}
            />
          </div>
        </CardContent>
      </Card>

      <SettingsToggleCard
        checked={state.requireDeclineReason}
        description="Decline reasons help employees understand decisions. Disabling this is not recommended."
        label="Require decline reason"
        onCheckedChange={(checked) =>
          updatePatch({ requireDeclineReason: checked })
        }
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Default privacy mode</CardTitle>
          <CardDescription>
            Applies when new records are created without an explicit privacy
            choice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            className="space-y-3"
            onValueChange={(value) => {
              if (
                value === "named" ||
                value === "masked" ||
                value === "private"
              ) {
                updatePatch({
                  defaultPrivacyMode: value,
                });
              }
            }}
            value={state.defaultPrivacyMode}
          >
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3">
              <RadioGroupItem id="privacy-named" value="named" />
              <Label htmlFor="privacy-named">Named (visible to all)</Label>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3">
              <RadioGroupItem id="privacy-masked" value="masked" />
              <Label htmlFor="privacy-masked">
                Masked (Team member shown to peers)
              </Label>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3">
              <RadioGroupItem id="privacy-private" value="private" />
              <Label htmlFor="privacy-private">
                Private (Unavailable shown to peers)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={isPending} onClick={restoreDefaults} variant="ghost">
          Restore defaults
        </Button>
      </div>
    </div>
  );
};

function SettingsToggleCard({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{label}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
      </CardHeader>
    </Card>
  );
}
