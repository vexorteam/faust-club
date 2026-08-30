import { describe, expect, it } from "vitest";
import { site } from "@/data/site";
import { formatStatus, formatWeek, formatWorkingDays, getOpenStatus, openingTime } from "./hours";
import type { OperatingHoursView } from "@/types";

const TZ = "Europe/Kyiv";

const kyiv = (isoDateTimeLocal: string): Date => new Date(`${isoDateTimeLocal}:00+02:00`);

describe("getOpenStatus — the real Mon–Sat 18:00–23:30 schedule", () => {
  it("Monday 17:59 → still closed, opens at 18:00 today", () => {
    const status = getOpenStatus(kyiv("2025-01-13T17:59"), TZ);
    expect(status.isOpen).toBe(false);
    if (!status.isOpen) {
      expect(status.nextOpen.label).toBe("сьогодні");
      expect(status.nextOpen.time).toBe("18:00");
    }
  });

  it("Monday 18:00 → open, exactly at the threshold", () => {
    const status = getOpenStatus(kyiv("2025-01-13T18:00"), TZ);
    expect(status.isOpen).toBe(true);
    if (status.isOpen) expect(status.closesAt).toBe("23:30");
  });

  it("Monday 23:29 → still open, one minute before close", () => {
    const status = getOpenStatus(kyiv("2025-01-13T23:29"), TZ);
    expect(status.isOpen).toBe(true);
  });

  it("Monday 23:30 → closed, the window has ended (no overnight carry-over)", () => {
    const status = getOpenStatus(kyiv("2025-01-13T23:30"), TZ);
    expect(status.isOpen).toBe(false);
    if (!status.isOpen) {
      expect(status.nextOpen.label).toBe("завтра");
      expect(status.nextOpen.time).toBe("18:00");
    }
  });

  it("Tuesday 00:01 → closed, does not inherit Monday's night", () => {
    const status = getOpenStatus(kyiv("2025-01-14T00:01"), TZ);
    expect(status.isOpen).toBe(false);
  });

  it("Sunday 12:00 → closed, next opening is tomorrow (Monday)", () => {
    const status = getOpenStatus(kyiv("2025-01-12T12:00"), TZ);
    expect(status.isOpen).toBe(false);
    if (!status.isOpen) {
      expect(status.nextOpen.label).toBe("завтра");
      expect(status.nextOpen.time).toBe("18:00");
    }
  });

  it("formatStatus renders a human string for both states", () => {
    const open = getOpenStatus(kyiv("2025-01-13T19:00"), TZ);
    const closed = getOpenStatus(kyiv("2025-01-12T10:00"), TZ);
    expect(formatStatus(open)).toContain("Відчинено зараз");
    expect(formatStatus(closed)).toContain("Наступна ніч");
  });
});

describe("getOpenStatus — overnight rollover via closesNextDay", () => {
  const overnightHours: OperatingHoursView[] = [
    { day: 1, label: "Понеділок", open: null, close: null, closesNextDay: false },
    { day: 2, label: "Вівторок", open: null, close: null, closesNextDay: false },
    { day: 3, label: "Середа", open: null, close: null, closesNextDay: false },
    { day: 4, label: "Четвер", open: null, close: null, closesNextDay: false },
    { day: 5, label: "П'ятниця", open: "22:00", close: "04:00", closesNextDay: true },
    { day: 6, label: "Субота", open: "22:00", close: "04:00", closesNextDay: true },
    { day: 7, label: "Неділя", open: null, close: null, closesNextDay: false },
  ];

  it("Friday 23:59 → open, deep into the night before midnight", () => {
    const status = getOpenStatus(kyiv("2025-01-10T23:59"), TZ, overnightHours);
    expect(status.isOpen).toBe(true);
    if (status.isOpen) expect(status.closesAt).toBe("04:00");
  });

  it("Saturday 00:01 → still open, carried over from Friday's night", () => {
    const status = getOpenStatus(kyiv("2025-01-11T00:01"), TZ, overnightHours);
    expect(status.isOpen).toBe(true);
    if (status.isOpen) expect(status.closesAt).toBe("04:00");
  });

  it("Saturday 04:00 → closed, Friday's window has ended", () => {
    const status = getOpenStatus(kyiv("2025-01-11T04:00"), TZ, overnightHours);
    expect(status.isOpen).toBe(false);
  });
});

describe("the working week, read out of site.hours", () => {
  it("collapses six nights in a row into a range", () => {
    expect(formatWorkingDays()).toBe("Пн–Сб");
  });

  it("names the opening time only while every night shares one", () => {
    expect(openingTime()).toBe("18:00");
  });

  it("puts the two together the way the hero shows them", () => {
    expect(formatWeek()).toBe("Пн–Сб · 18:00");
  });

  it("agrees with the days site.hours actually marks as open", () => {
    const open = site.hours.filter((rule) => rule.open !== null);

    expect(open).toHaveLength(6);
    expect(open.map((rule) => rule.label)).toEqual([
      "Понеділок",
      "Вівторок",
      "Середа",
      "Четвер",
      "П'ятниця",
      "Субота",
    ]);
  });
});
