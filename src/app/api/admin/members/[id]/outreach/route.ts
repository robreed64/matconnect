import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

type Params = Promise<{ id: string }>;

// Mirrors the {{var}} templating used by the automated workflow engine.
function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// One-off, manually-triggered outreach to a single member (e.g. from the
// at-risk / retention view). The automated, segment-based layer lives in
// src/lib/marketing-triggers.ts — this is the targeted manual nudge.
export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("marketing");
  if (error) return error;

  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  const channel = payload?.channel;
  const subject = typeof payload?.subject === "string" ? payload.subject.trim() : "";
  const messageBody = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (channel !== "email" && channel !== "sms") {
    return NextResponse.json({ error: "Channel must be email or sms" }, { status: 400 });
  }
  if (!messageBody) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }
  if (channel === "email" && !subject) {
    return NextResponse.json({ error: "Subject is required for email" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (channel === "email" && !member.email) {
    return NextResponse.json({ error: "Member has no email address" }, { status: 400 });
  }
  if (channel === "sms" && !member.phone) {
    return NextResponse.json({ error: "Member has no phone number" }, { status: 400 });
  }

  const vars = { name: member.name.split(" ")[0], full_name: member.name };
  const renderedSubject = subject ? render(subject, vars) : null;
  const renderedBody = render(messageBody, vars);

  // Log first so the message shows in history even if delivery fails.
  await prisma.message.create({
    data: {
      memberId: member.id,
      channel,
      subject: renderedSubject,
      body: renderedBody,
      sentAt: new Date(),
      workflowId: null,
    },
  });

  try {
    if (channel === "email") {
      await sendEmail(member.email!, renderedSubject ?? "(no subject)", `<p>${renderedBody.replace(/\n/g, "<br>")}</p>`);
    } else {
      await sendSMS(member.phone!, renderedBody);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Delivery failed";
    return NextResponse.json({ error: `Logged, but delivery failed: ${msg}` }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
