"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/design-system/components/ui/chart";
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
import { CalendarIcon, HomeIcon, PlaneIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

// ─── Data & Config ────────────────────────────────────────────────────────────

const TEAM_OOO_DATA = [
  { team: "Engineering", wfh: 45, travelling: 12 },
  { team: "Marketing", wfh: 20, travelling: 8 },
  { team: "Sales", wfh: 15, travelling: 25 },
];

const UPCOMING_OOO = [
  {
    id: 1,
    name: "Alice Johnson",
    team: "Engineering",
    type: "Working from Home",
    date: "Tomorrow",
    duration: "1 day",
  },
  {
    id: 2,
    name: "Charlie Davis",
    team: "Marketing",
    type: "Travelling",
    date: "Next Mon - Wed",
    duration: "3 days",
  },
  {
    id: 3,
    name: "Eve Adams",
    team: "Sales",
    type: "Travelling",
    date: "Next Thu - Fri",
    duration: "2 days",
  },
  {
    id: 4,
    name: "Bob Smith",
    team: "Engineering",
    type: "Working from Home",
    date: "Next Fri",
    duration: "1 day",
  },
];

const HISTORICAL_OOO = [
  {
    id: 5,
    name: "Diana Prince",
    team: "Marketing",
    type: "Working from Home",
    date: "Last Tuesday",
    duration: "1 day",
  },
  {
    id: 6,
    name: "Alice Johnson",
    team: "Engineering",
    type: "Travelling",
    date: "Last Mon - Wed",
    duration: "3 days",
  },
];

const chartConfig: ChartConfig = {
  wfh: {
    label: "Working from Home",
    color: "#7ab4f5", // soft blue
  },
  travelling: {
    label: "Travelling",
    color: "#9b51e0", // purple
  },
};

// ─── Components ───────────────────────────────────────────────────────────────

export const OooClient = () => {
  const [timeRange, setTimeRange] = useState<string>("month");
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-3xl text-foreground tracking-tight">
            Out of Office Reports
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Track team locations, travel status, and remote working days.
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
      <div className="grid grid-cols-1 gap-6">
        {/* Teams Breakdown Chart */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="mb-6">
            <h2 className="font-semibold text-foreground text-lg tracking-tight">
              Location Summary by Team
            </h2>
            <p className="text-muted-foreground text-sm">
              Total days spent travelling or working remotely across
              departments.
            </p>
          </div>
          <ChartContainer className="h-[300px] w-full" config={chartConfig}>
            <BarChart
              data={TEAM_OOO_DATA}
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
                dataKey="team"
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
                content={<ChartTooltipContent indicator="dashed" />}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                barSize={40}
                dataKey="wfh"
                fill="var(--color-wfh)"
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
              <Bar
                barSize={40}
                dataKey="travelling"
                fill="var(--color-travelling)"
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* ─── Upcoming OOO Table ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-xl tracking-tight">
              Upcoming Schedule
            </h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[30%]">Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {UPCOMING_OOO.map((record) => (
                  <TableRow className="hover:bg-muted/30" key={record.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground text-sm">
                          {record.name}
                        </span>
                        <div className="mt-0.5 text-muted-foreground text-xs">
                          {record.team}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {record.type === "Travelling" ? (
                          <PlaneIcon className="h-4 w-4 text-purple-500" />
                        ) : (
                          <HomeIcon className="h-4 w-4 text-blue-400" />
                        )}
                        <span className="text-sm">{record.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{record.date}</TableCell>
                    <TableCell className="text-right text-sm">
                      {record.duration}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ─── Historical OOO Table ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-xl tracking-tight">
              Recent History
            </h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[30%]">Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {HISTORICAL_OOO.map((record) => (
                  <TableRow className="hover:bg-muted/30" key={record.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground text-sm">
                          {record.name}
                        </span>
                        <div className="mt-0.5 text-muted-foreground text-xs">
                          {record.team}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {record.type === "Travelling" ? (
                          <PlaneIcon className="h-4 w-4 text-purple-500" />
                        ) : (
                          <HomeIcon className="h-4 w-4 text-blue-400" />
                        )}
                        <span className="text-sm">{record.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{record.date}</TableCell>
                    <TableCell className="text-right text-sm">
                      {record.duration}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};
