// Data layer for churn risk scoring: assembles RiskInput for current members
// from Prisma and runs them through the pure `scoreMember` core.
//
// Kept separate from risk-scoring.ts so the scoring logic stays DB-free and
// fast to unit-test. See docs/CHURN_SCORING_PLAN.md (Step 2).

import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import { scoreMember, type RiskInput, type MemberRisk } from "@/lib/risk-scoring";

const DAY_MS = 24 * 60 * 60 * 1000;

// Statuses worth scoring — current members who can still churn.
// Excludes canceled / inactive / lead.
export const SCORED_STATUSES = ["active", "trial", "past_due"] as const;

export type ScoredMember = MemberRisk & {
  id: number;
  name: string;
  photoUrl: string | null;
  beltRank: string | null;
  status: string;
  lastCheckInAt: Date | null;
};

/**
 * Returns every current member scored for churn risk, highest risk first.
 * `now` is injectable for testing/determinism.
 */
export async function getScoredMembers(now: Date = new Date()): Promise<ScoredMember[]> {
  const settings = await getGymSettings();

  const members = await prisma.member.findMany({
    where: { status: { in: [...SCORED_STATUSES] } },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      beltRank: true,
      status: true,
      createdAt: true,
      trialStartedAt: true,
    },
  });
  if (members.length === 0) return [];

  const ids = members.map((m) => m.id);

  // Last check-in + lifetime total per member (covers check-ins older than the
  // 60-day window, so "never checked in" is never falsely triggered).
  const agg = await prisma.attendance.groupBy({
    by: ["memberId"],
    where: { memberId: { in: ids } },
    _max: { timestamp: true },
    _count: { _all: true },
  });
  const lastById = new Map<number, Date | null>();
  const totalById = new Map<number, number>();
  for (const a of agg) {
    lastById.set(a.memberId, a._max.timestamp ?? null);
    totalById.set(a.memberId, a._count._all);
  }

  // Windowed check-ins (last 60 days) bucketed into current vs prior 30 days.
  const sixtyAgo = new Date(now.getTime() - 60 * DAY_MS);
  const thirtyAgo = new Date(now.getTime() - 30 * DAY_MS);
  const recent = await prisma.attendance.findMany({
    where: { memberId: { in: ids }, timestamp: { gte: sixtyAgo } },
    select: { memberId: true, timestamp: true },
  });
  const c30 = new Map<number, number>();
  const cPrev = new Map<number, number>();
  for (const a of recent) {
    const map = a.timestamp >= thirtyAgo ? c30 : cPrev;
    map.set(a.memberId, (map.get(a.memberId) ?? 0) + 1);
  }

  // Technique progress count per (member, belt) — matched to current belt below.
  const techGroups = await prisma.techniqueProgress.groupBy({
    by: ["memberId", "beltRank"],
    where: { memberId: { in: ids } },
    _count: { _all: true },
  });
  const techByMemberBelt = new Map<string, number>();
  for (const t of techGroups) {
    techByMemberBelt.set(`${t.memberId}:${t.beltRank}`, t._count._all);
  }

  // Belt requirements keyed by belt rank.
  const reqs = await prisma.beltRequirement.findMany();
  const reqByBelt = new Map<string, { minMonths: number; minTechniques: number }>();
  for (const r of reqs) {
    reqByBelt.set(r.beltRank, { minMonths: r.minMonths, minTechniques: r.minTechniques });
  }

  const scored: ScoredMember[] = members.map((m) => {
    const lastCheckInAt = lastById.get(m.id) ?? null;
    const input: RiskInput = {
      status: m.status,
      lastCheckInAt,
      checkins30d: c30.get(m.id) ?? 0,
      checkinsPrev30d: cPrev.get(m.id) ?? 0,
      totalCheckins: totalById.get(m.id) ?? 0,
      createdAt: m.createdAt,
      trialStartedAt: m.trialStartedAt,
      trialLengthDays: settings.trialLengthDays,
      beltRequirement: m.beltRank ? reqByBelt.get(m.beltRank) ?? null : null,
      techniqueCount: m.beltRank ? techByMemberBelt.get(`${m.id}:${m.beltRank}`) ?? 0 : 0,
    };
    const risk = scoreMember(input, now);
    return {
      id: m.id,
      name: m.name,
      photoUrl: m.photoUrl,
      beltRank: m.beltRank,
      status: m.status,
      lastCheckInAt,
      ...risk,
    };
  });

  // Highest risk first; stable tiebreak by name.
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored;
}

/**
 * Score a single member for churn risk. Returns null if the member doesn't
 * exist. Works for any status (the caller decides whether to show it).
 * `now` is injectable for testing/determinism.
 */
export async function getMemberRisk(memberId: number, now: Date = new Date()): Promise<MemberRisk | null> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { status: true, beltRank: true, createdAt: true, trialStartedAt: true },
  });
  if (!member) return null;

  const settings = await getGymSettings();
  const sixtyAgo = new Date(now.getTime() - 60 * DAY_MS);
  const thirtyAgo = new Date(now.getTime() - 30 * DAY_MS);

  const [agg, recent, techniqueCount, requirement] = await Promise.all([
    prisma.attendance.aggregate({ where: { memberId }, _max: { timestamp: true }, _count: { _all: true } }),
    prisma.attendance.findMany({ where: { memberId, timestamp: { gte: sixtyAgo } }, select: { timestamp: true } }),
    member.beltRank
      ? prisma.techniqueProgress.count({ where: { memberId, beltRank: member.beltRank } })
      : Promise.resolve(0),
    member.beltRank
      ? prisma.beltRequirement.findFirst({ where: { beltRank: member.beltRank } })
      : Promise.resolve(null),
  ]);

  let checkins30d = 0;
  let checkinsPrev30d = 0;
  for (const a of recent) {
    if (a.timestamp >= thirtyAgo) checkins30d++;
    else checkinsPrev30d++;
  }

  return scoreMember(
    {
      status: member.status,
      lastCheckInAt: agg._max.timestamp ?? null,
      checkins30d,
      checkinsPrev30d,
      totalCheckins: agg._count._all,
      createdAt: member.createdAt,
      trialStartedAt: member.trialStartedAt,
      trialLengthDays: settings.trialLengthDays,
      beltRequirement: requirement
        ? { minMonths: requirement.minMonths, minTechniques: requirement.minTechniques }
        : null,
      techniqueCount,
    },
    now
  );
}
