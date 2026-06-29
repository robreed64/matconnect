import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/marketing-triggers", () => ({
  runAllActiveWorkflows: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/retention-digest", () => ({
  sendRetentionDigest: vi.fn().mockResolvedValue({ recipients: 1, high: 1, medium: 0, sent: 1 }),
}));

import { sendRetentionDigest } from "@/lib/retention-digest";
import { GET } from "./route";

const SECRET = "test-secret";

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.CRON_SECRET;
});

const authed = () =>
  new Request("http://localhost/api/cron/marketing", { headers: { authorization: `Bearer ${SECRET}` } });

describe("GET /api/cron/marketing", () => {
  it("rejects requests without the cron secret", async () => {
    const res = await GET(new Request("http://localhost/api/cron/marketing"));
    expect(res.status).toBe(401);
  });

  it("runs the retention digest on Mondays", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T14:00:00Z")); // Monday

    const res = await GET(authed());
    const body = await res.json();

    expect(sendRetentionDigest).toHaveBeenCalled();
    expect(body.digest).toMatchObject({ sent: 1 });
  });

  it("skips the digest on other days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T14:00:00Z")); // Tuesday

    const res = await GET(authed());
    const body = await res.json();

    expect(sendRetentionDigest).not.toHaveBeenCalled();
    expect(body.digest).toBeNull();
  });
});
