import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditSeriesForm from "./EditSeriesForm";

type Params = Promise<{ id: string }>;

export default async function EditSeriesPage({ params }: { params: Params }) {
  const { id } = await params;
  const cls = await prisma.class.findUnique({
    where: { id: parseInt(id, 10) },
    include: { program: true },
  });
  if (!cls) notFound();
  if (!cls.seriesId) notFound();

  const [programs, seriesCount] = await Promise.all([
    prisma.program.findMany({ orderBy: { name: "asc" } }),
    prisma.class.count({ where: { seriesId: cls.seriesId } }),
  ]);

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-1">Edit Entire Series</h1>
      <p className="text-sm text-gray-400 mb-6">
        Changes apply to all <span className="text-white font-medium">{seriesCount} classes</span> in this series.
        Dates stay the same — only the fields you change are updated.
      </p>
      <EditSeriesForm
        classId={cls.id}
        initialValues={{
          name:           cls.name,
          programId:      cls.programId ? String(cls.programId) : "",
          instructorName: cls.instructorName ?? "",
          capacity:       cls.capacity ? String(cls.capacity) : "",
          startTimeISO:   cls.startTime.toISOString(),
          endTimeISO:     cls.endTime.toISOString(),
        }}
        programs={programs.map(p => ({ id: p.id, name: p.name, type: p.type }))}
      />
    </div>
  );
}
