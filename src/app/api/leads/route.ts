import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { name, email, phone, ageGroup, trainingType } = await req.json();

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  // Avoid duplicate leads for the same email
  const existing = await prisma.member.findFirst({
    where: { email: email.trim().toLowerCase() },
  });
  if (existing) {
    // Return success silently — don't reveal whether the email is in the system
    return NextResponse.json(
      { success: true },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const member = await prisma.member.create({
    data: {
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      phone:        phone?.trim() || null,
      ageGroup:     ageGroup  || "adult",
      trainingType: trainingType || null,
      beltRank:     "white",
      status:       "lead",
    },
  });

  // Notify gym owner (fires-and-forgets — never blocks the response)
  const settings = await getGymSettings();
  if (settings.gymEmail) {
    const interest = [
      ageGroup === "kids" ? "Kids" : "Adults",
      trainingType ?? "",
    ].filter(Boolean).join(" · ");

    await sendEmail(
      settings.gymEmail,
      `New lead: ${member.name}`,
      `<p>A new lead submitted the interest form on your website.</p>
<table cellpadding="6" style="font-family:sans-serif;font-size:14px;">
  <tr><td style="color:#666">Name</td><td><strong>${member.name}</strong></td></tr>
  <tr><td style="color:#666">Email</td><td>${member.email}</td></tr>
  ${member.phone ? `<tr><td style="color:#666">Phone</td><td>${member.phone}</td></tr>` : ""}
  ${interest ? `<tr><td style="color:#666">Interest</td><td>${interest}</td></tr>` : ""}
</table>
<p style="margin-top:16px;"><a href="${process.env.NEXTAUTH_URL ?? ""}/admin/leads">View all leads →</a></p>`
    ).catch(() => {});
  }

  return NextResponse.json(
    { success: true },
    { status: 201, headers: { "Access-Control-Allow-Origin": "*" } }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
