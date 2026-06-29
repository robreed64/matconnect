import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/gym-settings", () => ({
  getGymSettings: vi.fn().mockResolvedValue({ gymName: "Test Gym", gymEmail: "gym@x.com" }),
}));
vi.mock("@/lib/scored-members", () => ({ getScoredMembers: vi.fn() }));

import { prisma } from "@/test/prisma-mock";
import { sendEmail } from "@/lib/email";
import { getGymSettings } from "@/lib/gym-settings";
import { getScoredMembers } from "@/lib/scored-members";
import { sendRetentionDigest } from "./retention-digest";
import type { ScoredMember } from "@/lib/scored-members";

const member = (over: Partial<ScoredMember>): ScoredMember => ({
  id: 1, name: "A", photoUrl: null, beltRank: null, status: "active",
  lastCheckInAt: null, score: 0, band: "low", reasons: [], ...over,
});

describe("sendRetentionDigest", () => {
  it("emails admins/managers + gym email (deduped) with high/medium counts", async () => {
    vi.mocked(getScoredMembers).mockResolvedValue([
      member({ id: 1, name: "High Risk", score: 75, band: "high", reasons: [{ code: "inactivity", label: "No check-in in 50 days", points: 50 }] }),
      member({ id: 2, name: "Med Risk", score: 30, band: "medium" }),
      member({ id: 3, name: "Fine", score: 0, band: "low" }),
    ]);
    prisma.user.findMany.mockResolvedValue([{ email: "admin@x.com" }, { email: "mgr@x.com" }] as never);

    const res = await sendRetentionDigest(new Date("2026-06-29T12:00:00Z"));

    expect(res).toMatchObject({ high: 1, medium: 1, recipients: 3, sent: 3 });
    expect(sendEmail).toHaveBeenCalledTimes(3);
    const [, subject, html] = vi.mocked(sendEmail).mock.calls[0];
    expect(subject).toContain("1 high, 1 medium");
    expect(html).toContain("High Risk");
    expect(html).toContain("No check-in in 50 days");
    expect(html).not.toContain("Fine"); // low band excluded from the list
  });

  it("does nothing when no members are at risk", async () => {
    vi.mocked(getScoredMembers).mockResolvedValue([member({ band: "low" })]);

    const res = await sendRetentionDigest();

    expect(res).toMatchObject({ sent: 0, note: "no at-risk members" });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("dedupes the gym email against staff emails", async () => {
    vi.mocked(getScoredMembers).mockResolvedValue([member({ id: 1, name: "H", score: 75, band: "high" })]);
    prisma.user.findMany.mockResolvedValue([{ email: "gym@x.com" }] as never); // same as gymEmail

    const res = await sendRetentionDigest();

    expect(res.recipients).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("reports when there are at-risk members but no recipients", async () => {
    vi.mocked(getScoredMembers).mockResolvedValue([member({ id: 1, band: "high", score: 75 })]);
    vi.mocked(getGymSettings).mockResolvedValueOnce({ gymName: "Test Gym", gymEmail: null } as never);
    prisma.user.findMany.mockResolvedValue([] as never);

    const res = await sendRetentionDigest();

    expect(res).toMatchObject({ high: 1, sent: 0, recipients: 0, note: "no admin/manager recipients" });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
