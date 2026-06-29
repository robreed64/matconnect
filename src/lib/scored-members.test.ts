import { describe, it, expect, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/gym-settings", () => ({
  getGymSettings: vi.fn().mockResolvedValue({ trialLengthDays: 14 }),
}));

import { prisma } from "@/test/prisma-mock";
import { getScoredMembers, getMemberRisk } from "./scored-members";

const now = new Date("2026-06-29T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);

// Prisma's `groupBy` is a heavily-overloaded generic, so the deep-mock type
// doesn't expose `.mockResolvedValue` directly. This casts past that uniformly.
const resolve = (fn: unknown, value: unknown) =>
  (fn as unknown as Mock).mockResolvedValue(value);

describe("getScoredMembers", () => {
  it("scores members, sorts highest-risk first, and maps fields", async () => {
    // member 1: past_due + absent 50 days  → inactivity 50 + past_due 25 = 75 (high)
    // member 2: active, trained yesterday, steady frequency            → 0  (low)
    resolve(prisma.member.findMany, [
      { id: 1, name: "Bob Absent", photoUrl: null, beltRank: "blue", status: "past_due", createdAt: daysAgo(365), trialStartedAt: null },
      { id: 2, name: "Alice Active", photoUrl: "/a.jpg", beltRank: "purple", status: "active", createdAt: daysAgo(365), trialStartedAt: null },
    ]);

    resolve(prisma.attendance.groupBy, [
      { memberId: 1, _max: { timestamp: daysAgo(50) }, _count: { _all: 80 } },
      { memberId: 2, _max: { timestamp: daysAgo(1) }, _count: { _all: 200 } },
    ]);

    // windowed (last 60d) check-ins: only member 2 has any; balanced across halves
    const recent = [
      ...Array.from({ length: 10 }, () => ({ memberId: 2, timestamp: daysAgo(5) })),
      ...Array.from({ length: 10 }, () => ({ memberId: 2, timestamp: daysAgo(40) })),
    ];
    resolve(prisma.attendance.findMany, recent);
    resolve(prisma.techniqueProgress.groupBy, []);
    resolve(prisma.beltRequirement.findMany, []);

    const result = await getScoredMembers(now);

    expect(result.map((m) => m.id)).toEqual([1, 2]); // highest risk first
    expect(result[0]).toMatchObject({ id: 1, score: 75, band: "high", lastCheckInAt: daysAgo(50) });
    expect(result[0].reasons.map((r) => r.code).sort()).toEqual(["inactivity", "past_due"]);
    expect(result[1]).toMatchObject({ id: 2, score: 0, band: "low", photoUrl: "/a.jpg" });
    expect(result[1].reasons).toEqual([]);
  });

  it("uses the true last check-in (older than the 60-day window) instead of flagging 'never'", async () => {
    resolve(prisma.member.findMany, [
      { id: 7, name: "Gone Long", photoUrl: null, beltRank: null, status: "active", createdAt: daysAgo(400), trialStartedAt: null },
    ]);
    // last check-in 90 days ago — outside the 60d window, but groupBy still returns it
    resolve(prisma.attendance.groupBy, [
      { memberId: 7, _max: { timestamp: daysAgo(90) }, _count: { _all: 30 } },
    ]);
    resolve(prisma.attendance.findMany, []); // nothing in last 60d
    resolve(prisma.techniqueProgress.groupBy, []);
    resolve(prisma.beltRequirement.findMany, []);

    const result = await getScoredMembers(now);

    expect(result[0].reasons.map((r) => r.code)).toEqual(["inactivity"]); // not "never_checked_in"
    expect(result[0].score).toBe(50); // 46+ day tier
  });

  it("matches technique count and belt requirement to the member's current belt", async () => {
    resolve(prisma.member.findMany, [
      { id: 3, name: "Stalled Sam", photoUrl: null, beltRank: "blue", status: "active", createdAt: daysAgo(400), trialStartedAt: null },
    ]);
    resolve(prisma.attendance.groupBy, [
      { memberId: 3, _max: { timestamp: daysAgo(1) }, _count: { _all: 120 } },
    ]);
    resolve(prisma.attendance.findMany, []);
    // 5 techniques on current belt (blue), 99 on an old belt (white) — must use blue
    resolve(prisma.techniqueProgress.groupBy, [
      { memberId: 3, beltRank: "blue", _count: { _all: 5 } },
      { memberId: 3, beltRank: "white", _count: { _all: 99 } },
    ]);
    resolve(prisma.beltRequirement.findMany, [
      { beltRank: "blue", minMonths: 6, minTechniques: 20 },
    ]);

    const result = await getScoredMembers(now);

    expect(result[0].reasons.map((r) => r.code)).toContain("progression_stalled");
    expect(result[0].score).toBe(10);
  });

  it("returns [] when there are no current members (and skips follow-up queries)", async () => {
    resolve(prisma.member.findMany, []);

    const result = await getScoredMembers(now);

    expect(result).toEqual([]);
    expect(prisma.attendance.groupBy).not.toHaveBeenCalled();
  });
});

describe("getMemberRisk", () => {
  it("scores a single member (past_due + 50 days absent → 75 high)", async () => {
    resolve(prisma.member.findUnique, {
      status: "past_due", beltRank: "blue", createdAt: daysAgo(365), trialStartedAt: null,
    });
    resolve(prisma.attendance.aggregate, { _max: { timestamp: daysAgo(50) }, _count: { _all: 80 } });
    resolve(prisma.attendance.findMany, []); // nothing in last 60d
    resolve(prisma.techniqueProgress.count, 5);
    resolve(prisma.beltRequirement.findFirst, null);

    const risk = await getMemberRisk(1, now);

    expect(risk).not.toBeNull();
    expect(risk!.score).toBe(75);
    expect(risk!.band).toBe("high");
    expect(risk!.reasons.map((r) => r.code).sort()).toEqual(["inactivity", "past_due"]);
  });

  it("returns null when the member does not exist", async () => {
    resolve(prisma.member.findUnique, null);

    const risk = await getMemberRisk(999, now);

    expect(risk).toBeNull();
    expect(prisma.attendance.aggregate).not.toHaveBeenCalled();
  });
});
