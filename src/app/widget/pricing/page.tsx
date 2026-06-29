import { prisma } from "@/lib/prisma";
import { getGymSettings, formatCurrency } from "@/lib/gym-settings";

export const dynamic = "force-dynamic";

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
function safeColor(raw: string | undefined): string {
  return raw && HEX_RE.test(raw) ? raw : "#2563eb";
}

type SearchParams = Promise<{ color?: string }>;

export default async function PricingWidgetPage({ searchParams }: { searchParams: SearchParams }) {
  const { color: rawColor } = await searchParams;
  const color = safeColor(rawColor);

  const settings = await getGymSettings();
  const plans = await prisma.membershipPlan.findMany({
    orderBy: { priceCents: "asc" },
    select: { id: true, name: true, description: true, priceCents: true, billingInterval: true },
  });

  return (
    <div className="p-4 font-sans text-sm bg-white min-h-screen">
      {plans.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No membership plans available at this time.</p>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="border-t-4 border border-gray-200 rounded-lg p-4 bg-white"
              style={{ borderTopColor: color }}
            >
              <p className="font-bold text-gray-900 text-base">{plan.name}</p>
              <p className="mt-1 text-lg font-black text-gray-900">
                {formatCurrency(plan.priceCents, settings.currencySymbol, settings.locale)}
                <span className="text-sm font-normal text-gray-500"> per {plan.billingInterval}</span>
              </p>
              {plan.description && (
                <p className="mt-1 text-gray-600">{plan.description}</p>
              )}
              <a
                href="/enroll"
                className="mt-3 inline-block w-full text-center py-2 px-4 rounded-lg text-white text-sm font-semibold transition hover:opacity-90"
                style={{ backgroundColor: color }}
              >
                Get started
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
