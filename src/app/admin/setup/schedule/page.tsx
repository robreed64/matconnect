import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import ScheduleSetupClient from "./ScheduleSetupClient";

export default async function SetupSchedulePage() {
  const [programs, settings] = await Promise.all([
    prisma.program.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { classes: true } } },
    }),
    getGymSettings(),
  ]);

  const instructorNames = (settings.instructorNames as string[]) ?? [];
  const programTypes    = (settings.programTypes    as string[]) ?? ["gi", "no-gi", "youth", "seminar", "intro", "private"];

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/setup" className="text-sm text-amber-500 hover:text-amber-300 transition">← Configure</Link>
        <h1 className="text-2xl font-bold mt-2">Schedule</h1>
      </div>
      <ScheduleSetupClient
        programs={programs.map(p => ({ ...p, classCount: p._count.classes }))}
        instructorNames={instructorNames}
        programTypes={programTypes}
      />
    </div>
  );
}
