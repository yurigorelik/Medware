import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveUser, BookingError } from "@/lib/visits";

// Patient secures an open slot for an accepted visit. ACCEPTED -> BOOKED.
//
// Booking is the high-contention path, so the transaction:
//  1. claims the VISIT first with a status-guarded updateMany (count === 1) to
//     stop a same-visit double-submit, THEN
//  2. validates and claims the SLOT with a booked-guarded updateMany to stop
//     two patients taking the same standing slot.
// Any failure throws a BookingError sentinel to roll the whole thing back.
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
    if (visit.patientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (visit.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: `Cannot book a visit that is ${visit.status}` },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { slotId, acceptTerms } = body;

    // The patient must explicitly accept the cost and terms.
    if (acceptTerms !== true) {
      return NextResponse.json(
        { error: "You must accept the cost and terms" },
        { status: 400 }
      );
    }
    if (!slotId || typeof slotId !== "string") {
      return NextResponse.json({ error: "slotId is required" }, { status: 400 });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Claim the visit first.
      const claimed = await tx.visit.updateMany({
        where: { id: visit.id, status: "ACCEPTED" },
        data: { status: "BOOKED" },
      });
      if (claimed.count !== 1) {
        throw new BookingError("VISIT_NOT_CLAIMABLE");
      }

      // 2. Validate the chosen slot belongs to this doctor, matches the
      //    visit's slot source, and is in the future.
      const slot = await tx.slot.findUnique({ where: { id: slotId } });
      if (!slot) {
        throw new BookingError("SLOT_NOT_FOUND");
      }
      if (slot.doctorId !== visit.doctorId) {
        throw new BookingError("SLOT_WRONG_DOCTOR");
      }
      if (visit.slotSource === "CUSTOM" && slot.visitId !== visit.id) {
        throw new BookingError("SLOT_WRONG_SOURCE");
      }
      if (visit.slotSource === "EXISTING" && slot.visitId !== null) {
        throw new BookingError("SLOT_WRONG_SOURCE");
      }
      if (slot.start <= now) {
        throw new BookingError("SLOT_IN_PAST");
      }

      // 3. Claim the slot.
      const claimedSlot = await tx.slot.updateMany({
        where: { id: slot.id, booked: false },
        data: { booked: true },
      });
      if (claimedSlot.count !== 1) {
        throw new BookingError("SLOT_TAKEN");
      }

      // 4. Attach the slot to the visit and record terms acceptance.
      await tx.visit.update({
        where: { id: visit.id },
        data: {
          scheduledSlotId: slot.id,
          scheduledStart: slot.start,
          scheduledEnd: slot.end,
          termsAcceptedAt: now,
        },
      });
    });

    const updated = await prisma.visit.findUnique({
      where: { id: visit.id },
      include: { scheduledSlot: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof BookingError) {
      const map: Record<
        BookingError["code"],
        { status: number; message: string }
      > = {
        VISIT_NOT_CLAIMABLE: {
          status: 409,
          message: "Visit is no longer available to book",
        },
        SLOT_NOT_FOUND: { status: 404, message: "Slot not found" },
        SLOT_WRONG_DOCTOR: {
          status: 400,
          message: "That slot does not belong to this doctor",
        },
        SLOT_WRONG_SOURCE: {
          status: 400,
          message: "That slot is not offered for this visit",
        },
        SLOT_IN_PAST: { status: 400, message: "That slot is in the past" },
        SLOT_TAKEN: { status: 409, message: "That slot was just taken" },
      };
      const { status, message } = map[error.code];
      return NextResponse.json({ error: message }, { status });
    }
    console.error("Visit book error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
