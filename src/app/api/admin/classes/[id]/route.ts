import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("schedule");
  if (error) return error;

  const { id } = await params;
  const classId = parseInt(id, 10);
  const body    = await req.json();

  // Series update: shift time on every class in the series by the same delta
  if (req.nextUrl.searchParams.get("series") === "true") {
    const anchor = await prisma.class.findUnique({ where: { id: classId }, select: { seriesId: true } });
    if (!anchor?.seriesId) return NextResponse.json({ error: "Not part of a series" }, { status: 400 });

    const siblings = await prisma.class.findMany({ where: { seriesId: anchor.seriesId } });
    const startDeltaMs: number = body.startDeltaMs ?? 0;
    const endDeltaMs:   number = body.endDeltaMs   ?? 0;

    await prisma.$transaction(
      siblings.map(s =>
        prisma.class.update({
          where: { id: s.id },
          data: {
            ...(body.name            !== undefined && { name: body.name }),
            ...(body.programId       !== undefined && { programId: body.programId ? parseInt(body.programId, 10) : null }),
            ...(body.instructorName  !== undefined && { instructorName: body.instructorName || null }),
            ...(body.capacity        !== undefined && { capacity: body.capacity ? parseInt(body.capacity, 10) : null }),
            ...(startDeltaMs !== 0 && { startTime: new Date(s.startTime.getTime() + startDeltaMs) }),
            ...(endDeltaMs   !== 0 && { endTime:   new Date(s.endTime.getTime()   + endDeltaMs)   }),
          },
        })
      )
    );

    return NextResponse.json({ success: true, updated: siblings.length });
  }

  const cls = await prisma.class.update({
    where: { id: classId },
    data: {
      name:           body.name,
      startTime:      body.startTime ? new Date(body.startTime) : undefined,
      endTime:        body.endTime   ? new Date(body.endTime)   : undefined,
      instructorName: body.instructorName ?? undefined,
      capacity:       body.capacity !== undefined ? (body.capacity ? parseInt(body.capacity, 10) : null) : undefined,
      recurrenceRule: body.recurrenceRule ?? undefined,
      programId:      body.programId ? parseInt(body.programId, 10) : undefined,
    },
    include: { program: true },
  });

  return NextResponse.json(cls);
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("schedule");
  if (error) return error;

  const { id } = await params;
  const classId = parseInt(id, 10);
  const deleteSeries = req.nextUrl.searchParams.get("series") === "true";

  if (deleteSeries) {
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { seriesId: true } });
    if (cls?.seriesId) {
      const siblings = await prisma.class.findMany({
        where: { seriesId: cls.seriesId },
        select: { id: true },
      });
      const ids = siblings.map((s) => s.id);
      await prisma.attendance.deleteMany({ where: { classId: { in: ids } } });
      await prisma.booking.deleteMany({ where: { classId: { in: ids } } });
      await prisma.class.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ success: true, deleted: ids.length });
    }
  }

  await prisma.attendance.deleteMany({ where: { classId } });
  await prisma.booking.deleteMany({ where: { classId } });
  await prisma.class.delete({ where: { id: classId } });

  return NextResponse.json({ success: true });
}
