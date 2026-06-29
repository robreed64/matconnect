// Churn risk scoring — pure, dependency-free logic.
//
// `scoreMember` turns a member's signals into an explainable 0–100 churn risk
// score with a human-readable reason per contributing signal. It has no DB or
// time dependency (callers pass `now`), so it is fully unit-testable. The data
// layer that assembles `RiskInput` from Prisma lives elsewhere (Step 2).
//
// Weights and thresholds are exported config so they can be tuned against real
// churn data later (see docs/CHURN_SCORING_PLAN.md §9). They are starting
// heuristics, not validated against cancellations yet.

export type RiskBand = "low" | "medium" | "high";

export type RiskReason = {
  /** stable identifier for the signal (for UI keys / analytics) */
  code: string;
  /** human-readable explanation, e.g. "No check-in in 24 days" */
  label: string;
  /** points this signal contributed to the score */
  points: number;
};

export type MemberRisk = {
  score: number;
  band: RiskBand;
  reasons: RiskReason[];
};

/** Everything `scoreMember` needs, pre-computed by the caller. */
export type RiskInput = {
  /** Member.status — 'active' | 'trial' | 'past_due' | ... */
  status: string;
  /** timestamp of most recent check-in, or null if they have never attended */
  lastCheckInAt: Date | null;
  /** check-ins in the last 30 days */
  checkins30d: number;
  /** check-ins in the 30 days before that (days 31–60) */
  checkinsPrev30d: number;
  /** total check-ins ever */
  totalCheckins: number;
  /** Member.createdAt — used for tenure */
  createdAt: Date;
  /** Member.trialStartedAt — null unless on a trial */
  trialStartedAt: Date | null;
  /** GymSettings.trialLengthDays */
  trialLengthDays: number;
  /** requirement row for the member's current belt, or null if none configured */
  beltRequirement: { minMonths: number; minTechniques: number } | null;
  /** number of techniques the member has progressed on */
  techniqueCount: number;
};

/** Point values per signal. Tune these; keep them in one place. */
export const RISK_WEIGHTS = {
  inactivity: { d8_14: 10, d15_21: 20, d22_30: 30, d31_45: 40, d46plus: 50, never: 45 },
  freqDropMajor: 15,
  freqDropMinor: 8,
  pastDue: 25,
  trialEnding: 20,
  progressionStalled: 10,
  newMemberSlowStart: 5,
} as const;

/** Cutoffs that decide whether a signal fires (not point values). */
export const RISK_THRESHOLDS = {
  /** "never checked in" only counts once a member has been around this long */
  neverCheckedInMinTenureDays: 14,
  /** frequency-drop signals require at least this many prior-period check-ins */
  freqDropMinPrior: 4,
  freqDropMajorRatio: 0.5,
  freqDropMinorRatio: 0.75,
  /** trial-ending signal: within N days of expiry and under M total check-ins */
  trialEndingWindowDays: 3,
  trialEndingMaxCheckins: 3,
  /** new-member signal: under N days tenure and under M total check-ins */
  newMemberMaxTenureDays: 30,
  newMemberMaxCheckins: 4,
} as const;

/** Score >= high → "high"; >= medium → "medium"; else "low". */
export const RISK_BANDS = { medium: 30, high: 60 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30.44 * DAY_MS;

export function bandFor(score: number): RiskBand {
  if (score >= RISK_BANDS.high) return "high";
  if (score >= RISK_BANDS.medium) return "medium";
  return "low";
}

export function scoreMember(input: RiskInput, now: Date = new Date()): MemberRisk {
  const reasons: RiskReason[] = [];
  const add = (code: string, label: string, points: number) => {
    if (points > 0) reasons.push({ code, label, points });
  };

  const tenureDays = Math.floor((now.getTime() - input.createdAt.getTime()) / DAY_MS);

  // ── 1. Inactivity (primary signal) ──────────────────────────────────────────
  if (input.lastCheckInAt === null) {
    if (input.status === "active" && tenureDays > RISK_THRESHOLDS.neverCheckedInMinTenureDays) {
      add("never_checked_in", "Never checked in", RISK_WEIGHTS.inactivity.never);
    }
  } else {
    const daysSince = Math.floor((now.getTime() - input.lastCheckInAt.getTime()) / DAY_MS);
    const w = RISK_WEIGHTS.inactivity;
    let points = 0;
    if (daysSince >= 46) points = w.d46plus;
    else if (daysSince >= 31) points = w.d31_45;
    else if (daysSince >= 22) points = w.d22_30;
    else if (daysSince >= 15) points = w.d15_21;
    else if (daysSince >= 8) points = w.d8_14;
    add("inactivity", `No check-in in ${daysSince} day${daysSince === 1 ? "" : "s"}`, points);
  }

  // ── 2. Frequency drop ───────────────────────────────────────────────────────
  if (input.checkinsPrev30d >= RISK_THRESHOLDS.freqDropMinPrior) {
    const ratio = input.checkins30d / input.checkinsPrev30d;
    if (ratio < RISK_THRESHOLDS.freqDropMajorRatio) {
      add("freq_drop_major", "Training down 50%+ vs last month", RISK_WEIGHTS.freqDropMajor);
    } else if (ratio < RISK_THRESHOLDS.freqDropMinorRatio) {
      add("freq_drop_minor", "Training frequency declining", RISK_WEIGHTS.freqDropMinor);
    }
  }

  // ── 3. Payment past due ─────────────────────────────────────────────────────
  if (input.status === "past_due") {
    add("past_due", "Payment past due", RISK_WEIGHTS.pastDue);
  }

  // ── 4. Trial ending with low engagement ─────────────────────────────────────
  if (input.status === "trial" && input.trialStartedAt) {
    const expiry = input.trialStartedAt.getTime() + input.trialLengthDays * DAY_MS;
    const daysLeft = Math.ceil((expiry - now.getTime()) / DAY_MS);
    if (
      daysLeft >= 0 &&
      daysLeft <= RISK_THRESHOLDS.trialEndingWindowDays &&
      input.totalCheckins < RISK_THRESHOLDS.trialEndingMaxCheckins
    ) {
      add("trial_ending", `Trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}, low engagement`, RISK_WEIGHTS.trialEnding);
    }
  }

  // ── 5. Progression stalled (approximate — no promotion timestamp exists) ─────
  if (input.beltRequirement) {
    const tenureMonths = (now.getTime() - input.createdAt.getTime()) / MONTH_MS;
    if (
      tenureMonths >= input.beltRequirement.minMonths &&
      input.techniqueCount < input.beltRequirement.minTechniques
    ) {
      add("progression_stalled", "Eligible to progress but stalled", RISK_WEIGHTS.progressionStalled);
    }
  }

  // ── 6. New member, slow start ────────────────────────────────────────────────
  if (
    tenureDays < RISK_THRESHOLDS.newMemberMaxTenureDays &&
    input.totalCheckins < RISK_THRESHOLDS.newMemberMaxCheckins
  ) {
    add("new_member_slow", "New member, slow start", RISK_WEIGHTS.newMemberSlowStart);
  }

  const raw = reasons.reduce((sum, r) => sum + r.points, 0);
  const score = Math.min(100, raw);

  return { score, band: bandFor(score), reasons };
}
