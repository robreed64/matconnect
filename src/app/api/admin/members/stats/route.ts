import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const [total, active, leads, pastDue, thisMonth, byBelt] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { status: "active" } }),
      prisma.member.count({ where: { status: "lead" } }),
      prisma.member.count({ where: { status: "past_due" } }),
      prisma.member.count({
        where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
      prisma.member.groupBy({
        by: ["beltRank"],
        _count: true,
        orderBy: { _count: { beltRank: "desc" } },
      }),
    ]);

    return NextResponse.json({
      total,
      active,
      leads,
      pastDue,
      thisMonth,
      byBelt: byBelt.map((b) => ({ beltRank: b.beltRank, _count: b._count })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
