import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ImportRow = {
  name?: string;
  email?: string;
  phone?: string;
  beltRank?: string;
  status?: string;
  notes?: string;
  ageGroup?: string;
  trainingType?: string;
  address?: string;
  dateOfBirth?: string;
};

type ImportPreview = {
  rows: (ImportRow & { _index: number; _error?: string; _duplicate?: boolean; _existingId?: number })[];
  headers: string[];
  errors: string[];
  duplicates: number;
};

async function parseCSV(text: string): Promise<{ headers: string[]; rows: string[][] }> {
  const lines = text.trim().split("\n");
  if (lines.length === 0) throw new Error("CSV is empty");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => line.split(",").map((v) => v.trim()));

  return { headers, rows };
}

function normalizeHeaderName(header: string): string {
  const normalized = header.toLowerCase().replace(/\s+/g, "");
  const mapping: Record<string, string> = {
    name: "name",
    fullname: "name",
    givenname: "name",
    firstname: "name",
    lastname: "name",
    email: "email",
    emailaddress: "email",
    phone: "phone",
    phonenumber: "phone",
    mobilenumber: "phone",
    telephone: "phone",
    beltrank: "beltRank",
    belt: "beltRank",
    rank: "beltRank",
    status: "status",
    membershipstatus: "status",
    notes: "notes",
    memo: "notes",
    agegroup: "ageGroup",
    age: "ageGroup",
    trainingtype: "trainingType",
    training: "trainingType",
    address: "address",
    dateofbirth: "dateOfBirth",
    dob: "dateOfBirth",
    birthdate: "dateOfBirth",
  };
  return mapping[normalized] || header;
}

function detectHeaders(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeaderName(header);
    if (["name", "email", "phone", "beltRank", "status", "notes", "ageGroup", "trainingType", "address", "dateOfBirth"].includes(normalized)) {
      mapping[index] = normalized;
    }
  });
  return mapping;
}

function parseRow(row: string[], headerMapping: Record<number, string>): ImportRow {
  const result: ImportRow = {};
  Object.entries(headerMapping).forEach(([indexStr, fieldName]) => {
    const index = parseInt(indexStr, 10);
    const value = row[index];
    if (value) {
      result[fieldName as keyof ImportRow] = value;
    }
  });
  return result;
}

function validateRow(row: ImportRow): { valid: boolean; error?: string } {
  if (!row.name || row.name.trim().length === 0) {
    return { valid: false, error: "Name is required" };
  }
  if (row.beltRank && !["white", "blue", "purple", "brown", "black"].includes(row.beltRank.toLowerCase())) {
    return { valid: false, error: `Invalid belt rank: ${row.beltRank}` };
  }
  if (row.status && !["active", "trial", "lead", "past_due", "inactive", "canceled"].includes(row.status.toLowerCase())) {
    return { valid: false, error: `Invalid status: ${row.status}` };
  }
  if (row.ageGroup && !["kids", "adult"].includes(row.ageGroup.toLowerCase())) {
    return { valid: false, error: `Invalid age group: ${row.ageGroup}` };
  }
  if (row.trainingType && !["Gi", "No-Gi", "Both"].includes(row.trainingType)) {
    return { valid: false, error: `Invalid training type: ${row.trainingType}` };
  }
  if (row.dateOfBirth) {
    const date = new Date(row.dateOfBirth);
    if (isNaN(date.getTime())) {
      return { valid: false, error: `Invalid date of birth: ${row.dateOfBirth}` };
    }
  }
  return { valid: true };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const text = await file.text();
    const { headers, rows } = await parseCSV(text);
    const headerMapping = detectHeaders(headers);

    if (Object.keys(headerMapping).length === 0) {
      return NextResponse.json(
        { error: "No recognized columns found. Expected: name, email, phone, belt rank, status, notes, etc." },
        { status: 400 }
      );
    }

    const parsedRows = rows.map((row, index) => ({
      ...parseRow(row, headerMapping),
      _index: index + 2, // +2 because row 0 is headers, row 1 is first data row
    }));

    // Validate rows and check for duplicates
    const previewed: RowWithMetadata[] = await Promise.all(
      parsedRows.map(async (row) => {
        const validation = validateRow(row);
        if (!validation.valid) {
          return { ...row, _error: validation.error } as RowWithMetadata;
        }

        // Check if member with this email already exists
        if (row.email) {
          const existing = await prisma.member.findFirst({
            where: { email: row.email },
            select: { id: true },
          });
          if (existing) {
            return { ...row, _duplicate: true, _existingId: existing.id } as RowWithMetadata;
          }
        }

        return row as RowWithMetadata;
      })
    );

    const duplicates = previewed.filter((r) => r._duplicate).length;
    const errors = previewed.filter((r) => r._error).map((r) => `Row ${r._index}: ${r._error}`);

    const preview: ImportPreview = {
      rows: previewed as ImportPreview["rows"],
      headers: Object.values(headerMapping),
      errors,
      duplicates,
    };

    return NextResponse.json(preview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to parse CSV: ${message}` }, { status: 400 });
  }
}

type RowWithMetadata = ImportRow & { _index: number; _duplicate?: boolean; _existingId?: number; _error?: string };

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    const { rows, mergeMap } = body as {
      rows: RowWithMetadata[];
      mergeMap: Record<number, { skip?: boolean; update?: string[] }>; // mergeMap[existingId] = { skip: true } or { update: ['name', 'email'] }
    };

    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const created = [];
    const updated = [];
    const skipped = [];

    for (const row of rows) {
      const merge = mergeMap[row._existingId as number];
      if (row._duplicate && merge?.skip) {
        skipped.push(row._index);
        continue;
      }

      if (row._duplicate && merge?.update && row._existingId) {
        // Update existing member with selected fields
        type UpdateData = Record<string, string | number | Date | null>;
        const updateData: UpdateData = {};
        merge.update.forEach((field) => {
          const value = row[field as keyof ImportRow];
          if (value) {
            if (field === 'dateOfBirth') {
              updateData[field] = new Date(value);
            } else if (field === 'beltRank' || field === 'status' || field === 'ageGroup') {
              updateData[field] = (value as string).toLowerCase();
            } else {
              updateData[field] = value as string;
            }
          }
        });

        if (Object.keys(updateData).length > 0) {
          await prisma.member.update({
            where: { id: row._existingId },
            data: updateData,
          });
          updated.push(row._existingId);
        }
      } else if (!row._duplicate) {
        // Create new member
        type CreateData = {
          name: string;
          email?: string;
          phone?: string;
          beltRank?: string;
          status?: string;
          notes?: string;
          ageGroup?: string;
          trainingType?: string;
          address?: string;
          dateOfBirth?: Date;
        };
        const createData: CreateData = { name: row.name! };
        if (row.email) createData.email = row.email;
        if (row.phone) createData.phone = row.phone;
        if (row.beltRank) createData.beltRank = row.beltRank.toLowerCase();
        if (row.status) createData.status = row.status.toLowerCase();
        if (row.notes) createData.notes = row.notes;
        if (row.ageGroup) createData.ageGroup = row.ageGroup.toLowerCase();
        if (row.trainingType) createData.trainingType = row.trainingType;
        if (row.address) createData.address = row.address;
        if (row.dateOfBirth) createData.dateOfBirth = new Date(row.dateOfBirth);

        const member = await prisma.member.create({ data: createData });
        created.push(member.id);
      }
    }

    return NextResponse.json({ created: created.length, updated: updated.length, skipped: skipped.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to import members: ${message}` }, { status: 500 });
  }
}
