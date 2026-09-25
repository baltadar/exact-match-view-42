export const DURATIONS = [
  { value: "weekly", label: "1 week" },
  { value: "monthly", label: "1 month" },
  { value: "six_months", label: "6 months" },
  { value: "yearly", label: "1 year" },
] as const;

export type DurationValue = (typeof DURATIONS)[number]["value"];

export function durationLabel(value: string) {
  return DURATIONS.find((d) => d.value === value)?.label ?? value;
}

export function endDateFor(duration: DurationValue, from = new Date()) {
  const d = new Date(from);
  if (duration === "weekly") d.setDate(d.getDate() + 7);
  if (duration === "monthly") d.setMonth(d.getMonth() + 1);
  if (duration === "six_months") d.setMonth(d.getMonth() + 6);
  if (duration === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function daysLeft(endDate: string) {
  const ms = new Date(endDate + "T23:59:59").getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
