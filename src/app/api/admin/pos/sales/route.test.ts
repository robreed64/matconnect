import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/require-auth", () => ({ requireAuth: vi.fn().mockResolvedValue({ session: { user: { role: "admin" } } }) }));
vi.mock("@/lib/stripe", () => ({ getStripeClient: vi.fn() }));
vi.mock("@/lib/gym-settings", () => ({ getGymSettings: vi.fn().mockResolvedValue({ currency: "usd" }) }));

import { prisma } from "@/test/prisma-mock";
import { getStripeClient } from "@/lib/stripe";
import { POST } from "./route";

function saleRequest(body: object) {
  return new Request("http://localhost/api/admin/pos/sales", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// $5.00 drink at 10% tax → line total 550
const drink = { id: 1, priceCents: 500, taxRate: "10", stock: 10, category: "drinks" } as never;
// $20 day pass, no tax
const dayPass = { id: 2, priceCents: 2000, taxRate: "0", stock: null, category: "day_pass" } as never;

function stubItemsAndTransaction() {
  prisma.item.findMany.mockResolvedValue([drink]);
  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof prisma) => unknown) => fn(prisma)
  );
  prisma.sale.create.mockResolvedValue({ id: 11, totalCents: 1100 } as never);
  prisma.item.updateMany.mockResolvedValue({ count: 1 } as never);
}

function stripeStub(overrides: { createIntent?: ReturnType<typeof vi.fn> } = {}) {
  return {
    customers: {
      retrieve: vi.fn().mockResolvedValue({
        id: "cus_123",
        invoice_settings: { default_payment_method: { id: "pm_123" } },
      }),
    },
    paymentIntents: {
      create: overrides.createIntent ?? vi.fn().mockResolvedValue({ id: "pi_123" }),
    },
  } as unknown as Stripe;
}

beforeEach(() => {
  vi.mocked(getStripeClient).mockReset();
});

describe("POST /api/admin/pos/sales — cash", () => {
  it("records the sale with server-computed tax-inclusive total and never calls Stripe", async () => {
    stubItemsAndTransaction();

    const res = await POST(saleRequest({
      memberId: null,
      paymentMethodType: "cash",
      lineItems: [{ itemId: 1, quantity: 2 }],
    }));

    expect(res.status).toBe(201);
    expect(getStripeClient).not.toHaveBeenCalled();
    expect(prisma.sale.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        totalCents: 1100, // (500*2) + 10% tax
        paymentMethodType: "cash",
        stripePaymentIntentId: null,
      }),
    }));
    expect(prisma.item.updateMany).toHaveBeenCalledWith({
      where: { id: 1, stock: { not: null } },
      data: { stock: { decrement: 2 } },
    });
  });

  it("rejects an empty cart", async () => {
    const res = await POST(saleRequest({ memberId: null, paymentMethodType: "cash", lineItems: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects unknown items", async () => {
    prisma.item.findMany.mockResolvedValue([]);
    const res = await POST(saleRequest({
      memberId: null, paymentMethodType: "cash", lineItems: [{ itemId: 999, quantity: 1 }],
    }));
    expect(res.status).toBe(400);
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/pos/sales — card on file", () => {
  it("charges an off-session PaymentIntent and stores its id on the sale", async () => {
    stubItemsAndTransaction();
    prisma.member.findUnique.mockResolvedValue({ stripeCustomerId: "cus_123" } as never);
    const stripe = stripeStub();
    vi.mocked(getStripeClient).mockResolvedValue(stripe);

    const res = await POST(saleRequest({
      memberId: 5,
      paymentMethodType: "card_on_file",
      lineItems: [{ itemId: 1, quantity: 2 }],
    }));

    expect(res.status).toBe(201);
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
      amount: 1100,
      currency: "usd",
      customer: "cus_123",
      payment_method: "pm_123",
      off_session: true,
      confirm: true,
      metadata: { memberId: "5", source: "pos" },
    });
    expect(prisma.sale.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ stripePaymentIntentId: "pi_123" }),
    }));
  });

  it("400s without recording when the member has no Stripe customer", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);
    prisma.member.findUnique.mockResolvedValue({ stripeCustomerId: null } as never);

    const res = await POST(saleRequest({
      memberId: 5, paymentMethodType: "card_on_file", lineItems: [{ itemId: 1, quantity: 1 }],
    }));

    expect(res.status).toBe(400);
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("400s when no member is attached", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);

    const res = await POST(saleRequest({
      memberId: null, paymentMethodType: "card_on_file", lineItems: [{ itemId: 1, quantity: 1 }],
    }));

    expect(res.status).toBe(400);
  });

  it("402s on card decline without recording a sale or touching stock", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);
    prisma.member.findUnique.mockResolvedValue({ stripeCustomerId: "cus_123" } as never);
    const decline = new Stripe.errors.StripeCardError({
      type: "card_error",
      message: "Your card was declined.",
    } as never);
    vi.mocked(getStripeClient).mockResolvedValue(
      stripeStub({ createIntent: vi.fn().mockRejectedValue(decline) })
    );

    const res = await POST(saleRequest({
      memberId: 5, paymentMethodType: "card_on_file", lineItems: [{ itemId: 1, quantity: 1 }],
    }));

    expect(res.status).toBe(402);
    expect((await res.json()).error).toContain("declined");
    expect(prisma.sale.create).not.toHaveBeenCalled();
    expect(prisma.item.updateMany).not.toHaveBeenCalled();
  });

  it("503s when Stripe is not configured", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);
    prisma.member.findUnique.mockResolvedValue({ stripeCustomerId: "cus_123" } as never);
    vi.mocked(getStripeClient).mockResolvedValue(null);

    const res = await POST(saleRequest({
      memberId: 5, paymentMethodType: "card_on_file", lineItems: [{ itemId: 1, quantity: 1 }],
    }));

    expect(res.status).toBe(503);
  });
});

