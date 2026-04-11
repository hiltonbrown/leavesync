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

const getStatusClass = (status: string): string => {
  if (status === "Taken") {
    return "bg-surface-container text-on-surface-variant";
  }
  if (status === "Approved") {
    return "bg-primary/10 text-primary";
  }
  return "bg-[#BA1A1A]/10 text-[#BA1A1A]";
};

const TIME_RANGES = [
  { id: "week", label: "Week" },
  { id: "fortnight", label: "Fortnight" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
] as const;

const DEPARTMENTS = [
  "All Departments",
  "Engineering",
  "Marketing",
  "Sales",
  "Product",
  "Ops",
];

const LEAVE_TYPES = [
  {
    id: "all",
    label: "Total PTO",
    available: 20,
    consumed: 8,
    annual: 28,
    color: "#57624F", // Tertiary green
    bgFill: "oklch(0.92 0.01 100)",
    icon: CalendarIcon,
  },
  {
    id: "holiday",
    label: "Holiday leave",
    available: 15,
    consumed: 5,
    annual: 20,
    color: "#336A3B", // Brand primary
    bgFill: "oklch(0.95 0.02 145)",
    icon: SunIcon,
  },
  {
    id: "personal",
    label: "Personal leave",
    available: 5,
    consumed: 3,
    annual: 8,
    color: "#BA1A1A", // Error / Brand red
    bgFill: "oklch(0.95 0.02 20)",
    icon: HouseHeart,
  },
] as const;

// Enhanced Mock Data for Cinematic Morphing
const getMockLeaveHistory = (
  id: number,
  formatVal: (val: number) => string
) => {
  const types = ["Holiday", "Personal", "Out of Office"];
  const statuses = ["Taken", "Approved", "Pending"];
  const days = [1, 2, 3, 5, 10];

  return Array.from({ length: 4 }, (_, i) => {
    const isPast = i < 2;
    return {
      id: `${id}-${i}`,
      type: types[(id + i) % 3],
      status: isPast ? "Taken" : statuses[((id + (i % 2)) % 2) + 1],
      duration: formatVal(days[(id + i) % 5]),
      date: isPast
        ? format(subDays(new Date(), (i + 1) * 15), "MMM dd, yyyy")
        : format(addDays(new Date(), (i + 1) * 20), "MMM dd, yyyy"),
      isPast,
    };
  });
};

const STAFF_LEAVE_DATA = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name:
    [
      "Alice Johnson",
      "Bob Smith",
      "Charlie Davis",
      "Diana Prince",
      "Eve Adams",
      "Frank Miller",
      "Grace Hopper",
      "Hank Pym",
      "Ivy Pepper",
      "Jack Sparrow",
    ][i % 10] + (i > 10 ? ` ${Math.floor(i / 10)}` : ""),
  team: ["Engineering", "Marketing", "Sales", "Product", "Ops"][i % 5],
  holidayAvailable: Math.floor(Math.random() * 20),
  holidayConsumed: Math.floor(Math.random() * 15),
  personalAvailable: Math.floor(Math.random() * 10),
  personalConsumed: Math.floor(Math.random() * 8),
}));

// ─── Sub-Components ──────────────────────────────────────────────────────────

