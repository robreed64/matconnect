import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SquareImportClient from "./SquareImportClient";

export default async function SquareImportPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") redirect("/admin");

  return <SquareImportClient />;
}
