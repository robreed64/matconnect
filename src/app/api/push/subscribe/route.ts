import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = parseInt((session.user as { id?: string }).id ?? "", 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "User ID not found in session" }, { status: 400 });
  }

  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = parseInt((session.user as { id: string }).id, 10);

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });

  return NextResponse.json({ ok: true });
}
