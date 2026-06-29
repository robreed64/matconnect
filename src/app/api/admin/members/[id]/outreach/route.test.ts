import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/require-auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ session: { user: { role: "admin" } } }),
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/sms", () => ({ sendSMS: vi.fn() }));

import { prisma } from "@/test/prisma-mock";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { POST } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) =>
  new NextRequest("http://localhost/api/admin/members/1/outreach", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/admin/members/[id]/outreach", () => {
  it("sends an email, rendering {{name}} to the first name, and logs it", async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 1, name: "Jane Doe", email: "jane@x.com", phone: null } as never);
    prisma.message.create.mockResolvedValue({ id: 9 } as never);

    const res = await POST(req({ channel: "email", subject: "Hi {{name}}", body: "Come back {{name}}!" }), params("1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(sendEmail).toHaveBeenCalledWith("jane@x.com", "Hi Jane", expect.stringContaining("Come back Jane!"));
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ memberId: 1, channel: "email", subject: "Hi Jane", workflowId: null }) })
    );
  });

  it("sends an SMS", async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 1, name: "Sam Lee", email: null, phone: "+15551234567" } as never);
    prisma.message.create.mockResolvedValue({ id: 10 } as never);

    const res = await POST(req({ channel: "sms", body: "Hey {{name}}" }), params("1"));

    expect(res.status).toBe(200);
    expect(sendSMS).toHaveBeenCalledWith("+15551234567", "Hey Sam");
  });

  it("rejects an unknown channel", async () => {
    const res = await POST(req({ channel: "carrier-pigeon", body: "hi" }), params("1"));
    expect(res.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("requires a subject for email", async () => {
    const res = await POST(req({ channel: "email", body: "hi" }), params("1"));
    expect(res.status).toBe(400);
  });

  it("404s when the member is missing", async () => {
    prisma.member.findUnique.mockResolvedValue(null as never);
    const res = await POST(req({ channel: "sms", body: "hi" }), params("1"));
    expect(res.status).toBe(404);
  });

  it("400s when the channel's contact method is missing", async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 1, name: "No Phone", email: "a@b.com", phone: null } as never);
    const res = await POST(req({ channel: "sms", body: "hi" }), params("1"));
    expect(res.status).toBe(400);
    expect(sendSMS).not.toHaveBeenCalled();
  });
});
