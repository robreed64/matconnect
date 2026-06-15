import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const settings = await getGymSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const { error } = await requireAuth("settings");
  if (error) return error;

  const body = await req.json();

  const allowed = [
    "gymName", "gymEmail", "gymPhone", "gymAddress", "logoUrl",
    "waiverText", "currency", "currencySymbol", "locale", "timezone",
    "defaultTaxRate", "setupComplete",
    "beltConfig", "instructorNames", "posCategories",
    "paymentProvider",
    "stripePublishableKey", "stripeSecretKey", "stripeWebhookSecret",
    "squareAccessToken", "squareApplicationId", "squareLocationId",
    "squareWebhookSignatureKey", "squareEnvironment", "squareTerminalDeviceId",
    "brevoApiKey", "brevoSenderEmail", "brevoSenderName", "brevoSmsFrom",
    "familyDiscountEnabled", "familyDiscountPercent",
    "trialLengthDays", "hiddenFeatures",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  // Don't overwrite secrets with empty strings
  if (!data.brevoApiKey) delete data.brevoApiKey;
  if (!data.squareAccessToken) delete data.squareAccessToken;
  if (!data.squareWebhookSignatureKey) delete data.squareWebhookSignatureKey;

  if (data.paymentProvider !== undefined && !["stripe", "square"].includes(data.paymentProvider as string)) {
    return NextResponse.json({ error: "Invalid payment provider" }, { status: 400 });
  }
  if (data.squareEnvironment !== undefined && !["sandbox", "production"].includes(data.squareEnvironment as string)) {
    return NextResponse.json({ error: "Invalid Square environment" }, { status: 400 });
  }

  if (data.defaultTaxRate !== undefined) {
    const rate = Number(data.defaultTaxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return NextResponse.json({ error: "Invalid tax rate" }, { status: 400 });
    }
    data.defaultTaxRate = rate;
  }

  if (data.trialLengthDays !== undefined) {
    const days = Number(data.trialLengthDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return NextResponse.json({ error: "Trial length must be 1–365 days" }, { status: 400 });
    }
    data.trialLengthDays = days;
  }

  const settings = await prisma.gymSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  revalidatePath("/", "layout");

  return NextResponse.json(settings);
}
