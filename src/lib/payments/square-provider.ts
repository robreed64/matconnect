import { SquareClient, SquareError, type Square } from "square";
import type { PaymentProvider } from "./provider";
import type { SquareConfig } from "./square-client";
import {
  CardDeclinedError,
  NoCardOnFileError,
  type CardSetupSession,
  type CardSummary,
  type MemberPaymentRefs,
  type PlanInput,
  type PlanRefs,
  type PromoValidation,
} from "./types";

// Square subscription statuses → our DB statuses (same vocabulary the Stripe
// webhook maps into; marketing triggers and MRR reports key off these).
export function mapSquareSubscriptionStatus(status: string | null | undefined): string {
  switch (status) {
    case "ACTIVE":
    case "PENDING":
      return "active";
    case "PAUSED":
      return "inactive";
    case "CANCELED":
    case "DEACTIVATED":
      return "canceled";
    default:
      return "inactive";
  }
}

export function familyDiscountPriceCents(priceCents: number, percent: number): number {
  return Math.round(priceCents * (1 - percent / 100));
}

function money(amountCents: number, currency: string): Square.Money {
  return { amount: BigInt(amountCents), currency: currency.toUpperCase() as Square.Currency };
}

function isPaymentMethodError(err: unknown): err is SquareError {
  return (
    err instanceof SquareError &&
    err.errors.some((e) => e.category === "PAYMENT_METHOD_ERROR")
  );
}

function errorDetail(err: SquareError): string {
  const first = err.errors[0];
  return first?.detail || first?.code || err.message;
}

export class SquareProvider implements PaymentProvider {
  readonly name = "square" as const;

  constructor(private client: SquareClient, private config: SquareConfig) {}

  async createCustomer(p: { name: string; email?: string | null }): Promise<string> {
    const [givenName, ...rest] = p.name.trim().split(/\s+/);
    const res = await this.client.customers.create({
      idempotencyKey: crypto.randomUUID(),
      givenName,
      familyName: rest.join(" ") || undefined,
      emailAddress: p.email || undefined,
    });
    const id = res.customer?.id;
    if (!id) throw new Error("Square customer creation returned no id");
    return id;
  }

  async tagCustomerWithMember(customerId: string, memberId: number): Promise<void> {
    await this.client.customers
      .update({ customerId, referenceId: String(memberId) })
      .catch(() => {});
  }

  async beginCardSetup(customerId: string): Promise<CardSetupSession> {
    // Tokenization happens in the browser via the Web Payments SDK; the server
    // only needs the customer to attach the card to.
    return { provider: "square", customerId };
  }

  async saveCard(customerId: string, token: string): Promise<{ cardId: string; card: CardSummary | null }> {
    // An already-stored card id (the enroll flow saves the card before the
    // final submit) — return it instead of storing a duplicate
    if (token.startsWith("ccof:")) {
      return { cardId: token, card: await this.cardSummary(token) };
    }
    try {
      const res = await this.client.cards.create({
        idempotencyKey: crypto.randomUUID(),
        sourceId: token,
        card: { customerId },
      });
      const card = res.card;
      if (!card?.id) throw new Error("Square card creation returned no id");
      return {
        cardId: card.id,
        card: { brand: card.cardBrand?.toLowerCase() ?? null, last4: card.last4 ?? null },
      };
    } catch (err) {
      if (isPaymentMethodError(err)) throw new CardDeclinedError(errorDetail(err));
      throw err;
    }
  }

  private async cardSummary(cardId: string): Promise<CardSummary | null> {
    try {
      const res = await this.client.cards.get({ cardId });
      const card = res.card;
      if (!card) return null;
      return { brand: card.cardBrand?.toLowerCase() ?? null, last4: card.last4 ?? null };
    } catch {
      return null;
    }
  }

  async getDefaultCard(member: MemberPaymentRefs): Promise<CardSummary | null> {
    if (!member.squareCardId) return null;
    return this.cardSummary(member.squareCardId);
  }

