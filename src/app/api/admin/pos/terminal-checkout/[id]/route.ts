import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { finalizeTerminalCheckout, markTerminalCheckoutEnded } from "@/lib/pos-sale";
import { getTerminalCheckout, cancelTerminalCheckout } from "@/lib/payments/square-terminal";

type Params = Promise<{ id: string }>;

// POS polls this while "Waiting for terminal…". Asking Square directly (rather
// than waiting on our webhook) means the flow works with no webhook configured.
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("pos");
  if (error) return error;

  const { id } = await params;
  const row = await prisma.terminalCheckout.findUnique({ where: { id: parseInt(id, 10) } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Webhook may have finalized it already
  if (row.status !== "pending") {
    return NextResponse.json(await statusPayload(row.id));
  }

  let remote;
  try {
    remote = await getTerminalCheckout(row.squareCheckoutId);
  } catch (err) {
    console.error("Terminal checkout poll failed:", err);
    return NextResponse.json({ status: "pending" });
  }
  if (!remote) return NextResponse.json({ error: "Square not configured" }, { status: 503 });

  if (remote.status === "COMPLETED") {
    try {
      await finalizeTerminalCheckout(row.squareCheckoutId, remote.paymentId);
    } catch (err) {
      console.error("Terminal checkout finalization failed:", err);
    }
  } else if (remote.status === "CANCELED") {
    await markTerminalCheckoutEnded(row.squareCheckoutId, "canceled");
  }

  return NextResponse.json(await statusPayload(row.id));
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("pos");
  if (error) return error;

  const { id } = await params;
  const row = await prisma.terminalCheckout.findUnique({ where: { id: parseInt(id, 10) } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (row.status === "pending") {
    try {
      await cancelTerminalCheckout(row.squareCheckoutId);
    } catch { /* checkout may have just completed or timed out on the device */ }
    await markTerminalCheckoutEnded(row.squareCheckoutId, "canceled");
  }

  return NextResponse.json(await statusPayload(row.id));
}

// Mirrors the regular sale response shape so the POS receipt screen can reuse it
async function statusPayload(rowId: number) {
  const row = await prisma.terminalCheckout.findUniqueOrThrow({ where: { id: rowId } });
  if (row.status !== "completed" || !row.saleId) return { status: row.status };

  const sale = await prisma.sale.findUnique({
    where: { id: row.saleId },
    include: {
      lineItems: { include: { item: { select: { category: true } } } },
      member:    { select: { id: true, waiverSignedAt: true } },
    },
  });
  if (!sale) return { status: row.status };

  const hasDayPass = sale.lineItems.some((li) => li.item.category === "day_pass");
  return {
    status: row.status,
    sale: {
      id: sale.id,
      totalCents: sale.totalCents,
      checkedIn: hasDayPass && !!sale.member?.waiverSignedAt,
      waiverPending: hasDayPass && !!sale.member && !sale.member.waiverSignedAt,
    },
  };
}
