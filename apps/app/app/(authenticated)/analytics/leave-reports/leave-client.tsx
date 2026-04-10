"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/design-system/components/ui/chart";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { cn } from "@repo/design-system/lib/utils";
import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import { CalendarIcon, InfoIcon } from "lucide-react";
import { Fragment, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

// ─── Data & Config ────────────────────────────────────────────────────────────

const WEEKLY_DATA = [
  { day: "Mon", leaves: 1.8 },
  { day: "Tue", leaves: 7.8 },
  { day: "Wed", leaves: 2.7 },
  { day: "Thu", leaves: 4.1 },
  { day: "Fri", leaves: 0.2 },
  { day: "Sat", leaves: 1.1 },
  { day: "Sun", leaves: 0.2 },
];

const MONTHLY_DATA = [
  { month: "Jan", planned: 20, unplanned: 10 },
  { month: "Feb", planned: 100, unplanned: 20 },
  { month: "Mar", planned: 180, unplanned: 30 },
  { month: "Apr", planned: 150, unplanned: 50 },
  { month: "May", planned: 80, unplanned: 20 },
  { month: "Jun", planned: 140, unplanned: 40 },
  { month: "Jul", planned: 300, unplanned: 100 },
  { month: "Aug", planned: 180, unplanned: 30 },
  { month: "Sep", planned: 50, unplanned: 30 },
  { month: "Oct", planned: 130, unplanned: 30 },
  { month: "Nov", planned: 280, unplanned: 60 },
  { month: "Dec", planned: 250, unplanned: 70 },
];

const LEAVE_TYPES = [
  {
    id: "holiday",
    label: "Holiday leave",
    available: 15,
    consumed: 5,
    annual: 20,
    color: "#e16a6d", // soft red/pink
    bgFill: "#ffeef0",
  },
  {
    id: "personal",
    label: "Personal leave",
    available: 5,
    consumed: 3,
    annual: 8,
    color: "#3f9d5e", // green
    bgFill: "#e8f6ed",
  },
] as const;

const STAFF_LEAVE_DATA = [
  {
    team: "Engineering",
    members: [
      {
        id: 1,
        name: "Alice Johnson",
        holidayAvailable: 15,
        holidayConsumed: 5,
        personalAvailable: 5,
        personalConsumed: 3,
      },
      {
        id: 2,
        name: "Bob Smith",
        holidayAvailable: 20,
        holidayConsumed: 0,
        personalAvailable: 8,
        personalConsumed: 2,
      },
    ],
  },
  {
    team: "Marketing",
    members: [
      {
        id: 3,
        name: "Charlie Davis",
        holidayAvailable: 10,
        holidayConsumed: 10,
        personalAvailable: 3,
        personalConsumed: 5,
      },
      {
        id: 4,
        name: "Diana Prince",
        holidayAvailable: 18,
        holidayConsumed: 2,
        personalAvailable: 8,
        personalConsumed: 0,
      },
    ],
  },
  {
    team: "Sales",
    members: [
      {
        id: 5,
        name: "Eve Adams",
        holidayAvailable: 5,
        holidayConsumed: 15,
        personalAvailable: 1,
        personalConsumed: 7,
      },
    ],
  },
];

const chartConfig: ChartConfig = {
  leaves: {
    label: "Leaves",
    color: "hsl(var(--primary))",
  },
  planned: {
    label: "Planned Leave",
    color: "hsl(var(--primary))",
  },
  unplanned: {
    label: "Unplanned Leave",
    color: "hsl(var(--chart-2, 12 76% 61%))",
  },
};

// ─── Components ───────────────────────────────────────────────────────────────

export const LeaveClient = () => {
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("month");
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const openModal = (id: string) => setSelectedChart(id);
  const closeModal = () => setSelectedChart(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-3xl text-foreground tracking-tight">
            Leave Reports
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Monitor paid time off balances and leave patterns.
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Tabs
            className="flex-none"
            onValueChange={setTimeRange}
            value={timeRange}
          >
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
                variant={"outline"}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {!date?.from && <span>Pick a date</span>}
                {date?.from && !date.to && format(date.from, "LLL dd, y")}
                {date?.from && date.to && (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <div className="flex flex-col gap-4 p-3 sm:flex-row">
                <div className="flex flex-col gap-2 border-border sm:border-r sm:pr-3">
                  <Button
                    className="justify-start text-left font-normal"
                    onClick={() =>
                      setDate({
                        from: subDays(new Date(), 7),
                        to: new Date(),
                      })
                    }
                    variant="ghost"
                  >
                    Last 7 days
                  </Button>
                  <Button
                    className="justify-start text-left font-normal"
                    onClick={() =>
                      setDate({
                        from: startOfMonth(subMonths(new Date(), 1)),
                        to: endOfMonth(subMonths(new Date(), 1)),
                      })
                    }
                    variant="ghost"
                  >
                    Last Month
                  </Button>
                  <Button
                    className="justify-start text-left font-normal"
                    onClick={() =>
                      setDate({
                        from: startOfMonth(new Date()),
                        to: new Date(),
                      })
                    }
                    variant="ghost"
                  >
                    This Month
                  </Button>
                </div>
                <div className="p-0">
                  <Calendar
                    defaultMonth={date?.from}
                    initialFocus
                    mode="range"
                    numberOfMonths={2}
                    onSelect={setDate}
                    selected={date}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ─── Top Level Charts ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Chart */}
        <button
          className="col-span-1 flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-xs transition-shadow hover:shadow-md"
          onClick={() => openModal("weekly")}
          type="button"
        >
          <div className="mb-6">
            <h2 className="font-semibold text-foreground text-lg tracking-tight">
              Weekly Leave Pattern
            </h2>
          </div>
          <ChartContainer className="h-[250px] w-full" config={chartConfig}>
            <BarChart
              data={WEEKLY_DATA}
              margin={{ top: 20, right: 0, left: -25, bottom: 0 }}
            >
              <CartesianGrid
                stroke="hsl(var(--muted-foreground) / 0.2)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                axisLine={false}
                className="text-muted-foreground"
                dataKey="day"
                fontSize={12}
                tickLine={false}
                tickMargin={12}
              />
              <YAxis
                axisLine={false}
                className="text-muted-foreground"
                fontSize={12}
                tickLine={false}
                tickMargin={10}
              />
              <ChartTooltip
                content={<ChartTooltipContent hideIndicator />}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              />
              <Bar
                barSize={32}
                dataKey="leaves"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </button>

        {/* Monthly Chart */}
        <button
          className="col-span-1 flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-xs transition-shadow hover:shadow-md lg:col-span-2"
          onClick={() => openModal("monthly")}
          type="button"
        >
          <div className="mb-6">
            <h2 className="font-semibold text-foreground text-lg tracking-tight">
              Monthly Leave Pattern
            </h2>
          </div>
          <ChartContainer className="h-[250px] w-full" config={chartConfig}>
            <AreaChart
              data={MONTHLY_DATA}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillPlanned" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-planned)"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-planned)"
                    stopOpacity={0.0}
                  />
                </linearGradient>
                <linearGradient id="fillUnplanned" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-unplanned)"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-unplanned)"
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="hsl(var(--muted-foreground) / 0.2)"
                strokeDasharray="3 3"
                vertical={true}
              />
              <XAxis
                axisLine={false}
                className="text-muted-foreground"
                dataKey="month"
                fontSize={12}
                tickLine={false}
                tickMargin={12}
              />
              <YAxis
                axisLine={false}
                className="text-muted-foreground"
                fontSize={12}
                tickLine={false}
                tickMargin={10}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={{
                  stroke: "var(--color-planned)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                dataKey="planned"
                fill="url(#fillPlanned)"
                fillOpacity={1}
                stackId="1"
                stroke="var(--color-planned)"
                strokeWidth={2}
                type="monotone"
              />
              <Area
                dataKey="unplanned"
                fill="url(#fillUnplanned)"
                fillOpacity={1}
                stackId="1"
                stroke="var(--color-unplanned)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </button>
      </div>

      {/* ─── Leave Balances Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {LEAVE_TYPES.map((type) => {
          let pieData: { name: string; value: number; fill: string }[];
          if (type.available === "Unlimited" || type.annual === "Unlimited") {
            // 100% of the circle is the bg color (as they have unlimited)
            pieData = [
              { name: "Consumed", value: type.consumed, fill: type.bgFill },
              { name: "Available", value: 100, fill: type.bgFill },
            ];
          } else {
            pieData = [
              {
                name: "Consumed",
                value: type.consumed as number,
                fill: type.color,
              },
              {
                name: "Available",
                value: type.available as number,
                fill: type.bgFill,
              },
            ];
          }

          return (
            <button
              className="group flex cursor-pointer flex-col items-center rounded-2xl border border-border bg-card p-6 shadow-xs transition-shadow hover:shadow-md"
              key={type.id}
              onClick={() => openModal(type.id)}
              type="button"
            >
              <h3 className="font-semibold text-[1.05rem] text-foreground tracking-tight">
                {type.label}
              </h3>

              <div className="relative my-6 flex items-center justify-center">
                <ChartContainer
                  className="h-[140px] w-[140px] [&_.recharts-pie]:transition-transform [&_.recharts-pie]:duration-300 group-hover:[&_.recharts-pie]:scale-105"
                  config={{}}
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      endAngle={-270}
                      innerRadius={50}
                      nameKey="name"
                      outerRadius={70}
                      startAngle={90}
                      strokeWidth={0}
                    >
                      {pieData.map((entry) => (
                        <Cell fill={entry.fill} key={`cell-${entry.name}`} />
                      ))}
                      {type.available === "Unlimited" && (
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  dominantBaseline="middle"
                                  textAnchor="middle"
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                >
                                  <tspan
                                    className="fill-primary font-bold text-3xl"
                                    fill={type.color}
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                  >
                                    ∞
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      )}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>

              <div className="grid w-full grid-cols-3 gap-2 text-center">
                <div className="flex flex-col">
                  <span className="font-medium text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                    Available
                  </span>
                  <span className="mt-1 font-semibold text-foreground text-sm">
                    {type.available === "Unlimited"
                      ? "Unlimited"
                      : String(type.available).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-col border-border/50 border-x">
                  <span className="font-medium text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                    Consumed
                  </span>
                  <span className="mt-1 font-semibold text-foreground text-sm">
                    {String(type.consumed).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                    Annual
                  </span>
                  <span className="mt-1 font-semibold text-foreground text-sm">
                    {type.annual === "Unlimited"
                      ? "Unlimited"
                      : String(type.annual).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Staff Leave Table ─────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-xl tracking-tight">
            Staff Leave Balances
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[30%]">Name</TableHead>
                <TableHead className="text-center">Holiday Available</TableHead>
                <TableHead className="text-center">Holiday Consumed</TableHead>
                <TableHead className="text-center">
                  Personal Available
                </TableHead>
                <TableHead className="text-center">Personal Consumed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {STAFF_LEAVE_DATA.map((teamData) => (
                <Fragment key={teamData.team}>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell
                      className="font-semibold text-foreground text-sm uppercase tracking-wider"
                      colSpan={5}
                    >
                      {teamData.team}
                    </TableCell>
                  </TableRow>
                  {teamData.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.name}
                      </TableCell>
                      <TableCell className="text-center">
                        {member.holidayAvailable}
                      </TableCell>
                      <TableCell className="text-center">
                        {member.holidayConsumed}
                      </TableCell>
                      <TableCell className="text-center">
                        {member.personalAvailable}
                      </TableCell>
                      <TableCell className="text-center">
                        {member.personalConsumed}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── Detail Modal ──────────────────────────────────────────────────────── */}
      <Dialog
        onOpenChange={(open) => !open && closeModal()}
        open={!!selectedChart}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedChart === "weekly" && "Weekly Leave Deep Dive"}
              {selectedChart === "monthly" && "Monthly Leave Deep Dive"}
              {LEAVE_TYPES.find((t) => t.id === selectedChart)?.label} Details
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of requests, impacted departments, and approval
              timelines.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <InfoIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="max-w-xs">
              <h3 className="font-semibold text-foreground text-lg">
                Detailed view coming soon
              </h3>
              <p className="mt-1 text-muted-foreground text-sm">
                This detailed insight drill-down involves complex metrics
                aggregations and is scheduled for the next iteration.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
