import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth("settings");
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const data: { name?: string; enabled?: boolean } = {};
  if (typeof body.name    === "string")  data.name    = body.name.trim();
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data,
    select: { id: true, name: true, prefix: true, lastUsedAt: true, enabled: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth("settings");
  if (error) return error;

  const { id } = await params;
  await prisma.apiKey.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
