import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  // ── Gym Settings ─────────────────────────────────────────────────────────────
  const gymData = {
    gymName: "Trinity Martial Arts",
    gymEmail: "info@trinitymartialarts.com",
    gymPhone: "(555) 867-5309",
    gymAddress: "123 Main St, Austin, TX 78701",
    currency: "usd",
    currencySymbol: "$",
    locale: "en-US",
    timezone: "America/Chicago",
    setupComplete: true,
    instructorNames: ["Coach Rob", "Coach Maria", "Coach Jake"],
    posCategories: ["drinks", "gear", "events"],
    beltConfig: [
      { belt: "white",  stripes: 4 },
      { belt: "blue",   stripes: 4 },
      { belt: "purple", stripes: 4 },
      { belt: "brown",  stripes: 4 },
      { belt: "black",  stripes: 6 },
    ],
  };
  await prisma.gymSettings.upsert({
    where: { id: 1 },
    update: gymData,
    create: { id: 1, ...gymData },
  });
  console.log("Seeded gym settings.");

  // ── Programs ─────────────────────────────────────────────────────────────────
  const programs = [
    { id: 1, name: "Fundamentals Gi",  type: "gi",    description: "Beginner gi class — positions, escapes, and core submissions" },
    { id: 2, name: "Advanced Gi",      type: "gi",    description: "Advanced gi class for blue belts and above" },
    { id: 3, name: "No-Gi Grappling",  type: "no-gi", description: "No-gi submission wrestling and leg locks" },
    { id: 4, name: "Youth BJJ",        type: "youth", description: "Brazilian Jiu-Jitsu for ages 5–14" },
  ];
  for (const p of programs) {
    await prisma.program.upsert({ where: { id: p.id }, update: {}, create: p });
  }

  // ── Classes (this week) ───────────────────────────────────────────────────────
  const monday = new Date();
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);

  const classTemplates = [
    { dayOffset: 0, start: "18:00", end: "19:30", name: "Fundamentals Gi",   programId: 1, instructor: "Coach Rob" },
    { dayOffset: 0, start: "19:30", end: "21:00", name: "Advanced Gi",       programId: 2, instructor: "Coach Rob" },
    { dayOffset: 1, start: "12:00", end: "13:00", name: "Lunch No-Gi",       programId: 3, instructor: "Coach Maria" },
    { dayOffset: 1, start: "18:00", end: "19:30", name: "No-Gi Grappling",   programId: 3, instructor: "Coach Maria" },
    { dayOffset: 2, start: "18:00", end: "19:30", name: "Fundamentals Gi",   programId: 1, instructor: "Coach Rob" },
    { dayOffset: 2, start: "19:30", end: "21:00", name: "Advanced Gi",       programId: 2, instructor: "Coach Rob" },
    { dayOffset: 3, start: "18:00", end: "19:30", name: "No-Gi Grappling",   programId: 3, instructor: "Coach Jake" },
    { dayOffset: 4, start: "18:00", end: "19:30", name: "Fundamentals Gi",   programId: 1, instructor: "Coach Rob" },
    { dayOffset: 4, start: "19:30", end: "21:00", name: "Open Mat",          programId: 1, instructor: "Coach Rob" },
    { dayOffset: 5, start: "10:00", end: "11:00", name: "Youth BJJ",         programId: 4, instructor: "Coach Maria" },
    { dayOffset: 5, start: "11:00", end: "12:30", name: "Saturday Open Mat", programId: 1, instructor: "Coach Rob" },
  ];

  const seededClasses = [];
  for (const t of classTemplates) {
    const start = new Date(monday);
    start.setDate(monday.getDate() + t.dayOffset);
    const [sh, sm] = t.start.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(start);
    const [eh, em] = t.end.split(":").map(Number);
    end.setHours(eh, em, 0, 0);
    const existing = await prisma.class.findFirst({ where: { startTime: start } });
    const cls = existing ?? await prisma.class.create({
      data: { name: t.name, programId: t.programId, startTime: start, endTime: end, instructorName: t.instructor },
    });
    seededClasses.push(cls);
  }
  console.log(`Seeded ${seededClasses.length} classes.`);

  // ── Membership Plans ──────────────────────────────────────────────────────────
  const plans = [
    { id: 1, name: "Gi Unlimited",          planType: "gi",      priceCents: 14900, billingInterval: "monthly", description: "Unlimited gi classes" },
    { id: 2, name: "No-Gi Unlimited",        planType: "no-gi",   priceCents: 14900, billingInterval: "monthly", description: "Unlimited no-gi classes" },
    { id: 3, name: "Hybrid (Gi + No-Gi)",    planType: "gi",      priceCents: 17900, billingInterval: "monthly", description: "Unlimited gi and no-gi classes" },
    { id: 4, name: "Kids Program",           planType: "kids",    priceCents: 10900, billingInterval: "monthly", description: "Youth BJJ classes" },
    { id: 5, name: "Family Plan",            planType: "family",  priceCents: 24900, billingInterval: "monthly", description: "Up to 4 family members" },
    { id: 6, name: "Online Only",            planType: "online",  priceCents:  4900, billingInterval: "monthly", description: "Access to online curriculum" },
    { id: 7, name: "Drop-In",               planType: "drop-in", priceCents:  2500, billingInterval: "monthly", classLimit: 1, description: "Single class drop-in" },
  ];
  for (const plan of plans) {
    await prisma.membershipPlan.upsert({ where: { id: plan.id }, update: {}, create: plan });
  }

  // ── Members ───────────────────────────────────────────────────────────────────
  const memberData = [
    { name: "Alice Johnson",  email: "alice@example.com",   beltRank: "blue",   beltStripes: 3, ageGroup: "adult", trainingType: "Gi",    status: "active"   },
    { name: "Bob Martinez",   email: "bob@example.com",     beltRank: "white",  beltStripes: 2, ageGroup: "adult", trainingType: "Both",  status: "active"   },
    { name: "Carlos Silva",   email: "carlos@example.com",  beltRank: "purple", beltStripes: 1, ageGroup: "adult", trainingType: "Gi",    status: "active"   },
    { name: "Diana Chen",     email: "diana@example.com",   beltRank: "white",  beltStripes: 0, ageGroup: "adult", trainingType: "No-Gi", status: "trial"    },
    { name: "Ethan Park",     email: "ethan@example.com",   beltRank: "blue",   beltStripes: 1, ageGroup: "adult", trainingType: "Both",  status: "past_due" },
    { name: "Fiona Walsh",    email: "fiona@example.com",   beltRank: "brown",  beltStripes: 2, ageGroup: "adult", trainingType: "Gi",    status: "active"   },
    { name: "Gus Thompson",   email: "gus@example.com",     beltRank: "white",  beltStripes: 0, ageGroup: "kids",  trainingType: "Gi",    status: "active"   },
    { name: "Hannah Lee",     email: "hannah@example.com",  beltRank: "black",  beltStripes: 0, ageGroup: "adult", trainingType: "Gi",    status: "active"   },
    { name: "Ivan Petrov",    email: "ivan@example.com",    beltRank: "white",  beltStripes: 1, ageGroup: "adult", trainingType: "No-Gi", status: "active"   },
    { name: "Jess Nguyen",    email: "jess@example.com",    beltRank: "blue",   beltStripes: 0, ageGroup: "adult", trainingType: "Both",  status: "active"   },
  ];

  const members = [];
  for (const m of memberData) {
    const existing = await prisma.member.findFirst({ where: { email: m.email } });
    const member = existing ?? await prisma.member.create({ data: m });
    members.push(member);
  }
  console.log(`Seeded ${members.length} members.`);

  // ── Family link: Bob → Gus ────────────────────────────────────────────────────
  const bob = members.find(m => m.name === "Bob Martinez");
  const gus = members.find(m => m.name === "Gus Thompson");
  if (bob && gus && gus.parentId !== bob.id) {
    await prisma.member.update({ where: { id: gus.id }, data: { parentId: bob.id } });
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────────
  const subMap: Record<string, { planId: number; status: string }> = {
    "Alice Johnson":  { planId: 1, status: "active"   },
    "Bob Martinez":   { planId: 3, status: "active"   },
    "Carlos Silva":   { planId: 1, status: "active"   },
    "Diana Chen":     { planId: 1, status: "active"   },
    "Ethan Park":     { planId: 3, status: "past_due" },
    "Fiona Walsh":    { planId: 1, status: "active"   },
    "Gus Thompson":   { planId: 4, status: "active"   },
    "Hannah Lee":     { planId: 1, status: "active"   },
    "Ivan Petrov":    { planId: 2, status: "active"   },
    "Jess Nguyen":    { planId: 3, status: "active"   },
  };

  for (const member of members) {
    const info = subMap[member.name];
    if (!info) continue;
    const existing = await prisma.subscription.findFirst({ where: { memberId: member.id } });
    if (!existing) {
      await prisma.subscription.create({
        data: {
          memberId: member.id,
          planId: info.planId,
          status: info.status,
          startDate: daysAgo(Math.floor(Math.random() * 180) + 30),
        },
      });
    }
  }
  console.log("Seeded subscriptions.");

  // ── Attendance (last 30 days) ──────────────────────────────────────────────────
  const existingAttendance = await prisma.attendance.count({ where: { timestamp: { gte: daysAgo(31) } } });
  if (existingAttendance === 0) {
    const activeMembers = members.filter(m => ["active", "trial"].includes(m.status));
    const attendanceRows: { memberId: number; classId: number; timestamp: Date; source: string }[] = [];
    for (let d = 1; d <= 30; d++) {
      const ts = daysAgo(d);
      ts.setHours(18, Math.floor(Math.random() * 30), 0, 0);
      const attendees = [...activeMembers].sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 4));
      const cls = seededClasses[Math.floor(Math.random() * seededClasses.length)];
      for (const member of attendees) {
        attendanceRows.push({ memberId: member.id, classId: cls.id, timestamp: ts, source: "kiosk" });
      }
    }
    await prisma.attendance.createMany({ data: attendanceRows });
    console.log(`Seeded ${attendanceRows.length} attendance records.`);
  } else {
    console.log(`Skipped attendance (${existingAttendance} records already exist).`);
  }

  // ── Users ─────────────────────────────────────────────────────────────────────
  const alice = members.find(m => m.name === "Alice Johnson");
  const [adminHash, staffHash, aliceHash, bobHash] = await Promise.all([
    bcrypt.hash("admin1234", 10),
    bcrypt.hash("staff1234", 10),
    bcrypt.hash("member1234", 10),
    bcrypt.hash("parent1234", 10),
  ]);

  await prisma.user.upsert({
    where: { email: "admin@bjj.local" },
    update: {},
    create: { email: "admin@bjj.local", name: "Admin", passwordHash: adminHash, role: "admin" },
  });
  await prisma.user.upsert({
    where: { email: "staff@bjj.local" },
    update: {},
    create: { email: "staff@bjj.local", name: "Staff User", passwordHash: staffHash, role: "front_desk" },
  });
  if (alice) {
    await prisma.user.upsert({
      where: { email: "alice@example.com" },
      update: {},
      create: { email: "alice@example.com", name: "Alice Johnson", passwordHash: aliceHash, role: "member", memberId: alice.id },
    });
  }
  if (bob) {
    await prisma.user.upsert({
      where: { email: "bob@example.com" },
      update: {},
      create: { email: "bob@example.com", name: "Bob Martinez", passwordHash: bobHash, role: "parent", memberId: bob.id },
    });
  }

  console.log("Seeded users:");
  console.log("  admin@bjj.local   / admin1234  (admin)");
  console.log("  staff@bjj.local   / staff1234  (front_desk)");
  console.log("  alice@example.com / member1234 (member portal)");
  console.log("  bob@example.com   / parent1234 (parent portal)");

  // ── Belt Requirements ─────────────────────────────────────────────────────────
  const beltReqs = [
    { beltRank: "blue",   minClasses: 100, minMonths: 12, minTechniques: 18 },
    { beltRank: "purple", minClasses: 200, minMonths: 24, minTechniques: 15 },
    { beltRank: "brown",  minClasses: 200, minMonths: 36, minTechniques: 12 },
    { beltRank: "black",  minClasses: 200, minMonths: 48, minTechniques: 10 },
  ];
  for (const r of beltReqs) {
    const existing = await prisma.beltRequirement.findFirst({ where: { beltRank: r.beltRank } });
    if (existing) {
      await prisma.beltRequirement.update({ where: { id: existing.id }, data: r });
    } else {
      await prisma.beltRequirement.create({ data: r });
    }
  }
  console.log("Seeded belt requirements.");

  // ── POS Items ─────────────────────────────────────────────────────────────────
  const posItems = [
    { name: "Water",             category: "drinks", priceCents:  200, taxRate: 0,   stock: 50 },
    { name: "Gatorade",          category: "drinks", priceCents:  300, taxRate: 0,   stock: 30 },
    { name: "Coffee",            category: "drinks", priceCents:  300, taxRate: 0,   stock: null },
    { name: "Protein Shake",     category: "drinks", priceCents:  500, taxRate: 0,   stock: 20 },
    { name: "Energy Drink",      category: "drinks", priceCents:  400, taxRate: 0,   stock: 24 },
    { name: "Mouth Guard",       category: "gear",   priceCents: 1500, taxRate: 8.5, stock: 15 },
    { name: "Rash Guard",        category: "gear",   priceCents: 4500, taxRate: 8.5, stock: 10 },
    { name: "BJJ Shorts",        category: "gear",   priceCents: 3500, taxRate: 8.5, stock: 8  },
    { name: "Spats",             category: "gear",   priceCents: 4000, taxRate: 8.5, stock: 6  },
    { name: "Ear Guards",        category: "gear",   priceCents: 2500, taxRate: 8.5, stock: 5  },
    { name: "Competition Entry", category: "events", priceCents: 7500, taxRate: 0,   stock: null },
    { name: "Seminar Ticket",    category: "events", priceCents: 5000, taxRate: 0,   stock: 20 },
    { name: "Private Lesson",    category: "events", priceCents: 8000, taxRate: 0,   stock: null },
  ];
  for (const item of posItems) {
    const existing = await prisma.item.findFirst({ where: { name: item.name, category: item.category } });
    if (!existing) await prisma.item.create({ data: item });
  }
  console.log(`Seeded ${posItems.length} POS items.`);

  // ── Marketing Workflows ───────────────────────────────────────────────────────
  const workflows = [
    { name: "Win-back Inactive Members",  triggerType: "inactivity",       active: true, config: { channel: "email", subject: "We miss you, {{name}}!", body: "Hey {{name}}, it's been {{days}} days since we've seen you on the mats. Come back!", inactivity_days: 30, cooldown_days: 30 } },
    { name: "Trial Convert — 3 Classes",  triggerType: "trial_attendance", active: true, config: { channel: "email", subject: "Ready to join, {{name}}?", body: "You've attended {{classes}} classes — let's make it official. Ask at the front desk.", trial_classes: 3, cooldown_days: 7 } },
    { name: "Birthday Shoutout",          triggerType: "birthday",         active: true, config: { channel: "in_app", body: "Happy Birthday {{name}}! See you on the mats!", cooldown_days: 365 } },
    { name: "Failed Payment Alert",       triggerType: "failed_payment",   active: true, config: { channel: "email", subject: "Action needed: update your payment info", body: "Hi {{name}}, we had trouble processing your last payment. Please update your payment method.", cooldown_days: 14 } },
    { name: "Belt Promotion Congrats",    triggerType: "promotion",        active: true, config: { channel: "in_app", body: "Congratulations {{name}} on your {{belt}} belt! Keep training!", cooldown_days: 0 } },
  ];
  for (const wf of workflows) {
    const existing = await prisma.workflow.findFirst({ where: { name: wf.name } });
    if (!existing) await prisma.workflow.create({ data: wf });
  }
  console.log(`Seeded ${workflows.length} marketing workflows.`);

  console.log("\nDone! Trinity Martial Arts is ready to go.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
