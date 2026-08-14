import { site } from "@/data/site";

type DayRule = (typeof site.hours)[number];

export type OpenStatus =
  { isOpen: true; closesAt: string } | { isOpen: false; nextOpen: { label: string; time: string } };

const MINUTES_IN_DAY = 24 * 60;

const toMinutes = (hhmm: string): number => {
  const parts = hhmm.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  return h * 60 + m;
};

const getZonedParts = (date: Date, timeZone: string): { weekday: number; minutes: number } => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  const weekday = weekdayMap[map.weekday ?? "Mon"] ?? 1;
  const minutes = Number(map.hour) * 60 + Number(map.minute);

  return { weekday, minutes };
};

const ruleFor = (weekday: number): DayRule => {
  const rule = site.hours.find((h) => h.day === weekday);
  if (!rule) throw new Error(`No hours rule configured for weekday ${weekday}`);
  return rule;
};

export const getOpenStatus = (date: Date = new Date(), timeZone: string = site.timeZone): OpenStatus => {
  const { weekday, minutes } = getZonedParts(date, timeZone);

  const today = ruleFor(weekday);
  const yesterdayWeekday = weekday === 1 ? 7 : weekday - 1;
  const yesterday = ruleFor(yesterdayWeekday);

  if (today.open && today.close) {
    const openMin = toMinutes(today.open);
    const closeMin = today.closesNextDay ? toMinutes(today.close) + MINUTES_IN_DAY : toMinutes(today.close);

    if (minutes >= openMin && minutes < Math.min(closeMin, MINUTES_IN_DAY)) {
      return { isOpen: true, closesAt: today.close };
    }
  }

  if (yesterday.open && yesterday.close && yesterday.closesNextDay) {
    const closeMin = toMinutes(yesterday.close);
    if (minutes < closeMin) {
      return { isOpen: true, closesAt: yesterday.close };
    }
  }

  for (let offset = 0; offset < 7; offset++) {
    const candidateWeekday = ((weekday - 1 + offset) % 7) + 1;
    const candidate = ruleFor(candidateWeekday);
    if (!candidate.open) continue;

    if (offset === 0) {
      const openMin = toMinutes(candidate.open);
      if (minutes < openMin) {
        return { isOpen: false, nextOpen: { label: "сьогодні", time: candidate.open } };
      }
      continue;
    }

    const label = offset === 1 ? "завтра" : candidate.label.toLowerCase();
    return { isOpen: false, nextOpen: { label, time: candidate.open } };
  }

  throw new Error("No open days configured");
};

export const formatStatus = (status: OpenStatus): string => {
  if (status.isOpen) return `Відчинено зараз · до ${status.closesAt}`;
  return `Наступна ніч: ${status.nextOpen.label}, ${status.nextOpen.time}`;
};
