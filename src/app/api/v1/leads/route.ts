import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import { sendEmail } from "@/lib/email";

// Public — no API key required (lead capture should never be blocked by a missing key)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function POST(req: NextRequest) {
  const { name, email, phone, interest } = await req.json();

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400, headers: CORS }
    );
  }

  // Map "interest" field to ageGroup/trainingType used by the Member model
  let ageGroup = "adult";
  let trainingType: string | null = null;
  if (interest === "kids") {
    ageGroup = "kids";
  } else if (interest) {
    trainingType = interest;
  }

  const existing = await prisma.member.findFirst({
    where: { email: email.trim().toLowerCase() },
  });
  if (existing) {
    return NextResponse.json({ ok: true }, { headers: CORS });
  }

  const member = await prisma.member.create({
    data: {
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      phone:        phone?.trim() || null,
      ageGroup,
      trainingType,
      beltRank:     "white",
      status:       "lead",
    },
  });

  const settings = await getGymSettings();
  if (settings.gymEmail) {
    const interestLabel = [
      ageGroup === "kids" ? "Kids" : "Adults",
      trainingType ?? "",
    ].filter(Boolean).join(" · ");

    await sendEmail(
      settings.gymEmail,
      `New lead: ${member.name}`,
      `<p>A new lead submitted the interest form.</p>
<table cellpadding="6" style="font-family:sans-serif;font-size:14px;">
  <tr><td style="color:#666">Name</td><td><strong>${member.name}</strong></td></tr>
  <tr><td style="color:#666">Email</td><td>${member.email}</td></tr>
  ${member.phone ? `<tr><td style="color:#666">Phone</td><td>${member.phone}</td></tr>` : ""}
  ${interestLabel ? `<tr><td style="color:#666">Interest</td><td>${interestLabel}</td></tr>` : ""}
</table>
<p style="margin-top:16px;"><a href="${process.env.NEXTAUTH_URL ?? ""}/admin/leads">View all leads →</a></p>`
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true }, { status: 201, headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
