"use client";

import { useState, useRef, useCallback } from "react";

type Item = {
  id: number; name: string; priceCents: number;
  taxRate: number; stock: number | null; category: string; barcode: string | null;
};
type CartLine  = { item: Item; quantity: number };
type Member    = { id: number; name: string; stripeCustomerId: string | null };

// Cycling color palette for dynamic categories
const PALETTE_TAB = [
  "data-[active=true]:bg-cyan-700",
  "data-[active=true]:bg-violet-700",
  "data-[active=true]:bg-amber-700",
  "data-[active=true]:bg-green-700",
  "data-[active=true]:bg-rose-700",
  "data-[active=true]:bg-sky-700",
];
const PALETTE_CARD = [
  "bg-cyan-900/40 hover:bg-cyan-800/60 border-cyan-800",
  "bg-violet-900/40 hover:bg-violet-800/60 border-violet-800",
  "bg-amber-900/40 hover:bg-amber-800/60 border-amber-800",
  "bg-green-900/40 hover:bg-green-800/60 border-green-800",
  "bg-rose-900/40 hover:bg-rose-800/60 border-rose-800",
  "bg-sky-900/40 hover:bg-sky-800/60 border-sky-800",
];

function catLabel(slug: string) {
  return slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function POSTerminal({ initialItems, categories }: { initialItems: Item[]; categories: string[] }) {
  const [items]       = useState<Item[]>(initialItems);
  const [tab, setTab] = useState<string>(categories[0] ?? "drinks");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [memberQ, setMemberQ]     = useState("");
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [payMethod, setPayMethod] = useState<"cash" | "card_on_file">("cash");
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [walkInName, setWalkInName]   = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [receipt, setReceipt]       = useState<{ total: number; id: number; checkedIn?: boolean; waiverPending?: boolean } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleItems = items.filter((i) => i.category === tab);

  const addToCart = (item: Item) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) return prev.map((l) => l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { item, quantity: 1 }];
    });
  };

  const setQty = (itemId: number, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((l) => l.item.id !== itemId));
    else setCart((prev) => prev.map((l) => l.item.id === itemId ? { ...l, quantity: qty } : l));
  };

  const searchMembers = useCallback(async (q: string) => {
    if (q.length < 2) { setMemberResults([]); return; }
    const res  = await fetch(`/api/members/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setMemberResults(data);
  }, []);

  const onMemberInput = (q: string) => {
    setMemberQ(q);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => searchMembers(q), 250);
  };

  const subtotal = cart.reduce((s, l) => s + l.item.priceCents * l.quantity, 0);
  const tax      = cart.reduce((s, l) => s + Math.round(l.item.priceCents * l.quantity * Number(l.item.taxRate) / 100), 0);
  const total    = subtotal + tax;
  const hasDayPass    = cart.some((l) => l.item.category === "day_pass");
  const needsWalkIn   = hasDayPass && !selectedMember;
  const walkInMissing = needsWalkIn && !walkInName.trim();

  const checkout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/admin/pos/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId:          selectedMember?.id ?? null,
          paymentMethodType: payMethod,
          lineItems: cart.map((l) => ({
            itemId:   l.item.id,
            quantity: l.quantity,
          })),
          ...(needsWalkIn && walkInName.trim() && {
            walkIn: { name: walkInName, email: walkInEmail || undefined },
          }),
        }),
      });
      if (res.ok) {
        const sale = await res.json();
        setReceipt({ total: sale.totalCents, id: sale.id, checkedIn: sale.checkedIn, waiverPending: sale.waiverPending });
        setCart([]);
        setSelectedMember(null);
        setMemberQ("");
        setWalkInName("");
        setWalkInEmail("");
      } else {
        const data = await res.json().catch(() => null);
        setCheckoutError(data?.error ?? "Checkout failed — try again");
      }
    } catch {
      setCheckoutError("Checkout failed — try again");
    }
    setProcessing(false);
  };

  if (receipt) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
        <div className="text-6xl">✓</div>
        <div>
          <p className="text-2xl font-bold text-green-400">{fmt(receipt.total)} charged</p>
          <p className="text-gray-500 text-sm mt-1">Sale #{receipt.id}</p>
          {receipt.checkedIn && (
            <p className="text-green-400 text-sm mt-2 font-medium">✓ Checked in</p>
          )}
          {receipt.waiverPending && (
            <p className="text-amber-300 text-sm mt-2 font-medium">→ Send them to the kiosk to sign the waiver — signing completes check-in</p>
          )}
        </div>
        <button
          onClick={() => setReceipt(null)}
          className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold transition"
        >
          New Sale
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-0">
      {/* Left — items */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-gray-800">
        {/* Category tabs */}
        <div className="flex gap-1 p-4 border-b border-gray-800 bg-gray-900/60 flex-wrap">
          {categories.map((cat, i) => (
            <button
              key={cat}
              data-active={tab === cat}
              onClick={() => setTab(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${PALETTE_TAB[i % PALETTE_TAB.length]} data-[active=true]:text-white text-gray-400 hover:text-white hover:bg-gray-800`}
            >
              {catLabel(cat)}
            </button>
          ))}
        </div>

        {/* Item grid */}
        <div className="flex-1 overflow-auto p-4">
          {visibleItems.length === 0 ? (
            <p className="text-gray-600 text-sm text-center pt-12">No {tab} items yet. Add them in Item Management.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={item.stock === 0}
                  className={`border rounded-xl p-4 text-left transition disabled:opacity-40 disabled:cursor-not-allowed ${PALETTE_CARD[categories.indexOf(item.category) % PALETTE_CARD.length] ?? "bg-gray-800 hover:bg-gray-700 border-gray-700"}`}
                >
                  <p className="font-semibold text-white text-sm leading-snug">{item.name}</p>
                  <p className="text-lg font-bold text-white mt-1">{fmt(item.priceCents)}</p>
                  {item.stock !== null && (
                    <p className={`text-xs mt-1 ${item.stock <= 3 ? "text-red-400" : "text-gray-400"}`}>
                      {item.stock} in stock
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — cart */}
      <div className="w-80 flex flex-col bg-gray-900 flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-bold text-white">Cart</h2>
        </div>

        {/* Cart lines */}
        <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
          {cart.length === 0 ? (
            <p className="text-gray-600 text-sm text-center pt-6">Tap items to add them</p>
          ) : cart.map((line) => (
            <div key={line.item.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{line.item.name}</p>
                <p className="text-xs text-gray-500">{fmt(line.item.priceCents)} each</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => setQty(line.item.id, line.quantity - 1)}
                  className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold transition flex items-center justify-center">
                  −
                </button>
                <span className="text-white text-sm font-medium w-5 text-center">{line.quantity}</span>
                <button onClick={() => setQty(line.item.id, line.quantity + 1)}
                  className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold transition flex items-center justify-center">
                  +
                </button>
              </div>
              <span className="text-sm text-white font-semibold w-16 text-right flex-shrink-0">
                {fmt(line.item.priceCents * line.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals + checkout */}
        <div className="border-t border-gray-800 px-5 py-4 space-y-4">
          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Tax</span><span>{fmt(tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-base pt-1 border-t border-gray-800">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </div>

          {/* Member search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Attach member (optional)"
              value={selectedMember ? selectedMember.name : memberQ}
              onChange={(e) => { setSelectedMember(null); onMemberInput(e.target.value); }}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition"
            />
            {selectedMember && (
              <button onClick={() => { setSelectedMember(null); setMemberQ(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs">
                ✕
              </button>
            )}
            {memberResults.length > 0 && !selectedMember && (
              <ul className="absolute bottom-full mb-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-10">
                {memberResults.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition text-white"
                      onClick={() => { setSelectedMember(m); setMemberResults([]); setMemberQ(""); }}
                    >
                      {m.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Walk-in details for day passes */}
          {needsWalkIn && (
            <div className="space-y-2">
              <p className="text-xs text-amber-300 font-medium">Day pass — who&apos;s it for?</p>
              <input
                type="text"
                placeholder="Walk-in name (required)"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-amber-500 transition"
              />
              <input
                type="text" inputMode="email"
                placeholder="Email (optional)"
                value={walkInEmail}
                onChange={(e) => setWalkInEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          )}

          {/* Payment method */}
          <div className="flex gap-2">
            {(["cash", "card_on_file"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setPayMethod(method)}
                disabled={method === "card_on_file" && !selectedMember?.stripeCustomerId}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  payMethod === method
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                }`}
              >
                {method === "cash" ? "Cash" : "Card on File"}
              </button>
            ))}
          </div>

          {/* Checkout */}
          {checkoutError && (
            <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {checkoutError}
            </p>
          )}
          <button
            onClick={checkout}
            disabled={cart.length === 0 || processing || walkInMissing}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base transition"
          >
            {processing ? "Processing…" : `Charge ${fmt(total)}`}
          </button>

          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="w-full text-xs text-gray-600 hover:text-gray-400 transition">
              Clear cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
