import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { createApiKey } from "@/lib/api-keys";

export async function GET() {
  const { error } = await requireAuth("settings");
  if (error) return error;

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, enabled: true, createdAt: true },
  });

  return NextResponse.json(keys);
}

export async function POST(req: Request) {
  const { error } = await requireAuth("settings");
  if (error) return error;

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { record, rawKey } = await createApiKey(name.trim());

  return NextResponse.json(
    { id: record.id, name: record.name, prefix: record.prefix, rawKey },
    { status: 201 }
  );
}
