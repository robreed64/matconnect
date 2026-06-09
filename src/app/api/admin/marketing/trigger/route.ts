import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

type WorkflowConfig = {
  channel:        string;
  subject?:       string;
  body:           string;
  inactivity_days?: number;
  trial_classes?:   number;
  cooldown_days?:   number;
};

type Target = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  vars: Record<string, string>;
};

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// Returns members who were already messaged by this workflow within cooldown window
async function recentlyMessaged(workflowId: number, memberIds: number[], cooldownDays: number) {
  const cutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);
  const recent = await prisma.message.findMany({
    where: { workflowId, memberId: { in: memberIds }, sentAt: { gte: cutoff } },
    select: { memberId: true },
  });
  return new Set(recent.map((m) => m.memberId));
}

async function deliver(channel: string, target: Target, subject: string | null, body: string) {
  if (channel === "email" && target.email) {
    await sendEmail(target.email, subject ?? "(no subject)", `<p>${body.replace(/\n/g, "<br>")}</p>`);
  } else if (channel === "sms" && target.phone) {
    await sendSMS(target.phone, body);
  }
}

export async function POST(req: Request) {
  const { error } = await requireAuth("marketing");
  if (error) return error;

  const { workflowId } = await req.json();

  const workflow = await prisma.workflow.findUnique({ where: { id: Number(workflowId) } });
  if (!workflow || !workflow.active) {
    return NextResponse.json({ error: "Workflow not found or inactive" }, { status: 400 });
  }

  const config    = workflow.config as WorkflowConfig;
  const cooldown  = config.cooldown_days ?? 30;
  const now       = new Date();
  let   targets: Target[] = [];

  // ── Inactivity ──────────────────────────────────────────────────────────────
  if (workflow.triggerType === "inactivity") {
    const days   = config.inactivity_days ?? 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const members = await prisma.member.findMany({
      where: {
        status: "active",
        attendance: { none: { timestamp: { gte: cutoff } } },
      },
      select: { id: true, name: true, email: true, phone: true, attendance: { orderBy: { timestamp: "desc" }, take: 1 } },
    });

    targets = members.map((m) => {
      const last   = m.attendance[0]?.timestamp;
      const daysAgo = last
        ? Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
        : days;
      return { id: m.id, name: m.name, email: m.email, phone: m.phone, vars: { name: m.name.split(" ")[0], days: String(daysAgo) } };
    });
  }

  // ── Trial attendance ─────────────────────────────────────────────────────────
  if (workflow.triggerType === "trial_attendance") {
    const minClasses = config.trial_classes ?? 3;
    const members = await prisma.member.findMany({
      where: { status: "trial" },
      include: { _count: { select: { attendance: true } } },
    });
    const eligible = members.filter((m) => m._count.attendance >= minClasses);
    targets = eligible.map((m) => ({
      id: m.id, name: m.name, email: m.email, phone: m.phone,
      vars: { name: m.name.split(" ")[0], classes: String(m._count.attendance) },
    }));
  }

  // ── Birthday ─────────────────────────────────────────────────────────────────
  if (workflow.triggerType === "birthday") {
    const month = now.getMonth() + 1;
    const day   = now.getDate();
    const members = await prisma.$queryRaw<{ id: number; name: string; email: string | null; phone: string | null }[]>`
      SELECT id, name, email, phone FROM members
      WHERE date_of_birth IS NOT NULL
        AND EXTRACT(MONTH FROM date_of_birth) = ${month}
        AND EXTRACT(DAY   FROM date_of_birth) = ${day}
    `;
    targets = members.map((m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, vars: { name: m.name.split(" ")[0] } }));
  }

  // ── Failed payment ───────────────────────────────────────────────────────────
  if (workflow.triggerType === "failed_payment") {
    const members = await prisma.member.findMany({
      where:  { status: "past_due" },
      select: { id: true, name: true, email: true, phone: true },
    });
    targets = members.map((m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, vars: { name: m.name.split(" ")[0] } }));
  }

  // ── Promotion ────────────────────────────────────────────────────────────────
  // Promotion is event-driven; the trigger endpoint is called directly with memberId + belt
  if (workflow.triggerType === "promotion") {
    return NextResponse.json({ sent: 0, skipped: 0, note: "Promotion workflows fire on individual promote events." });
  }

  if (targets.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0 });
  }

  // Filter out members messaged within cooldown window
  const spamSet = await recentlyMessaged(workflow.id, targets.map((t) => t.id), cooldown);
  const eligible = targets.filter((t) => !spamSet.has(t.id));

  // Create message records and deliver
  let sent = 0;
  await Promise.all(
    eligible.map(async (t) => {
      const subject = config.subject ? render(config.subject, t.vars) : null;
      const body    = render(config.body, t.vars);

      await prisma.message.create({
        data: { memberId: t.id, workflowId: workflow.id, channel: config.channel, subject, body, sentAt: now },
      });

      try {
        await deliver(config.channel, t, subject, body);
        sent++;
      } catch (err) {
        console.error(`Delivery failed for member ${t.id}:`, err);
      }
    })
  );

  return NextResponse.json({ sent, skipped: targets.length - eligible.length });
}
