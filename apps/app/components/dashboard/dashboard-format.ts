export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

export function formatDaysUntil(daysUntil: number | null): string {
  if (daysUntil === null) {
    return "No upcoming holiday";
  }
  if (daysUntil === 0) {
    return "Today";
  }
  if (daysUntil === 1) {
    return "Tomorrow";
  }
  return `In ${daysUntil} days`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}
