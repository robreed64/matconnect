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
      { error: "Document storage not configured. Add Vercel Blob to your project in the Vercel dashboard." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid member" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";

  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(`waiver-documents/${memberId}-${Date.now()}.${ext}`, file, {
      access: "public",
    });
  } catch (err) {
    console.error("Vercel Blob upload failed:", err);
    return NextResponse.json({ error: "Upload failed — please try again" }, { status: 502 });
  }

  const member = await prisma.member.update({
    where: { id: memberId },
    data: { waiverSignedAt: new Date(), waiverDocumentUrl: blob.url },
  });

  return NextResponse.json({
    waiverDocumentUrl: member.waiverDocumentUrl,
    waiverSignedAt: member.waiverSignedAt?.toISOString(),
  });
}
