import { NextResponse } from "next/server";
import { User } from "@prisma/client";
import { prisma } from "./prisma";

// Cost is stored as integer cents. 0 is allowed (free visit). The upper bound
// keeps obviously-bad input out of the database.
export const MAX_COST_CENTS = 100_000_000; // $1,000,000
export const DEFAULT_CURRENCY = "USD";

export function isHttpUrl(value: unknown): boolean {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());
}

export function isValidCurrency(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

export function isValidCostCents(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_COST_CENTS
  );
}

/**
 * Load the acting user and reject blocked accounts before any mutation.
 * Returns either the user or a ready-to-return NextResponse error.
 */
export async function requireActiveUser(
  userId: string
): Promise<{ user: User } | { error: NextResponse }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }
  if (user.isBlocked) {
    return {
      error: NextResponse.json(
        { error: "Your account has been blocked." },
        { status: 403 }
      ),
    };
  }
  return { user };
}

// Sentinel used inside the booking transaction so any failure rolls the whole
// thing back. The `code` maps to an HTTP status / message outside the tx.
export class BookingError extends Error {
  code:
    | "VISIT_NOT_CLAIMABLE"
    | "SLOT_NOT_FOUND"
    | "SLOT_WRONG_DOCTOR"
    | "SLOT_WRONG_SOURCE"
    | "SLOT_IN_PAST"
    | "SLOT_TAKEN";

  constructor(code: BookingError["code"]) {
    super(code);
    this.name = "BookingError";
    this.code = code;
  }
}
