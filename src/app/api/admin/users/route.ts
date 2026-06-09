import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

const STAFF_ROLES = ["admin", "manager", "front_desk", "staff"];

export async function GET() {
  const { error } = await requireAuth("users");
  if (error) return error;

  const users = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES } },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const { error } = await requireAuth("users");
  if (error) return error;

  const { name, email, password, role } = await req.json();
  if (!name?.trim() || !email?.trim() || !password || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["admin", "manager", "front_desk"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), role, passwordHash },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  revalidatePath("/admin/users");
  return NextResponse.json(user, { status: 201 });
}
