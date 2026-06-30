import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const PREFIX = "mc_live_";

export function generateRawKey(): string {
  return PREFIX + randomBytes(24).toString("base64url");
}

export async function hashKey(rawKey: string): Promise<string> {
  return bcrypt.hash(rawKey, 10);
}

export async function verifyKey(rawKey: string): Promise<{ id: string; name: string } | null> {
  if (!rawKey.startsWith(PREFIX)) return null;

  // Look up by prefix to narrow candidates before bcrypt
  const prefix = rawKey.slice(0, PREFIX.length + 8);
  const candidates = await prisma.apiKey.findMany({
    where: { prefix, enabled: true },
    select: { id: true, name: true, keyHash: true },
  });

  for (const candidate of candidates) {
    const match = await bcrypt.compare(rawKey, candidate.keyHash);
    if (match) {
      await prisma.apiKey.update({
        where: { id: candidate.id },
        data: { lastUsedAt: new Date() },
      });
      return { id: candidate.id, name: candidate.name };
    }
  }
  return null;
}

export async function createApiKey(name: string) {
  const rawKey = generateRawKey();
  const keyHash = await hashKey(rawKey);
  const prefix = rawKey.slice(0, PREFIX.length + 8);

  const record = await prisma.apiKey.create({
    data: { name, keyHash, prefix },
  });

  return { record, rawKey };
}
