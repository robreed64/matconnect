import { NextResponse } from "next/server";
import { getGymSettings } from "@/lib/gym-settings";

export async function GET() {
  const settings = await getGymSettings();
  const programTypes = (settings.programTypes as string[]) ?? [];
  return NextResponse.json(programTypes);
}
