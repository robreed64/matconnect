import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";

export async function GET() {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { name: true, email: true, phone: true, address: true, photoUrl: true },
  });
  return NextResponse.json(member);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const body = await req.json();
  const data: Record<string, string | null> = {};
  if (body.name  !== undefined) data.name  = String(body.name).trim();
  if (body.email !== undefined) data.email = String(body.email).trim().toLowerCase();
  if (body.phone !== undefined) data.phone = String(body.phone).trim();
  if (body.address !== undefined) data.address = String(body.address).trim() || null;

  if (!data.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const member = await prisma.member.update({ where: { id: memberId }, data });

  if (body.email !== undefined || body.name !== undefined) {
    await prisma.user.updateMany({
      where: { memberId },
      data: {
        ...(body.email !== undefined && { email: data.email! }),
        ...(body.name  !== undefined && { name: data.name! }),
      },
    });
  }

  return NextResponse.json({ success: true, member });
}
