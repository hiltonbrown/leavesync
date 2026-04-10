"use client";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { toast } from "@repo/design-system/components/ui/sonner";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  LifeBuoy,
  MessageSquare,
  RefreshCcw,
  Zap,
} from "lucide-react";
import { useState, useTransition } from "react";
import { submitTicket } from "@/app/actions/support/submit-ticket";
import { SettingsSectionHeader } from "../settings/components/settings-section-header";

type Stage = "IDLE" | "SYNC_HELP" | "GENERAL_SUPPORT";
type TicketType = "support" | "feedback" | "bug";

const TICKET_TYPES = [
  { value: "support", label: "Lodge a support ticket" },
  { value: "feedback", label: "Suggest an improvement" },
  { value: "bug", label: "Report a bug" },
];

export const SupportClient = () => {
  const [stage, setStage] = useState<Stage>("IDLE");
  const [type, setType] = useState<TicketType>("support");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleBack = () => setStage("IDLE");

  const handleSubmit = () => {
    if (!(subject.trim() && description.trim())) {
      toast.error("Subject and description are required");
      return;
    }

    startTransition(async () => {
      const result = await submitTicket({
        type,
        subject,
        description,
      });

      if (result.ok) {
        toast.success("Thank you! Your message has been received.");
        setSubject("");
        setDescription("");
        setStage("IDLE");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="Frictionless assistance for HR teams and employees."
        title="Support & Feedback"
      />

      <div className="relative min-h-[400px] overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          {stage === "IDLE" && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key="idle"
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Button
                  className="flex h-32 flex-col items-start justify-between rounded-2xl border-2 border-transparent bg-muted/50 p-6 transition-colors hover:bg-muted"
                  onClick={() => {
                    setType("support");
                    setStage("SYNC_HELP");
                  }}
                  variant="ghost"
                >
                  <RefreshCcw className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">I have a sync issue</div>
                    <div className="text-muted-foreground text-sm">
                      Fix connection or data sync problems.
                    </div>
                  </div>
                </Button>

                <Button
                  className="flex h-32 flex-col items-start justify-between rounded-2xl border-2 border-transparent bg-muted/50 p-6 transition-colors hover:bg-muted"
                  onClick={() => {
                    setType("feedback");
                    setStage("GENERAL_SUPPORT");
                  }}
                  variant="ghost"
                >
                  <MessageSquare className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">Suggest or report</div>
                    <div className="text-muted-foreground text-sm">
                      Feature requests and general feedback.
                    </div>
                  </div>
                </Button>

                <Button
                  className="flex h-32 flex-col items-start justify-between rounded-2xl border-2 border-transparent bg-muted/50 p-6 transition-colors hover:bg-muted sm:col-span-2"
                  onClick={() => {
                    setType("support");
                    setStage("GENERAL_SUPPORT");
                  }}
                  variant="ghost"
                >
                  <LifeBuoy className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold text-lg">Talk to a human</div>
                    <div className="max-w-md text-muted-foreground text-sm">
                      If you're stuck or have a complex inquiry, our team is
                      here to help you personally.
                    </div>
                  </div>
                </Button>
              </div>
            </motion.div>
          )}

          {stage === "SYNC_HELP" && (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              initial={{ opacity: 0, scale: 0.98 }}
              key="sync-help"
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Card className="rounded-2xl border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-bold text-primary text-xs uppercase tracking-wider">
                      Instant Diagnostics
                    </span>
                  </div>
                  <CardTitle className="text-lg">Xero Sync Health</CardTitle>
                  <CardDescription>
                    Checking your integration status...
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span>Authentication</span>
                      </div>
                      <span className="text-muted-foreground">Connected</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                        <span>Last Sync Attempt</span>
                      </div>
                      <span className="font-medium text-muted-foreground">
                        Partial success (2m ago)
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border-amber-500 border-l-4 bg-muted/30 p-4 text-sm">
                    <p className="mb-1 font-medium">Detected potential issue</p>
                    <p className="text-muted-foreground leading-relaxed">
                      We found 3 employees with mismatched email addresses
                      between Xero and LeaveSync. This usually stops leave
                      requests from syncing.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button className="h-11 w-full">
                      Run Fix & Force Re-sync
                    </Button>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        className="h-11 flex-1 text-muted-foreground"
                        onClick={() => setStage("GENERAL_SUPPORT")}
                        variant="link"
                      >
                        Still not working? Message us
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        className="h-11"
                        onClick={handleBack}
                        variant="outline"
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {stage === "GENERAL_SUPPORT" && (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              initial={{ opacity: 0, x: -20 }}
              key="form"
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Card className="rounded-2xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="mb-2 text-lg leading-none">
                        How can we help?
                      </CardTitle>
                      <CardDescription>
                        We'll get back to you personally via your account email.
                      </CardDescription>
                    </div>
                    <Button
                      className="h-9 w-9 p-0"
                      onClick={handleBack}
                      variant="ghost"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-type">I would like to...</Label>
                    <Select
                      onValueChange={(v) => setType(v as TicketType)}
                      value={type}
                    >
                      <SelectTrigger className="h-11 w-full" id="ticket-type">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_TYPES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Missing leave type in calendar"
                      value={subject}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Message</Label>
                    <Textarea
                      className="min-h-[150px] resize-none"
                      id="description"
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please provide as much detail as possible..."
                      value={description}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      className="h-11 min-w-32 rounded-xl bg-primary px-8 font-semibold hover:bg-primary/90"
                      disabled={isPending}
                      onClick={handleSubmit}
                    >
                      {isPending ? "Sending..." : "Submit request"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
