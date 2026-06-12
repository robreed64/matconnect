import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  const { error } = await requireAuth("members");
  if (error) return error;
  const { name, email, phone, dateOfBirth, ageGroup, beltRank, trainingType, status, planId, waiverSigned } = await req.json();

  if (!name?.trim() || !email?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Name, email, and phone are required" }, { status: 400 });
  }

  const member = await prisma.member.create({
    data: {
      name:        name.trim(),
      email:       email.trim(),
      phone:       phone.trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      ageGroup:    ageGroup  || "adult",
      beltRank:    beltRank  || "white",
      trainingType: trainingType || null,
      status:      status    || "active",
      trialStartedAt: status === "trial" ? new Date() : null,
      waiverSignedAt: waiverSigned ? new Date() : null,
    },
  });

  if (planId) {
    await prisma.subscription.create({
      data: {
        memberId:  member.id,
        planId:    parseInt(planId, 10),
        status:    "active",
        startDate: new Date(),
      },
    });
  }

  return NextResponse.json(member, { status: 201 });
}
