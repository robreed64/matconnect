import { describe, it, expect } from "vitest";
import { scoreMember, bandFor, type RiskInput } from "./risk-scoring";

const now = new Date("2026-06-29T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);

// A healthy, regularly-training member: should score 0.
function base(overrides: Partial<RiskInput> = {}): RiskInput {
  return {
    status: "active",
    lastCheckInAt: daysAgo(2),
    checkins30d: 10,
    checkinsPrev30d: 10,
    totalCheckins: 100,
    createdAt: daysAgo(730),
    trialStartedAt: null,
    trialLengthDays: 14,
    beltRequirement: null,
    techniqueCount: 50,
    ...overrides,
  };
}

const codes = (r: { reasons: { code: string }[] }) => r.reasons.map((x) => x.code);

describe("scoreMember — clean member", () => {
  it("scores 0 with no reasons", () => {
    const r = scoreMember(base(), now);
    expect(r.score).toBe(0);
    expect(r.band).toBe("low");
    expect(r.reasons).toEqual([]);
  });
});

describe("scoreMember — inactivity tiers", () => {
  // checkinsPrev30d:0 disables the frequency-drop signal so inactivity is isolated
  const inactive = (days: number) =>
    scoreMember(base({ lastCheckInAt: daysAgo(days), checkinsPrev30d: 0, checkins30d: 0 }), now);

  it("7 days → no inactivity points", () => {
    expect(inactive(7).score).toBe(0);
  });
  it("8 days → 10 (low)", () => {
    const r = inactive(8);
    expect(r.score).toBe(10);
    expect(r.band).toBe("low");
    expect(r.reasons[0].label).toBe("No check-in in 8 days");
  });
  it("21 days → 20", () => {
    expect(inactive(21).score).toBe(20);
  });
  it("30 days → 30 (medium)", () => {
    const r = inactive(30);
    expect(r.score).toBe(30);
    expect(r.band).toBe("medium");
  });
  it("45 days → 40", () => {
    expect(inactive(45).score).toBe(40);
  });
  it("46+ days → 50", () => {
    expect(inactive(60).score).toBe(50);
  });
});

describe("scoreMember — never checked in", () => {
  it("active member past min tenure → 45", () => {
    const r = scoreMember(base({ lastCheckInAt: null, totalCheckins: 0, createdAt: daysAgo(100), checkinsPrev30d: 0, checkins30d: 0 }), now);
    expect(codes(r)).toContain("never_checked_in");
    expect(r.score).toBe(45);
  });
  it("brand-new active member (<= min tenure) is not penalised as 'never', only new-member", () => {
    const r = scoreMember(base({ lastCheckInAt: null, totalCheckins: 0, createdAt: daysAgo(10), checkinsPrev30d: 0, checkins30d: 0 }), now);
    expect(codes(r)).not.toContain("never_checked_in");
    expect(codes(r)).toContain("new_member_slow");
    expect(r.score).toBe(5);
  });
  it("'never' only applies to active members", () => {
    const r = scoreMember(base({ status: "inactive", lastCheckInAt: null, totalCheckins: 0, createdAt: daysAgo(100), checkinsPrev30d: 0, checkins30d: 0 }), now);
    expect(codes(r)).not.toContain("never_checked_in");
  });
});

describe("scoreMember — frequency drop", () => {
  it("major drop (<50% of prior) → 15", () => {
    const r = scoreMember(base({ checkins30d: 2, checkinsPrev30d: 10 }), now);
    expect(codes(r)).toContain("freq_drop_major");
    expect(r.score).toBe(15);
  });
  it("minor drop (<75% of prior) → 8", () => {
    const r = scoreMember(base({ checkins30d: 7, checkinsPrev30d: 10 }), now);
    expect(codes(r)).toContain("freq_drop_minor");
    expect(r.score).toBe(8);
  });
  it("does not fire when prior period had < 4 check-ins", () => {
    const r = scoreMember(base({ checkins30d: 0, checkinsPrev30d: 3 }), now);
    expect(codes(r)).not.toContain("freq_drop_major");
    expect(codes(r)).not.toContain("freq_drop_minor");
  });
});

describe("scoreMember — payment past due", () => {
  it("adds 25", () => {
    const r = scoreMember(base({ status: "past_due" }), now);
    expect(codes(r)).toEqual(["past_due"]);
    expect(r.score).toBe(25);
  });
  it("stacks with inactivity → high", () => {
    const r = scoreMember(base({ status: "past_due", lastCheckInAt: daysAgo(50), checkinsPrev30d: 0, checkins30d: 0 }), now);
    expect(r.score).toBe(75);
    expect(r.band).toBe("high");
    expect(codes(r).sort()).toEqual(["inactivity", "past_due"]);
  });
});

describe("scoreMember — trial ending", () => {
  it("fires within window with low engagement (singular day label)", () => {
    const r = scoreMember(base({ status: "trial", trialStartedAt: daysAgo(13), trialLengthDays: 14, totalCheckins: 1, lastCheckInAt: daysAgo(1), createdAt: daysAgo(13) }), now);
    const trial = r.reasons.find((x) => x.code === "trial_ending");
    expect(trial).toBeTruthy();
    expect(trial!.label).toBe("Trial ends in 1 day, low engagement");
  });
  it("does not fire when trial is not near expiry", () => {
    const r = scoreMember(base({ status: "trial", trialStartedAt: daysAgo(2), trialLengthDays: 14, totalCheckins: 1, lastCheckInAt: daysAgo(1), createdAt: daysAgo(2) }), now);
    expect(codes(r)).not.toContain("trial_ending");
  });
  it("does not fire when the member is engaged (enough check-ins)", () => {
    const r = scoreMember(base({ status: "trial", trialStartedAt: daysAgo(12), trialLengthDays: 14, totalCheckins: 5, lastCheckInAt: daysAgo(1), createdAt: daysAgo(12) }), now);
    expect(codes(r)).not.toContain("trial_ending");
  });
});

describe("scoreMember — progression stalled", () => {
  const req = { minMonths: 6, minTechniques: 20 };
  it("fires when eligible by tenure but under technique count", () => {
    const r = scoreMember(base({ beltRequirement: req, createdAt: daysAgo(250), techniqueCount: 5, checkinsPrev30d: 0, checkins30d: 0 }), now);
    expect(codes(r)).toContain("progression_stalled");
    expect(r.score).toBe(10);
  });
  it("does not fire when technique count meets the requirement", () => {
    const r = scoreMember(base({ beltRequirement: req, createdAt: daysAgo(250), techniqueCount: 25 }), now);
    expect(codes(r)).not.toContain("progression_stalled");
  });
  it("does not fire before the member is eligible by tenure", () => {
    const r = scoreMember(base({ beltRequirement: req, createdAt: daysAgo(30), techniqueCount: 0 }), now);
    expect(codes(r)).not.toContain("progression_stalled");
  });
});

describe("scoreMember — new member slow start", () => {
  it("fires for recent joiners with few check-ins", () => {
    const r = scoreMember(base({ createdAt: daysAgo(10), totalCheckins: 2, lastCheckInAt: daysAgo(1), checkinsPrev30d: 0, checkins30d: 2 }), now);
    expect(codes(r)).toEqual(["new_member_slow"]);
    expect(r.score).toBe(5);
  });
});

describe("scoreMember — combined high-risk case", () => {
  it("stacks to exactly 100 and stays clamped", () => {
    const r = scoreMember(
      base({
        status: "past_due",
        lastCheckInAt: daysAgo(50), // inactivity 50
        checkins30d: 0,
        checkinsPrev30d: 10, // freq major 15
        beltRequirement: { minMonths: 6, minTechniques: 20 },
        createdAt: daysAgo(365), // eligible by tenure
        techniqueCount: 0, // progression 10
        // past_due 25
      }),
      now
    );
    expect(r.score).toBe(100); // 50 + 15 + 25 + 10
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.band).toBe("high");
    expect(codes(r).sort()).toEqual(["freq_drop_major", "inactivity", "past_due", "progression_stalled"]);
  });
});

describe("bandFor", () => {
  it("maps scores to bands at the boundaries", () => {
    expect(bandFor(0)).toBe("low");
    expect(bandFor(29)).toBe("low");
    expect(bandFor(30)).toBe("medium");
    expect(bandFor(59)).toBe("medium");
    expect(bandFor(60)).toBe("high");
    expect(bandFor(100)).toBe("high");
  });
});
