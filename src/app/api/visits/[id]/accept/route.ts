import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  requireActiveUser,
  isValidCostCents,
  isValidCurrency,
  isHttpUrl,
  DEFAULT_CURRENCY,
} from "@/lib/visits";

const MAX_CUSTOM_SLOTS = 50;

// Doctor accepts a requested visit: sets cost, terms, modality and the slot
// source (custom slots provided now, or the doctor's standing availability).
// REQUESTED -> ACCEPTED.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const active = await requireActiveUser(session.user.id);
    if ("error" in active) return active.error;

    const visit = await prisma.visit.findUnique({ where: { id: params.id } });
    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    if (visit.doctorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (visit.status !== "REQUESTED") {
      return NextResponse.json(
        { error: `Cannot accept a visit that is ${visit.status}` },
        { status: 409 }
      );
    }

    const body = await request.json();
    const {
      costCents,
      currency,
      modality,
      meetingLink,
      location,
      terms,
      slotSource,
      customSlots,
    } = body;

    if (!isValidCostCents(costCents)) {
      return NextResponse.json(
        { error: "costCents must be an integer between 0 and 100000000" },
        { status: 400 }
      );
    }

    const resolvedCurrency = currency ? String(currency).toUpperCase() : DEFAULT_CURRENCY;
    if (!isValidCurrency(resolvedCurrency)) {
      return NextResponse.json(
        { error: "currency must be a 3-letter code" },
        { status: 400 }
      );
    }

    if (modality !== "IN_PERSON" && modality !== "VIDEO") {
      return NextResponse.json({ error: "Invalid modality" }, { status: 400 });
    }

    if (modality === "VIDEO" && !isHttpUrl(meetingLink)) {
      return NextResponse.json(
        { error: "A video visit requires a valid http(s) meeting link" },
        { status: 400 }
      );
    }

    if (typeof terms !== "string" || !terms.trim()) {
      return NextResponse.json(
        { error: "terms are required" },
        { status: 400 }
      );
    }

    if (slotSource !== "CUSTOM" && slotSource !== "EXISTING") {
      return NextResponse.json(
        { error: "slotSource must be CUSTOM or EXISTING" },
        { status: 400 }
      );
    }

    // Validate and normalise custom slots up front (reject past-dated).
    const now = new Date();
    const parsedSlots: { start: Date; end: Date }[] = [];
    if (slotSource === "CUSTOM") {
      if (!Array.isArray(customSlots) || customSlots.length === 0) {
        return NextResponse.json(
          { error: "Provide at least one custom slot" },
          { status: 400 }
        );
      }
      if (customSlots.length > MAX_CUSTOM_SLOTS) {
        return NextResponse.json(
          { error: `At most ${MAX_CUSTOM_SLOTS} slots can be offered` },
          { status: 400 }
        );
      }
      for (const s of customSlots) {
        const start = new Date(s?.start);
        const end = new Date(s?.end);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return NextResponse.json(
            { error: "Each slot needs a valid start and end" },
            { status: 400 }
          );
        }
        if (end <= start) {
          return NextResponse.json(
            { error: "Slot end must be after its start" },
            { status: 400 }
          );
        }
        if (start <= now) {
          return NextResponse.json(
            { error: "Slots must be in the future" },
            { status: 400 }
          );
        }
        parsedSlots.push({ start, end });
      }
    }

    // Claim the visit with a status guard, then create custom slots in the
    // same transaction so an accept can't race against a cancel/decline.
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.visit.updateMany({
        where: { id: visit.id, status: "REQUESTED" },
        data: {
          status: "ACCEPTED",
          costCents,
          currency: resolvedCurrency,
          modality,
          meetingLink: modality === "VIDEO" ? String(meetingLink).trim() : null,
          location:
            typeof location === "string" && location.trim()
              ? location.trim()
              : null,
          terms: terms.trim(),
          slotSource,
          acceptedAt: new Date(),
        },
      });
      if (claimed.count !== 1) {
        throw new Error("VISIT_NOT_CLAIMABLE");
      }

      if (slotSource === "CUSTOM") {
        await tx.slot.createMany({
          data: parsedSlots.map((s) => ({
            doctorId: visit.doctorId,
            start: s.start,
            end: s.end,
            visitId: visit.id,
          })),
        });
      }
    });

    const updated = await prisma.visit.findUnique({
      where: { id: visit.id },
      include: { customSlots: { orderBy: { start: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "VISIT_NOT_CLAIMABLE") {
      return NextResponse.json(
        { error: "Visit is no longer pending" },
        { status: 409 }
      );
    }
    console.error("Visit accept error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
