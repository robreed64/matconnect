import Link from "next/link";
import { prisma } from "@/lib/prisma";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const PAY_LABEL: Record<string, string> = {
  cash:           "Cash",
  card_on_file:   "Card on File",
  new_card:       "New Card",
};

const CAT_PILL: Record<string, string> = {
  drinks: "bg-cyan-900/50 text-cyan-300",
  gear:   "bg-violet-900/50 text-violet-300",
  events: "bg-amber-900/50 text-amber-300",
};

export default async function SalesHistoryPage() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      member:    { select: { id: true, name: true } },
      lineItems: { include: { item: { select: { name: true, category: true } } } },
    },
  });

  const totalRevenue = sales.reduce((s, sale) => s + sale.totalCents, 0);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin/pos" className="text-sm text-gray-400 hover:text-white transition mb-1 inline-flex items-center gap-1">
            ← POS
          </Link>
          <h1 className="text-2xl font-bold text-white mt-1">Sales History</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Last 100 sales</p>
          <p className="text-xl font-bold text-green-400">{fmt(totalRevenue)}</p>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-12 text-center text-gray-600">
          No sales yet.
        </div>
      ) : (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Member</th>
                <th className="px-5 py-3 text-left font-medium">Items</th>
                <th className="px-5 py-3 text-left font-medium">Payment</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {sale.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    <span className="block text-gray-600">
                      {sale.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {sale.member
                      ? <Link href={`/admin/members/${sale.member.id}`} className="text-blue-400 hover:underline">{sale.member.name}</Link>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {sale.lineItems.map((li) => (
                        <span key={li.id} className={`px-1.5 py-0.5 rounded text-xs font-medium ${CAT_PILL[li.item.category] ?? "bg-gray-700 text-gray-300"}`}>
                          {li.quantity > 1 && `${li.quantity}× `}{li.item.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {PAY_LABEL[sale.paymentMethodType] ?? sale.paymentMethodType}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-white">
                    {fmt(sale.totalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
