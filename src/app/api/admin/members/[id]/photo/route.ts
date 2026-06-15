import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Photo storage not configured. Add Vercel Blob to your project in the Vercel dashboard." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid member" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 4 MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";

  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(`member-photos/${memberId}-${Date.now()}.${ext}`, file, {
      access: "public",
    });
  } catch (err) {
    console.error("Vercel Blob upload failed:", err);
    return NextResponse.json({ error: "Photo upload failed — please try again" }, { status: 502 });
  }

  await prisma.member.update({ where: { id: memberId }, data: { photoUrl: blob.url } });

  return NextResponse.json({ photoUrl: blob.url });
}
