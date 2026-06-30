import { describe, it, expect } from "vitest";
import { selectActiveClass } from "./active-class";

const make = (id: number, startMinsAgo: number, endMinsFromNow: number, now: Date) => ({
  id,
  startTime: new Date(now.getTime() - startMinsAgo * 60_000),
  endTime:   new Date(now.getTime() + endMinsFromNow * 60_000),
});

describe("selectActiveClass", () => {
  const now = new Date("2026-06-30T10:00:00Z");

  it("returns null when no classes", () => {
    expect(selectActiveClass([], now)).toBeNull();
  });

  it("returns null when class hasn't started yet", () => {
    const cls = make(1, -5, 60, now); // starts 5 min in the future
    expect(selectActiveClass([cls], now)).toBeNull();
  });

  it("returns null when class already ended", () => {
    const cls = make(1, 90, -5, now); // ended 5 min ago
    expect(selectActiveClass([cls], now)).toBeNull();
  });

  it("returns active class", () => {
    const cls = make(1, 30, 30, now); // started 30 min ago, ends in 30
    expect(selectActiveClass([cls], now)).toEqual(cls);
  });

  it("returns most recently started when multiple active", () => {
    const earlier = make(1, 60, 30, now);
    const later   = make(2, 20, 30, now);
    expect(selectActiveClass([earlier, later], now)?.id).toBe(2);
  });
});
