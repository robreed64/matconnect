import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import EditMemberForm from "./EditMemberForm";

type Params = Promise<{ id: string }>;

export default async function EditMemberPage({ params }: { params: Params }) {
  const { id } = await params;

  const session = await auth();
  const role    = (session?.user as { role?: string } | undefined)?.role;
  if (!can(role, "manage_members")) {
    redirect(`/admin/members/${id}`);
  }

  return <EditMemberForm id={id} />;
}
