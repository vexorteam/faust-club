import { site } from "@/data/site";
import { ConfigurationError } from "@/errors";
import type { OperatingHoursView } from "@/types";

type DayRule = OperatingHoursView;

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

const ruleFor = (hours: readonly DayRule[], weekday: number): DayRule => {
  const rule = hours.find((h) => h.day === weekday);
  if (!rule) throw new ConfigurationError(`У графіку немає правила для дня тижня ${weekday}`);
  return rule;
};

export const getOpenStatus = (
  date: Date = new Date(),
  timeZone: string = site.timeZone,
  hours: readonly DayRule[] = site.hours,
): OpenStatus => {
  const { weekday, minutes } = getZonedParts(date, timeZone);

  const today = ruleFor(hours, weekday);
  const yesterdayWeekday = weekday === 1 ? 7 : weekday - 1;
  const yesterday = ruleFor(hours, yesterdayWeekday);

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
    const candidate = ruleFor(hours, candidateWeekday);
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

  throw new ConfigurationError("У графіку немає жодного робочого дня");
};

export const formatStatus = (status: OpenStatus): string => {
  if (status.isOpen) return `Відчинено зараз · до ${status.closesAt}`;
  return `Наступна ніч: ${status.nextOpen.label}, ${status.nextOpen.time}`;
};

const SHORT_DAYS: Record<number, string> = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Нд" };

const openDays = (hours: readonly DayRule[]): readonly DayRule[] => hours.filter((rule) => rule.open !== null);

/**
 * "Чт–Сб", or "Чт, Сб" when the nights are not next to each other.
 *
 * Derived rather than written out, because a hero that says one thing while
 * the footer and the JSON-LD say another is worse than a hero that says
 * nothing: the visitor turns up on the wrong night.
 */
export const formatWorkingDays = (hours: readonly DayRule[] = site.hours): string => {
  const days = openDays(hours);

  if (days.length === 0) return "";

  const short = days.map((rule) => SHORT_DAYS[rule.day] ?? rule.label);
  const runsTogether = days.every((rule, index) => index === 0 || rule.day === (days[index - 1]?.day ?? 0) + 1);

  if (!runsTogether || days.length < 3) return short.join(", ");

  return `${short[0]}–${short[short.length - 1]}`;
};

/** The opening time, when every working night shares one. Otherwise `null`. */
export const openingTime = (hours: readonly DayRule[] = site.hours): string | null => {
  const times = new Set(openDays(hours).map((rule) => rule.open));

  return times.size === 1 ? ([...times][0] ?? null) : null;
};

/** "Чт–Сб · 22:00" — the line the hero shows before any clock is consulted. */
export const formatWeek = (hours: readonly DayRule[] = site.hours): string =>
  [formatWorkingDays(hours), openingTime(hours)].filter(Boolean).join(" · ");
