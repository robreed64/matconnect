import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const members = await prisma.member.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        beltRank: true,
        status: true,
        ageGroup: true,
        trainingType: true,
        address: true,
        dateOfBirth: true,
        notes: true,
      },
      orderBy: { name: "asc" },
    });

    // Build CSV
    const headers = ["Name", "Email", "Phone", "Belt Rank", "Status", "Age Group", "Training Type", "Address", "Date of Birth", "Notes"];
    const rows = members.map((m) => [
      m.name,
      m.email ?? "",
      m.phone ?? "",
      m.beltRank ?? "",
      m.status,
      m.ageGroup ?? "",
      m.trainingType ?? "",
      m.address ?? "",
      m.dateOfBirth ? m.dateOfBirth.toISOString().split("T")[0] : "",
      m.notes ?? "",
    ]);

    // Escape CSV values (handle commas and quotes)
    const escapeCsvValue = (value: string): string => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csv = [
      headers.map(escapeCsvValue).join(","),
      ...rows.map((row) => row.map(escapeCsvValue).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="members_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to export members: ${message}` }, { status: 500 });
  }
}