  async chargeCardOnFile(p: {
    member: MemberPaymentRefs;
    amountCents: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<string> {
    if (!p.member.squareCustomerId || !p.member.squareCardId) {
      throw new NoCardOnFileError("Member has no card on file");
    }
    try {
      const res = await this.client.payments.create({
        idempotencyKey: crypto.randomUUID(),
        sourceId: p.member.squareCardId,
        customerId: p.member.squareCustomerId,
        amountMoney: money(p.amountCents, p.currency),
        locationId: this.config.locationId,
        autocomplete: true,
        referenceId: p.metadata.memberId,
        note: p.metadata.source === "pos" ? "POS sale" : undefined,
      });
      const id = res.payment?.id;
      if (!id) throw new Error("Square payment returned no id");
      return id;
    } catch (err) {
      if (isPaymentMethodError(err)) throw new CardDeclinedError(errorDetail(err));
      throw err;
    }
  }

  // Plans map to a SUBSCRIPTION_PLAN catalog object with one
  // SUBSCRIPTION_PLAN_VARIATION holding a single indefinite phase.
  async createPlan(p: PlanInput): Promise<PlanRefs> {
    const res = await this.client.catalog.object.upsert({
      idempotencyKey: crypto.randomUUID(),
      object: {
        type: "SUBSCRIPTION_PLAN",
        id: "#plan",
        subscriptionPlanData: {
          name: p.name,
          subscriptionPlanVariations: [this.variationObject("#variation", null, p)],
        },
      },
    });
    const planId = res.idMappings?.find((m) => m.clientObjectId === "#plan")?.objectId ?? null;
    const variationId =
      res.idMappings?.find((m) => m.clientObjectId === "#variation")?.objectId ?? null;
    if (!planId || !variationId) throw new Error("Square catalog upsert returned no object ids");
    return { squareCatalogPlanId: planId, squarePlanVariationId: variationId };
  }

  private variationObject(
    id: string,
    subscriptionPlanId: string | null,
    p: PlanInput
  ): Square.CatalogObject {
    return {
      type: "SUBSCRIPTION_PLAN_VARIATION",
      id,
      subscriptionPlanVariationData: {
        name: p.name,
        ...(subscriptionPlanId && { subscriptionPlanId }),
        phases: [
          {
            cadence: p.billingInterval === "yearly" ? "ANNUAL" : "MONTHLY",
            ordinal: BigInt(0),
            recurringPriceMoney: money(p.priceCents, p.currency),
          },
        ],
      },
    };
  }

  async updatePlan(refs: PlanRefs, p: PlanInput, opts: { priceChanged: boolean }): Promise<PlanRefs> {
    if (!refs.squareCatalogPlanId || !opts.priceChanged) return refs;
    // Phases are immutable once a variation has subscribers, so price/interval
    // changes mint a new variation; existing subscriptions stay on the old one
    const res = await this.client.catalog.object.upsert({
      idempotencyKey: crypto.randomUUID(),
      object: this.variationObject("#variation", refs.squareCatalogPlanId, p),
    });
    const variationId =
      res.idMappings?.find((m) => m.clientObjectId === "#variation")?.objectId ??
      res.catalogObject?.id;
    if (!variationId) return refs;
    return { ...refs, squarePlanVariationId: variationId };
  }

  async deactivatePlan(refs: PlanRefs): Promise<void> {
    if (!refs.squarePlanVariationId) return;
    try {
      await this.client.catalog.object.delete({ objectId: refs.squarePlanVariationId });
    } catch { /* non-fatal — may have active subscribers */ }
  }

  async createSubscription(p: {
    member: MemberPaymentRefs;
    planRefs: PlanRefs;
    promoCode?: string | null; // promo codes are a Stripe-only feature
  }): Promise<{ subscriptionRef: string; status: string }> {
    if (!p.member.squareCustomerId || !p.planRefs.squarePlanVariationId) {
      throw new Error("Missing Square customer or plan variation for subscription");
    }
    const res = await this.client.subscriptions.create({
      idempotencyKey: crypto.randomUUID(),
      locationId: this.config.locationId,
      planVariationId: p.planRefs.squarePlanVariationId,
      customerId: p.member.squareCustomerId,
      // Without a card Square emails the subscriber an invoice link instead
      cardId: p.member.squareCardId ?? undefined,
    });
    const sub = res.subscription;
    if (!sub?.id) throw new Error("Square subscription creation returned no id");
    return { subscriptionRef: sub.id, status: mapSquareSubscriptionStatus(sub.status) };
  }

  async cancelSubscription(subscriptionRef: string): Promise<void> {
    await this.client.subscriptions.cancel({ subscriptionId: subscriptionRef });
  }

  async cancelActiveSubscriptionsForCustomer(member: MemberPaymentRefs): Promise<void> {
    if (!member.squareCustomerId) return;
    const res = await this.client.subscriptions.search({
      query: { filter: { customerIds: [member.squareCustomerId] } },
    });
    const active = (res.subscriptions ?? []).filter((s) => s.status === "ACTIVE" || s.status === "PENDING");
    await Promise.all(
      active.map((s) => this.client.subscriptions.cancel({ subscriptionId: s.id! }))
    );
  }

  async updateSubscriptionCard(subscriptionRef: string, cardId: string): Promise<void> {
    const current = await this.client.subscriptions.get({ subscriptionId: subscriptionRef });
    await this.client.subscriptions.update({
      subscriptionId: subscriptionRef,
      subscription: { cardId, version: current.subscription?.version },
    });
  }

  async setSubscriptionDiscount(
    subscriptionRef: string,
    percent: number | null,
    plan: { priceCents: number; currency: string }
  ): Promise<void> {
    const current = await this.client.subscriptions.get({ subscriptionId: subscriptionRef });
    const version = current.subscription?.version;
    // Square has no coupons; the discount is modeled as a price override.
    // To remove a discount, set the override to the plan's full price rather
    // than passing null (null behavior is unspecified by the API).
    const priceOverrideMoney =
      percent === null
        ? money(plan.priceCents, plan.currency)
        : money(familyDiscountPriceCents(plan.priceCents, percent), plan.currency);
    await this.client.subscriptions.update({
      subscriptionId: subscriptionRef,
      subscription: { priceOverrideMoney, version },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validatePromoCode(_code: string): Promise<PromoValidation> {
    return { valid: false, unsupported: true };
  }
}
