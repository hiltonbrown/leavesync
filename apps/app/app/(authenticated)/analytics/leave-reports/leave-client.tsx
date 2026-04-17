"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { cn } from "@repo/design-system/lib/utils";
import {
  addDays,
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarIcon,
  ChevronRight,
  HouseHeart,
  SunIcon,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─── Data & Config ────────────────────────────────────────────────────────────

const TRAILING_ZERO_REGEX = /\.0$/;

interface TimeRange {
  id: string;
  label: string;
}

interface LeaveType {
  annual: number;
  available: number;
  bgFill: string;
  color: string;
  consumed: number;
  icon: "house-heart" | "sun";
  id: string;
  label: string;
}

interface StaffLeaveData {
  holidayAvailable: number;
  holidayConsumed: number;
  id: number;
  name: string;
  personalAvailable: number;
  personalConsumed: number;
  team: string;
}

interface LeaveChartDataPoint {
  holiday?: number;
  name: string;
  personal?: number;
}

const LEAVE_TYPE_ICONS = {
  "house-heart": HouseHeart,
  sun: SunIcon,
} as const;

// ─── Sub-Components ──────────────────────────────────────────────────────────

const LeaveTimelineChart = ({
  activeType,
  data,
  holidayColor,
  personalColor,
}: {
  activeType: string;
  data: LeaveChartDataPoint[];
  holidayColor?: string;
  personalColor?: string;
}) => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorHoliday" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={holidayColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={holidayColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPersonal" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={personalColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={personalColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            opacity={0.2}
            stroke="var(--outline-variant)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="name"
            dy={10}
            interval="preserveStartEnd"
            minTickGap={20}
            tick={{
              fill: "var(--on-surface-variant)",
              fontSize: 10,
              fontWeight: 500,
            }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{
              fill: "var(--on-surface-variant)",
              fontSize: 10,
              fontWeight: 500,
            }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-container-highest)",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            }}
            itemStyle={{ fontSize: "12px", fontWeight: 600 }}
          />
          {(activeType === "all" || activeType === "holiday") && (
            <Area
              activeDot={{ r: 6, strokeWidth: 0 }}
              dataKey="holiday"
              fill="url(#colorHoliday)"
              fillOpacity={1}
              stroke={holidayColor}
              strokeWidth={3}
              type="monotone"
            />
          )}
          {(activeType === "all" || activeType === "personal") && (
            <Area
              activeDot={{ r: 6, strokeWidth: 0 }}
              dataKey="personal"
              fill="url(#colorPersonal)"
              fillOpacity={1}
              stroke={personalColor}
              strokeWidth={3}
              type="monotone"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface BarChartDataPoint {
  holiday?: number;
  name: string;
  personal?: number;
}

const AnimatedBarChart = ({
  data,
  activeType,
  holidayColor,
  personalColor,
}: {
  data: BarChartDataPoint[];
  activeType: string;
  holidayColor?: string;
  personalColor?: string;
}) => {
  const chartData = data;

  return (
    <div className="relative flex h-[400px] w-full items-end gap-4 px-4 pb-8">
      {chartData.map((item, _idx) => (
        <div
          className="group relative flex flex-1 flex-col items-center"
          key={item.name}
        >
          <div className="relative flex h-[300px] w-full flex-col justify-end overflow-hidden rounded-t-xl bg-surface-container-highest">
            {/* Holiday Segment (Top if all) */}
            <motion.div
              animate={{
                height:
                  activeType === "all" || activeType === "holiday"
                    ? `${((item.holiday ?? 0) / 30) * 100}%`
                    : 0,
              }}
              className="w-full"
              initial={{ height: 0 }}
              layout
              style={{ backgroundColor: holidayColor }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
            {/* Personal Segment (Bottom if all) */}
            <motion.div
              animate={{
                height:
                  activeType === "all" || activeType === "personal"
                    ? `${((item.personal ?? 0) / 30) * 100}%`
                    : 0,
              }}
              className="w-full"
              initial={{ height: 0 }}
              layout
              style={{ backgroundColor: personalColor }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
          <motion.span
            className="mt-4 font-medium text-[0.6875rem] text-on-surface-variant uppercase tracking-wider"
            layout
          >
            {item.name}
          </motion.span>
        </div>
      ))}
    </div>
  );
};

const StaffTableVirtualized = ({
  data,
  onSelect,
  formatVal,
}: {
  data: StaffLeaveData[];
  onSelect: (member: StaffLeaveData) => void;
  formatVal: (val: number) => string;
}) => {
  return (
    <div className="flex flex-col gap-4">
      {data.map((member) => (
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="group flex cursor-pointer items-center justify-between rounded-2xl bg-surface-container-lowest p-4 transition-colors hover:bg-surface-container-low"
          initial={{ opacity: 0, x: -20 }}
          key={member.id}
          onClick={() => onSelect(member)}
          whileHover={{ x: 4 }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-surface-container">
              <User className="h-5 w-5 text-on-surface-variant" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-on-surface text-sm">
                {member.name}
              </p>
              <p className="truncate text-[0.6875rem] text-on-surface-variant uppercase tracking-wider">
                {member.team}
              </p>
            </div>
          </div>
          <div className="flex flex-none items-center gap-6">
            <div className="text-right">
              <p className="text-[0.625rem] text-on-surface-variant uppercase tracking-widest">
                Hol
              </p>
              <p className="font-bold text-primary text-sm">
                {formatVal(member.holidayConsumed)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.625rem] text-on-surface-variant uppercase tracking-widest">
                Per
              </p>
              <p className="font-bold text-[#BA1A1A] text-sm">
                {formatVal(member.personalConsumed)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Main Client ───────────────────────────────────────────────────────────────

interface LeaveClientProps {
  barChartData?: BarChartDataPoint[];
  departments?: string[];
  leaveTypes?: LeaveType[];
  reportingUnit?: string;
  staffData?: StaffLeaveData[];
  timelineChartData?: LeaveChartDataPoint[];
  timeRanges?: TimeRange[];
  workingHoursPerDay?: number;
}

export const LeaveClient = ({
  barChartData,
  departments,
  leaveTypes,
  reportingUnit = "hours",
  staffData,
  timelineChartData,
  timeRanges,
  workingHoursPerDay = 7.6,
}: LeaveClientProps) => {
  const [activeType, setActiveType] = useState<"holiday" | "personal" | "all">(
    "all"
  );
  const [timeRange, setTimeRange] = useState<string>("month");
  const [department, setDepartment] = useState<string>(
    departments?.[0] ?? "All Departments"
  );
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [selectedStaff, setSelectedStaff] = useState<StaffLeaveData | null>(
    null
  );

  const formatVal = useMemo(
    () => (days: number) => {
      if (reportingUnit === "days") {
        return `${days}d`;
      }
      return `${(days * workingHoursPerDay).toFixed(1).replace(TRAILING_ZERO_REGEX, "")}h`;
    },
    [reportingUnit, workingHoursPerDay]
  );

  const filteredStaffData = useMemo(() => {
    if (department === departments?.[0]) {
      return staffData ?? [];
    }
    return (staffData ?? []).filter((s) => s.team === department);
  }, [department, staffData, departments]);

  // Show empty state if no data is available
  if (
    !leaveTypes ||
    leaveTypes.length === 0 ||
    !staffData ||
    staffData.length === 0
  ) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-8 py-8">
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl py-20"
          style={{ background: "var(--muted)" }}
        >
          <p className="font-medium text-[0.9375rem] text-foreground">
            No leave data available
          </p>
          <p className="mt-0.5 text-[0.875rem] text-muted-foreground">
            Leave records will appear here once your organisation data is synced
            from Xero.
          </p>
        </div>
      </div>
    );
  }

  const setRelativeRange = (days: number) => {
    setDate({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  const setFutureRange = (days: number) => {
    setDate({
      from: new Date(),
      to: addDays(new Date(), days),
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-8 py-8">
      {/* Cinematic Header Section */}
      <section className="flex flex-col gap-8">
        <div className="flex h-12 items-center justify-end gap-4">
          {(departments?.length ?? 0) > 0 && (
            <Select onValueChange={setDepartment} value={department}>
              <SelectTrigger className="!h-11 box-border w-[200px] flex-none rounded-2xl border-none bg-surface-container-highest px-4 text-on-surface hover:bg-surface-container-high focus:ring-0">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none bg-surface-container-lowest shadow-xl">
                {departments?.map((dept) => (
                  <SelectItem
                    className="rounded-xl focus:bg-surface-container-low focus:text-primary"
                    key={dept}
                    value={dept}
                  >
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(timeRanges?.length ?? 0) > 0 && (
            <Tabs
              className="box-border h-11 flex-none rounded-2xl bg-surface-container-highest p-1"
              onValueChange={(val) => {
                setTimeRange(val);
                if (val === "week") {
                  setRelativeRange(7);
                }
                if (val === "fortnight") {
                  setRelativeRange(14);
                }
                if (val === "month") {
                  setRelativeRange(30);
                }
                if (val === "year") {
                  setRelativeRange(365);
                }
              }}
              value={timeRange}
            >
              <TabsList className="h-full gap-1 border-none bg-transparent">
                {timeRanges?.map((range) => (
                  <TabsTrigger
                    className="h-full rounded-xl px-4 transition-all data-[state=active]:bg-surface-container-lowest data-[state=active]:text-primary data-[state=active]:shadow-sm"
                    key={range.id}
                    value={range.id}
                  >
                    {range.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="box-border h-11 flex-none rounded-2xl border-none bg-surface-container-highest px-6 text-on-surface hover:bg-surface-container-high"
                variant="outline"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from && format(date.from, "LLL dd")} -{" "}
                {date?.to && format(date.to, "LLL dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="flex w-auto overflow-hidden rounded-2xl border-none bg-surface-container-lowest p-0 shadow-xl"
            >
              <div className="flex min-w-[160px] flex-col gap-1 border-outline-variant/15 border-r bg-surface-container-low p-4">
                <p className="mb-2 px-2 text-label-sm text-on-surface-variant uppercase tracking-widest">
                  Presets
                </p>
                <Button
                  className="h-9 justify-start rounded-xl font-medium"
                  onClick={() => setRelativeRange(7)}
                  size="sm"
                  variant="ghost"
                >
                  Last 7 days
                </Button>
                <Button
                  className="h-9 justify-start rounded-xl font-medium"
                  onClick={() => setRelativeRange(14)}
                  size="sm"
                  variant="ghost"
                >
                  Last 14 days
                </Button>
                <Button
                  className="h-9 justify-start rounded-xl font-medium"
                  onClick={() => setRelativeRange(30)}
                  size="sm"
                  variant="ghost"
                >
                  Last 30 days
                </Button>
                <Button
                  className="h-9 justify-start rounded-xl font-medium"
                  onClick={() => {
                    setDate({
                      from: startOfMonth(subMonths(new Date(), 1)),
                      to: endOfMonth(subMonths(new Date(), 1)),
                    });
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Last Month
                </Button>
                <Button
                  className="h-9 justify-start rounded-xl font-medium"
                  onClick={() => setFutureRange(14)}
                  size="sm"
                  variant="ghost"
                >
                  Next 14 days
                </Button>
                <Button
                  className="h-9 justify-start rounded-xl font-medium"
                  onClick={() => setFutureRange(30)}
                  size="sm"
                  variant="ghost"
                >
                  Next 30 days
                </Button>
              </div>
              <Calendar
                mode="range"
                numberOfMonths={2}
                onSelect={(range) => {
                  setDate(range);
                  setTimeRange("");
                }}
                selected={date}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Cinematic Metric Highlights */}
        {leaveTypes.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {leaveTypes.map((type) => {
              const Icon = LEAVE_TYPE_ICONS[type.icon];

              return (
                <motion.button
                  className={cn(
                    "relative flex flex-col overflow-hidden rounded-[1rem] px-6 py-5 transition-all duration-500",
                    activeType === type.id
                      ? "bg-surface-container-low"
                      : "bg-surface-container-lowest"
                  )}
                  key={type.id}
                  onClick={() =>
                    setActiveType(type.id as "holiday" | "personal" | "all")
                  }
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <AnimatePresence>
                    {activeType === type.id && (
                      <motion.div
                        animate={{ opacity: 1 }}
                        className="pointer-events-none absolute inset-0 bg-primary/5"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        layoutId="active-bg"
                      />
                    )}
                  </AnimatePresence>

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-label-md text-on-surface-variant uppercase tracking-widest">
                        {type.label}
                      </span>
                      <span className="font-semibold text-display-sm text-on-surface">
                        {formatVal(type.consumed)}{" "}
                        <span className="font-normal text-body-lg text-on-surface-variant">
                          / {formatVal(type.annual)}
                        </span>
                      </span>
                    </div>
                    <div
                      className="relative flex h-16 w-16 items-center justify-center rounded-full"
                      style={{ backgroundColor: type.bgFill }}
                    >
                      <div style={{ color: type.color }}>
                        <Icon className="absolute h-6 w-6 opacity-30" />
                      </div>
                      <motion.div
                        animate={{ rotate: activeType === type.id ? 360 : 0 }}
                        className="absolute z-10 h-10 w-10 rounded-full border-2 border-dashed"
                        style={{ borderColor: type.color }}
                        transition={{
                          duration: 10,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                      />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      {/* Main Analysis Stage: Asymmetric 2:1 Split */}
      <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-3">
        {/* Left Column: Chart Group (2/3) */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Leave usage (Line Chart) */}
          {(timelineChartData?.length ?? 0) > 0 && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-8 rounded-[1rem] bg-surface-container-low p-8"
              initial={{ opacity: 0, y: 20 }}
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-headline-md text-on-surface leading-tight">
                  Leave usage
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  Leave consumption patterns over the selected dates.
                </p>
              </div>

              <LeaveTimelineChart
                activeType={activeType}
                data={timelineChartData ?? []}
                holidayColor={leaveTypes.find((t) => t.id === "holiday")?.color}
                personalColor={
                  leaveTypes.find((t) => t.id === "personal")?.color
                }
              />
            </motion.div>
          )}

          {/* Utilization Flow (Bar Chart) */}
          {(barChartData?.length ?? 0) > 0 && (
            <motion.div
              className="flex min-h-[500px] flex-col gap-8 rounded-[1rem] bg-surface-container-low p-8"
              layout
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-headline-md text-on-surface leading-tight">
                    Utilization Flow
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    Comparative leave utilization by staff member.
                  </p>
                </div>
                {leaveTypes.length > 0 && (
                  <div className="flex gap-4">
                    {leaveTypes.map((type) => (
                      <div className="flex items-center gap-2" key={type.id}>
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="whitespace-nowrap text-label-sm text-on-surface-variant">
                          {type.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <AnimatedBarChart
                activeType={activeType}
                data={barChartData ?? []}
                holidayColor={leaveTypes.find((t) => t.id === "holiday")?.color}
                personalColor={
                  leaveTypes.find((t) => t.id === "personal")?.color
                }
              />
            </motion.div>
          )}
        </div>

        {/* Sidebar Column: Staff Distribution (1/3) */}
        <div className="relative lg:col-span-1">
          <aside className="absolute inset-0 flex flex-col overflow-hidden">
            <div className="flex flex-none flex-col gap-1 pb-8">
              <h2 className="text-headline-md text-on-surface leading-tight">
                Staff Distribution
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                Real-time balances across departments.
              </p>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-2">
              <StaffTableVirtualized
                data={filteredStaffData}
                formatVal={formatVal}
                onSelect={setSelectedStaff}
              />
            </div>
          </aside>
        </div>
      </div>

      <Dialog
        onOpenChange={(open) => !open && setSelectedStaff(null)}
        open={!!selectedStaff}
      >
        <DialogContent className="max-h-[92dvh] w-full overflow-y-auto sm:max-w-[640px]">
          {selectedStaff && (
            <>
              <DialogHeader className="mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-surface-container">
                    <User className="h-6 w-6 text-on-surface-variant" />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="text-xl">
                      {selectedStaff.name}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm">
                      {selectedStaff.team} Department
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <SunIcon className="h-16 w-16" />
                    </div>
                    <span className="relative z-10 text-label-sm text-on-surface-variant uppercase tracking-widest">
                      Holiday Leave
                    </span>
                    <div className="relative z-10 flex items-baseline gap-2">
                      <span className="font-bold text-display-sm text-primary">
                        {formatVal(selectedStaff.holidayAvailable)}
                      </span>
                      <span className="mt-1 text-label-sm text-on-surface-variant uppercase tracking-widest">
                        Avail
                      </span>
                    </div>
                  </div>
                  <div className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <HouseHeart className="h-16 w-16" />
                    </div>
                    <span className="relative z-10 text-label-sm text-on-surface-variant uppercase tracking-widest">
                      Personal Leave
                    </span>
                    <div className="relative z-10 flex items-baseline gap-2">
                      <span className="font-bold text-[#BA1A1A] text-display-sm">
                        {formatVal(selectedStaff.personalAvailable)}
                      </span>
                      <span className="mt-1 text-label-sm text-on-surface-variant uppercase tracking-widest">
                        Avail
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="font-semibold text-body-lg text-on-surface">
                    Recent & Upcoming Leave
                  </h3>
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground text-sm">
                      Detailed leave history is available from the person
                      profile.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