const LeaveTimelineChart = ({
  date,
  activeType,
}: {
  date: DateRange | undefined;
  activeType: string;
}) => {
  const data = useMemo(() => {
    if (!(date?.from && date?.to)) {
      return [];
    }

    let from = date.from;
    let to = date.to;
    if (from > to) {
      const temp = from;
      from = to;
      to = temp;
    }

    const days = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (days > 90) {
      // Aggregate roughly by months for large ranges
      const months = Math.ceil(days / 30) || 1;
      return Array.from({ length: months }, (_, i) => {
        const d = new Date(from.getTime());
        d.setMonth(d.getMonth() + i);
        return {
          name: format(d, "MMM yy"),
          holiday: Math.floor(Math.random() * 50) + 10,
          personal: Math.floor(Math.random() * 20) + 5,
        };
      });
    }

    const points = days + 1;
    return Array.from({ length: points }, (_, i) => {
      const d = new Date(from.getTime());
      d.setDate(d.getDate() + i);
      return {
        name: format(d, "dd MMM"),
        holiday: Math.floor(Math.random() * 10) + 2,
        personal: Math.floor(Math.random() * 5) + 1,
      };
    });
  }, [date]);

  const holidayColor = LEAVE_TYPES.find((t) => t.id === "holiday")?.color;
  const personalColor = LEAVE_TYPES.find((t) => t.id === "personal")?.color;

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

const AnimatedBarChart = ({
  data,
  activeType,
}: {
  data: typeof STAFF_LEAVE_DATA;
  activeType: string;
}) => {
  const chartData = useMemo(() => {
    return data.slice(0, 12).map((d) => ({
      name: d.name.split(" ")[0],
      holiday: d.holidayConsumed,
      personal: d.personalConsumed,
    }));
  }, [data]);

  const holidayColor = LEAVE_TYPES.find((t) => t.id === "holiday")?.color;
  const personalColor = LEAVE_TYPES.find((t) => t.id === "personal")?.color;

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
                    ? `${(item.holiday / 30) * 100}%`
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
                    ? `${(item.personal / 30) * 100}%`
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
  data: typeof STAFF_LEAVE_DATA;
  onSelect: (member: (typeof STAFF_LEAVE_DATA)[0]) => void;
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

export const LeaveClient = ({
  reportingUnit = "hours",
  workingHoursPerDay = 7.6,
}: {
  reportingUnit?: string;
  workingHoursPerDay?: number;
}) => {
  const [activeType, setActiveType] = useState<"holiday" | "personal" | "all">(
    "all"
  );
  const [timeRange, setTimeRange] = useState<string>("month");
  const [department, setDepartment] = useState<string>("All Departments");
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [selectedStaff, setSelectedStaff] = useState<
    (typeof STAFF_LEAVE_DATA)[0] | null
  >(null);

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
    if (department === "All Departments") {
      return STAFF_LEAVE_DATA;
    }
    return STAFF_LEAVE_DATA.filter((s) => s.team === department);
  }, [department]);

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
          <Select onValueChange={setDepartment} value={department}>
            <SelectTrigger className="!h-11 box-border w-[200px] flex-none rounded-2xl border-none bg-surface-container-highest px-4 text-on-surface hover:bg-surface-container-high focus:ring-0">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none bg-surface-container-lowest shadow-xl">
              {DEPARTMENTS.map((dept) => (
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
              {TIME_RANGES.map((range) => (
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {LEAVE_TYPES.map((type) => (
            <motion.button
              className={cn(
                "relative flex flex-col overflow-hidden rounded-[1rem] px-6 py-5 transition-all duration-500",
                activeType === type.id
                  ? "bg-surface-container-low"
                  : "bg-surface-container-lowest"
              )}
              key={type.id}
              onClick={() => setActiveType(type.id)}
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
                  <type.icon
                    className="absolute h-6 w-6 opacity-30"
                    style={{ color: type.color }}
                  />
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
          ))}
        </div>
      </section>

      {/* Main Analysis Stage: Asymmetric 2:1 Split */}
      <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-3">
        {/* Left Column: Chart Group (2/3) */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Leave usage (Line Chart) */}
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

            <LeaveTimelineChart activeType={activeType} date={date} />
          </motion.div>

          {/* Utilization Flow (Bar Chart) */}
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
              <div className="flex gap-4">
                {LEAVE_TYPES.map((type) => (
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
            </div>

            <AnimatedBarChart
              activeType={activeType}
              data={filteredStaffData}
            />
          </motion.div>
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
                    {getMockLeaveHistory(selectedStaff.id, formatVal).map(
                      (leave) => (
                        <div
                          className="group flex items-center justify-between rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4 transition-all hover:border-outline-variant/30 hover:bg-surface-container-low"
                          key={leave.id}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-body-sm text-on-surface">
                              {leave.type}
                            </span>
                            <span className="text-label-sm text-on-surface-variant">
                              {leave.date} · {leave.duration}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "rounded-md px-2.5 py-1 font-bold text-[10px] uppercase tracking-widest",
                              getStatusClass(leave.status)
                            )}
                          >
                            {leave.status}
                          </div>
                        </div>
                      )
                    )}
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
