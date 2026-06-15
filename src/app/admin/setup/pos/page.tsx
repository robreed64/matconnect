import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import PosSetupClient from "./PosSetupClient";

export default async function SetupPosPage() {
  const [settings, items] = await Promise.all([
    getGymSettings(),
    prisma.item.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);

  const categories = (settings.posCategories as string[]) ?? ["drinks", "gear", "events"];
  if (!categories.includes("day_pass")) categories.push("day_pass");

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/setup" className="text-sm text-amber-500 hover:text-amber-300 transition">← Configure</Link>
        <h1 className="text-2xl font-bold mt-2">POS Configuration</h1>
      </div>
      <PosSetupClient categories={categories} cashDrawerSound={!!settings.cashDrawerSound} items={items.map(i => ({ ...i, priceCents: i.priceCents, taxRate: Number(i.taxRate) }))} />
    </div>
  );
}
