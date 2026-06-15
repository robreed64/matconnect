import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";

export async function POST(req: NextRequest) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Photo storage not configured. Contact your gym administrator." },
      { status: 503 }
    );
  }

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