describe("POST /api/admin/pos/sales — day passes", () => {
  it("creates a trial member for a walk-in but defers check-in until the kiosk waiver", async () => {
    prisma.item.findMany.mockResolvedValue([dayPass]);
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    );
    prisma.member.create.mockResolvedValue({ id: 42 } as never);
    prisma.sale.create.mockResolvedValue({ id: 12, totalCents: 2000 } as never);
    prisma.item.updateMany.mockResolvedValue({ count: 0 } as never);

    const res = await POST(saleRequest({
      memberId: null,
      paymentMethodType: "cash",
      lineItems: [{ itemId: 2, quantity: 1 }],
      walkIn: { name: "Visitor Vic", email: "vic@x.com" },
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.checkedIn).toBe(false);
    expect(data.waiverPending).toBe(true);
    expect(prisma.member.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Visitor Vic", status: "trial", trialStartedAt: expect.any(Date) }),
    });
    expect(prisma.sale.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ memberId: 42 }),
    }));
    expect(prisma.attendance.create).not.toHaveBeenCalled(); // no waiver → no training record yet
  });

  it("checks in an existing member with a waiver on file buying a day pass", async () => {
    prisma.item.findMany.mockResolvedValue([dayPass]);
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    );
    prisma.member.findUnique.mockResolvedValue({ waiverSignedAt: new Date("2026-01-01") } as never);
    prisma.sale.create.mockResolvedValue({ id: 13, totalCents: 2000 } as never);
    prisma.item.updateMany.mockResolvedValue({ count: 0 } as never);
    prisma.attendance.create.mockResolvedValue({ id: 2 } as never);

    const res = await POST(saleRequest({
      memberId: 5,
      paymentMethodType: "cash",
      lineItems: [{ itemId: 2, quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.checkedIn).toBe(true);
    expect(prisma.member.create).not.toHaveBeenCalled();
    expect(prisma.attendance.create).toHaveBeenCalledWith({
      data: { memberId: 5, classId: null, source: "staff" },
    });
  });

  it("defers check-in for an existing member without a waiver", async () => {
    prisma.item.findMany.mockResolvedValue([dayPass]);
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    );
    prisma.member.findUnique.mockResolvedValue({ waiverSignedAt: null } as never);
    prisma.sale.create.mockResolvedValue({ id: 14, totalCents: 2000 } as never);
    prisma.item.updateMany.mockResolvedValue({ count: 0 } as never);

    const res = await POST(saleRequest({
      memberId: 5,
      paymentMethodType: "cash",
      lineItems: [{ itemId: 2, quantity: 1 }],
    }));
    const data = await res.json();

    expect(data.waiverPending).toBe(true);
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it("400s when a day pass has no member and no walk-in name", async () => {
    prisma.item.findMany.mockResolvedValue([dayPass]);

    const res = await POST(saleRequest({
      memberId: null,
      paymentMethodType: "cash",
      lineItems: [{ itemId: 2, quantity: 1 }],
    }));

    expect(res.status).toBe(400);
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("does not check in for non-day-pass sales", async () => {
    stubItemsAndTransaction();

    const res = await POST(saleRequest({
      memberId: 5,
      paymentMethodType: "cash",
      lineItems: [{ itemId: 1, quantity: 1 }],
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.checkedIn).toBe(false);
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });
});
