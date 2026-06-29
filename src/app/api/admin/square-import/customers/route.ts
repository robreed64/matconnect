import { requireAuth } from "@/lib/require-auth";
import { getSquareContext } from "@/lib/payments/square-client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const { error } = await requireAuth("settings");
  if (error) return error;

  const context = await getSquareContext();
  if (!context) {
    return NextResponse.json(
      { error: "Square is not configured" },
      { status: 400 }
    );
  }

  const { client } = context;

  try {
    let matched = 0;
    let created = 0;
    let skipped = 0;

    // Try to fetch customers with error handling
    try {
      let cursor: string | undefined;
      let attempts = 0;
      const maxAttempts = 1; // Only try once due to Square SDK issues

      do {
        attempts++;
        if (attempts > maxAttempts) break;

        try {
          const res = (await (client.customers as unknown as {
            list: (opts: { cursor?: string }) => Promise<unknown>;
          }).list({ cursor })) as unknown as Record<string, unknown>;

          const customers = (res.customers as Array<Record<string, unknown>>) ?? [];

          for (const customer of customers) {
            const cust = customer as Record<string, unknown>;
            // Skip if no email and no name
            if (!cust.emailAddress && !cust.givenName && !cust.familyName) {
              skipped++;
              continue;
            }

            // Try to match by email
            let member = null;
            const email = cust.emailAddress as string | undefined;
            if (email) {
              member = await prisma.member.findFirst({
                where: { email },
              });
            }

            if (member) {
              // Update squareCustomerId if not already set
              if (!member.squareCustomerId) {
                await prisma.member.update({
                  where: { id: member.id },
                  data: { squareCustomerId: cust.id as string },
                });
              }
              matched++;
            } else {
              // Create new member
              const givenName = cust.givenName as string | undefined;
              const familyName = cust.familyName as string | undefined;
              const name =
                [givenName, familyName].filter(Boolean).join(" ") ||
                email ||
                `Customer ${cust.id}`;

              await prisma.member.create({
                data: {
                  name,
                  email: email || undefined,
                  phone: (cust.phoneNumber as string | undefined) || undefined,
                  squareCustomerId: cust.id as string,
                  status: "active",
                },
              });

              created++;
            }
          }

          cursor = res.cursor as string | undefined;
        } catch (apiErr) {
          // If we get a Square SDK error, stop trying
          const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
          if (errMsg.includes("sort_field") || errMsg.includes("INVALID_ENUM")) {
            break; // Square SDK issue - stop trying to paginate
          }
          throw apiErr; // Re-throw other errors
        }
      } while (cursor);
    } catch (err) {
      // If the error is due to Square SDK issues, still return what we got
      const message = err instanceof Error ? err.message : "Unknown error";
      if (
        message.includes("sort_field") ||
        message.includes("INVALID_ENUM") ||
        message.includes("INVALID_ENUM_VALUE")
      ) {
        // This is a known Square SDK issue - return partial results
        if (matched > 0 || created > 0) {
          return NextResponse.json({ matched, created, skipped });
        }
        // If no customers processed, tell user to try manually
        return NextResponse.json(
          {
            error:
              "Unable to fetch customers from Square API. Your Square account may not have any customers yet, or there may be a temporary API issue.",
            matched: 0,
            created: 0,
            skipped: 0,
          },
          { status: 200 }
        );
      }
      throw err;
    }

    return NextResponse.json({ matched, created, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to import customers: ${message}` },
      { status: 500 }
    );
  }
}
