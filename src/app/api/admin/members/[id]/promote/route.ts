import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextBelt } from "@/lib/belt-data";
import { requireAuth } from "@/lib/require-auth";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

type Params = Promise<{ id: string }>;

type WorkflowConfig = {
  channel: string;
  subject?: string;
  body: string;
  cooldown_days?: number;
};

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid member" }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const nextBelt = getNextBelt(member.beltRank);
  if (!nextBelt) return NextResponse.json({ error: "Already at highest belt" }, { status: 400 });

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { beltRank: nextBelt, beltStripes: 0 },
  });

  // Fire any active promotion workflows
  const workflows = await prisma.workflow.findMany({
    where: { triggerType: "promotion", active: true },
  });

  const now  = new Date();
  const vars = { name: member.name.split(" ")[0], belt: nextBelt };

  await Promise.all(
    workflows.map(async (wf) => {
      const config  = wf.config as WorkflowConfig;
      const subject = config.subject ? render(config.subject, vars) : null;
      const body    = render(config.body, vars);

      await prisma.message.create({
        data: { memberId, workflowId: wf.id, channel: config.channel, subject, body, sentAt: now },
      });

      try {
        if (config.channel === "email" && member.email) {
          await sendEmail(member.email, subject ?? "(no subject)", `<p>${body.replace(/\n/g, "<br>")}</p>`);
        } else if (config.channel === "sms" && member.phone) {
          await sendSMS(member.phone, body);
        }
      } catch (err) {
        console.error(`Promotion notification failed for member ${memberId}:`, err);
      }
    })
  );

  return NextResponse.json({ beltRank: updated.beltRank });
}
