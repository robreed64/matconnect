import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderByName } from "@/lib/payments/provider";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { id } = await params;
  const member = await prisma.member.findUnique({ where: { id: parseInt(id, 10) } });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(member);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();

  // Stamp the trial start when a member first enters trial status
  let trialStart: Date | undefined;
  if (body.status === "trial") {
    const current = await prisma.member.findUnique({
      where: { id: memberId },
      select: { status: true, trialStartedAt: true },
    });
    if (current && (current.status !== "trial" || !current.trialStartedAt)) {
      trialStart = new Date();
    }
  }

  const member = await prisma.member.update({
    where: { id: memberId },
    data: {
      ...(trialStart && { trialStartedAt: trialStart }),
      ...(body.name        !== undefined && { name: body.name }),
      ...(body.email       !== undefined && { email: body.email || null }),
      ...(body.phone       !== undefined && { phone: body.phone || null }),
      ...(body.address     !== undefined && { address: body.address || null }),
      ...(body.dateOfBirth !== undefined && { dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null }),
      ...(body.ageGroup    !== undefined && { ageGroup: body.ageGroup || null }),
      ...(body.beltRank    !== undefined && { beltRank: body.beltRank || null }),
      ...(body.trainingType!== undefined && { trainingType: body.trainingType || null }),
      ...(body.status      !== undefined && { status: body.status }),
      ...(body.photoUrl    !== undefined && { photoUrl: body.photoUrl || null }),
      ...(body.beltStripes !== undefined && { beltStripes: Number(body.beltStripes) }),
      // Front desk recording a paper waiver (or clearing a mistaken one)
      ...(body.waiverSigned !== undefined && {
        waiverSignedAt: body.waiverSigned ? new Date() : null,
        ...(body.waiverSigned === false && { waiverDocumentUrl: null }),
      }),
    },
  });
  return NextResponse.json(member);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cancel payment-provider subscriptions before deleting — check both
  // providers, since the member may hold subs from before a provider switch
  if (member.stripeCustomerId) {
    const stripeProvider = await getProviderByName("stripe");
    if (stripeProvider) {
      try {
        await stripeProvider.cancelActiveSubscriptionsForCustomer(member);
      } catch { /* non-fatal */ }
    }
  }
  if (member.squareCustomerId) {
    const squareProvider = await getProviderByName("square");
    if (squareProvider) {
      try {
        await squareProvider.cancelActiveSubscriptionsForCustomer(member);
      } catch { /* non-fatal */ }
    }
  }

  // Cascade delete in dependency order
  await prisma.techniqueProgress.deleteMany({ where: { memberId } });
  await prisma.message.deleteMany({ where: { memberId } });
  await prisma.attendance.deleteMany({ where: { memberId } });
  await prisma.booking.deleteMany({ where: { memberId } });
  await prisma.subscription.deleteMany({ where: { memberId } });
  await prisma.sale.updateMany({ where: { memberId }, data: { memberId: null } });
  // Detach children from parent before deleting
  await prisma.member.updateMany({ where: { parentId: memberId }, data: { parentId: null } });
  await prisma.member.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
