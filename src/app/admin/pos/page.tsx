import Link from "next/link";
import { prisma } from "@/lib/prisma";
import POSTerminal from "./POSTerminal";
import { getGymSettings } from "@/lib/gym-settings";

export default async function POSPage() {
  const [items, settings] = await Promise.all([
    prisma.item.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    getGymSettings(),
  ]);
  const categories = (settings.posCategories as string[] | null) ?? ["drinks", "gear", "events"];
  if (!categories.includes("day_pass")) categories.push("day_pass");

  const paymentProvider = settings.paymentProvider === "square" ? "square" : "stripe";
  const terminalEnabled =
    paymentProvider === "square" &&
    !!(settings.squareAccessToken || process.env.SQUARE_ACCESS_TOKEN) &&
    !!settings.squareTerminalDeviceId;
  const squareCardConfig =
    paymentProvider === "square" &&
    settings.squareApplicationId &&
    settings.squareLocationId
      ? {
          applicationId: settings.squareApplicationId,
          locationId: settings.squareLocationId,
          environment: (settings.squareEnvironment || "sandbox") as "sandbox" | "production",
        }
      : null;

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/80 flex-shrink-0">
        <h1 className="font-bold text-white">Point of Sale</h1>
        <div className="flex gap-3">
          <Link href="/admin/pos/sales"
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition">
            Sales History
          </Link>
          <Link href="/admin/pos/items"
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition">
            Manage Items
          </Link>
        </div>
      </div>

      {/* Terminal — fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <POSTerminal categories={categories} paymentProvider={paymentProvider} terminalEnabled={terminalEnabled} squareCardConfig={squareCardConfig} cashDrawerSound={!!settings.cashDrawerSound} initialItems={items.map((i) => ({
          id:         i.id,
          name:       i.name,
          priceCents: i.priceCents,
          taxRate:    Number(i.taxRate),
          stock:      i.stock,
          category:   i.category,
          barcode:    i.barcode,
        }))} />
      </div>
    </div>
  );
}
