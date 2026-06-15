import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { sendPushToAll, sendPushToUser } from "@/lib/web-push";

export async function POST(req: Request) {
  const { error } = await requireAuth("marketing");
  if (error) return error;

  const { title, body, url, userId } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }

  const payload = { title: title.trim(), body: body.trim(), url: url ?? "/" };

  let sent: number;
  let memberIds: number[] = [];

  if (userId) {
    sent = await sendPushToUser(Number(userId), payload);
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { memberId: true },
    });
    if (user?.memberId) memberIds = [user.memberId];
  } else {
    sent = await sendPushToAll(payload);
    const users = await prisma.user.findMany({
      where:  { pushSubscriptions: { some: {} } },
      select: { memberId: true },
    });
    memberIds = users.flatMap(u => (u.memberId != null ? [u.memberId] : []));
  }

  // Log to Message table so the history and member home card can show it
  if (memberIds.length > 0) {
    await prisma.message.createMany({
      data: memberIds.map(memberId => ({
        memberId,
        channel: "push",
        subject: title.trim(),
        body:    body.trim(),
        sentAt:  new Date(),
      })),
    });
  }

  return NextResponse.json({ sent });
}
