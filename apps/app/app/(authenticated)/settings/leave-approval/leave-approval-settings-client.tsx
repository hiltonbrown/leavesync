"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Label } from "@repo/design-system/components/ui/label";
import { toast } from "@repo/design-system/components/ui/sonner";
import { Switch } from "@repo/design-system/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  BriefcaseIcon,
  HomeIcon,
  InboxIcon,
  MapPinIcon,
  SparklesIcon,
  SunIcon,
} from "lucide-react";
import { useState } from "react";
import { SettingsSectionHeader } from "../components/settings-section-header";

// ─── Types ───────────────────────────────────────────────────────────────────

type LeaveTypeId =
  | "holiday"
  | "personal"
  | "out-of-office"
  | "wfh"
  | "travelling"
  | "custom";

type EmployeeTypeId = "full-time" | "part-time" | "contractor" | "casual";

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPES: {
  id: LeaveTypeId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "holiday", label: "Holiday Leave", icon: SunIcon },
  { id: "personal", label: "Personal Leave", icon: BriefcaseIcon },
  { id: "out-of-office", label: "Out of Office", icon: InboxIcon },
  { id: "wfh", label: "Working From Home", icon: HomeIcon },
  { id: "travelling", label: "Travelling", icon: MapPinIcon },
  { id: "custom", label: "Custom", icon: SparklesIcon },
];

const EMPLOYEE_TYPES: { id: EmployeeTypeId; label: string }[] = [
  { id: "full-time", label: "Full-time" },
  { id: "part-time", label: "Part-time" },
  { id: "contractor", label: "Contractor" },
  { id: "casual", label: "Casual" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export const LeaveApprovalSettingsClient = () => {
  const [approvalRequirements, setApprovalRequirements] = useState<
    Record<LeaveTypeId, boolean>
  >({
    holiday: true,
    personal: true,
    "out-of-office": false,
    wfh: false,
    travelling: true,
    custom: true,
  });

  const [availability, setAvailability] = useState<
    Record<EmployeeTypeId, LeaveTypeId[]>
  >({
    "full-time": [
      "holiday",
      "personal",
      "out-of-office",
      "wfh",
      "travelling",
      "custom",
    ],
    "part-time": [
      "holiday",
      "personal",
      "out-of-office",
      "wfh",
      "travelling",
      "custom",
    ],
    contractor: ["out-of-office", "wfh", "travelling", "custom"],
    casual: ["personal", "out-of-office", "wfh", "travelling", "custom"],
  });

  const toggleApproval = (id: LeaveTypeId) => {
    setApprovalRequirements((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleAvailability = (
    employeeType: EmployeeTypeId,
    leaveType: LeaveTypeId
  ) => {
    setAvailability((prev) => {
      const current = prev[employeeType];
      if (current.includes(leaveType)) {
        return {
          ...prev,
          [employeeType]: current.filter((t) => t !== leaveType),
        };
      }
      return {
        ...prev,
        [employeeType]: [...current, leaveType],
      };
    });
  };

  const handleSave = () => {
    toast.success("Leave approval settings saved successfully.");
  };

  return (
    <div className="max-w-4xl space-y-8">
      <SettingsSectionHeader
        action={
          <Button onClick={handleSave} size="sm">
            Save changes
          </Button>
        }
        description="Configure which leave types require approval and set availability by employee type."
        title="Leave Approval"
      />

      <Card className="border-none bg-muted/30 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Approval Requirements</CardTitle>
          <CardDescription>
            Toggled leave types will require manager or owner approval before
            being published.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {LEAVE_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
                  key={type.id}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <Label
                      className="font-medium"
                      htmlFor={`approval-${type.id}`}
                    >
                      {type.label}
                    </Label>
                  </div>
                  <Switch
                    checked={approvalRequirements[type.id]}
                    id={`approval-${type.id}`}
                    onCheckedChange={() => toggleApproval(type.id)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-muted/30 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Leave Availability</CardTitle>
          <CardDescription>
            Specify which leave types are available for each employee type to
            select in their plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px]">Employee Type</TableHead>
                  {LEAVE_TYPES.map((type) => (
                    <TableHead className="text-center" key={type.id}>
                      <div className="flex flex-col items-center gap-1">
                        <type.icon className="size-3.5" />
                        <span className="font-medium text-[0.7rem] uppercase tracking-tight">
                          {type.label.split(" ")[0]}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {EMPLOYEE_TYPES.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.label}
                    </TableCell>
                    {LEAVE_TYPES.map((leave) => (
                      <TableCell className="text-center" key={leave.id}>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={availability[employee.id].includes(
                              leave.id
                            )}
                            onCheckedChange={() =>
                              toggleAvailability(employee.id, leave.id)
                            }
                          />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
