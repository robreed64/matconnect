import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ConvertButton, DeleteLeadButton } from "./LeadActions";
import EmbedSnippetCard from "./EmbedSnippetCard";

export default async function LeadsPage() {
  const leads = await prisma.member.findMany({
    where: { status: "lead" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, phone: true,
      ageGroup: true, trainingType: true, createdAt: true,
    },
  });

  function interest(ageGroup: string | null, trainingType: string | null) {
    const parts = [
      ageGroup === "kids" ? "Kids" : ageGroup ? "Adults" : null,
      trainingType,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "—";
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">
            {leads.length === 0
              ? "No leads yet"
              : `${leads.length} prospect${leads.length === 1 ? "" : "s"} from your website form`}
          </p>
        </div>
        <Link
          href="/admin/settings#lead-capture"
          className="text-sm text-blue-400 hover:text-blue-300 transition"
        >
          Get embed code →
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="space-y-6">
          <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-12 text-center">
            <p className="text-gray-600 text-sm">
              No leads yet. Add the lead capture form to your website to start collecting prospects.
            </p>
          </div>
          <EmbedSnippetCard />
        </div>
      ) : (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Phone</th>
                <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Interest</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-5 py-3.5 font-medium text-white">
                    <Link href={`/admin/members/${lead.id}`} className="hover:text-blue-400 transition">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400">{lead.email ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-400 hidden md:table-cell">{lead.phone ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-400 hidden lg:table-cell">
                    {interest(lead.ageGroup, lead.trainingType)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell text-xs">
                    {lead.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/members/${lead.id}`}
                        className="text-xs px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition"
                      >
                        View
                      </Link>
                      <ConvertButton memberId={lead.id} />
                      <DeleteLeadButton memberId={lead.id} memberName={lead.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {leads.length > 0 && (
        <div className="mt-6">
          <EmbedSnippetCard />
        </div>
      )}
    </div>
  );
}
