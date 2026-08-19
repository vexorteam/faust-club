import { describe, expect, it } from "vitest";
import { site } from "@/data/site";
import { formatStatus, formatWeek, formatWorkingDays, getOpenStatus, openingTime } from "./hours";

const TZ = "Europe/Kyiv";

const kyiv = (isoDateTimeLocal: string): Date => new Date(`${isoDateTimeLocal}:00+02:00`);

describe("getOpenStatus — boundary cases around midnight", () => {
  it("Friday 21:59 → still closed, opens at 22:00 today", () => {
    const status = getOpenStatus(kyiv("2025-01-10T21:59"), TZ);
    expect(status.isOpen).toBe(false);
    if (!status.isOpen) {
      expect(status.nextOpen.label).toBe("сьогодні");
      expect(status.nextOpen.time).toBe("22:00");
    }
  });

  it("Friday 22:00 → open, exactly at the threshold", () => {
    const status = getOpenStatus(kyiv("2025-01-10T22:00"), TZ);
    expect(status.isOpen).toBe(true);
  });

  it("Friday 23:59 → open (deep into the night, before midnight)", () => {
    const status = getOpenStatus(kyiv("2025-01-10T23:59"), TZ);
    expect(status.isOpen).toBe(true);
    if (status.isOpen) expect(status.closesAt).toBe("04:00");
  });

  it("Saturday 00:01 → still open, carried over from Friday's night", () => {
    const status = getOpenStatus(kyiv("2025-01-11T00:01"), TZ);
    expect(status.isOpen).toBe(true);
    if (status.isOpen) expect(status.closesAt).toBe("04:00");
  });

  it("Saturday 03:59 → still open, one minute before close", () => {
    const status = getOpenStatus(kyiv("2025-01-11T03:59"), TZ);
    expect(status.isOpen).toBe(true);
  });

  it("Saturday 04:00 → closed, Friday's window has ended", () => {
    const status = getOpenStatus(kyiv("2025-01-11T04:00"), TZ);
    expect(status.isOpen).toBe(false);
    if (!status.isOpen) {
      expect(status.nextOpen.label).toBe("сьогодні");
      expect(status.nextOpen.time).toBe("22:00");
    }
  });

  it("Saturday 04:01 → closed, same as 04:00", () => {
    const status = getOpenStatus(kyiv("2025-01-11T04:01"), TZ);
    expect(status.isOpen).toBe(false);
  });

  it("Sunday 12:00 → closed, next opening is Thursday", () => {
    const status = getOpenStatus(kyiv("2025-01-12T12:00"), TZ);
    expect(status.isOpen).toBe(false);
    if (!status.isOpen) {
      expect(status.nextOpen.label).toBe("четвер");
      expect(status.nextOpen.time).toBe("22:00");
    }
  });

  it("Monday 10:00 → closed, next opening is Thursday (label lowercased)", () => {
    const status = getOpenStatus(kyiv("2025-01-13T10:00"), TZ);
    expect(status.isOpen).toBe(false);
    if (!status.isOpen) {
      expect(status.nextOpen.label).toBe("четвер");
    }
  });

  it("formatStatus renders a human string for both states", () => {
    const open = getOpenStatus(kyiv("2025-01-10T23:00"), TZ);
    const closed = getOpenStatus(kyiv("2025-01-13T10:00"), TZ);
    expect(formatStatus(open)).toContain("Відчинено зараз");
    expect(formatStatus(closed)).toContain("Наступна ніч");
  });
});

/**
 * The hero used to say "П'ятниця · Субота · 22:00" and the About section
 * "7/7 днів на тиждень", while `site.hours` said Чт–Сб. Both lines are read out
 * of the data now, so this is the test that keeps them from drifting apart
 * again — including when the owner finally confirms the real schedule.
 */
describe("the working week, read out of site.hours", () => {
  it("collapses three nights in a row into a range", () => {
    expect(formatWorkingDays()).toBe("Чт–Сб");
  });

  it("names the opening time only while every night shares one", () => {
    expect(openingTime()).toBe("22:00");
  });

  it("puts the two together the way the hero shows them", () => {
    expect(formatWeek()).toBe("Чт–Сб · 22:00");
  });

  it("agrees with the days site.hours actually marks as open", () => {
    const open = site.hours.filter((rule) => rule.open !== null);

    expect(open).toHaveLength(3);
    expect(open.map((rule) => rule.label)).toEqual(["Четвер", "П'ятниця", "Субота"]);
  });
});
