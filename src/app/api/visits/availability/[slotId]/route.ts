import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visits";

// Delete a standing availability slot.
//
// A "booked" standing slot may be deleted ONLY if no visit actually references
// it (orphan cleanup — e.g. left over from a cancelled booking). If a visit
// still points at it, the doctor must cancel that visit first.
export async function DELETE(
  request: Request,
  { params }: { params: { slotId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const active = await requireActiveUser(session.user.id);
    if ("error" in active) return active.error;

    const slot = await prisma.slot.findUnique({
      where: { id: params.slotId },
      include: { bookedByVisit: { select: { id: true } } },
    });

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }
    if (slot.doctorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // This endpoint only manages standing availability, not per-visit slots.
    if (slot.visitId !== null) {
      return NextResponse.json(
        { error: "This slot belongs to a specific visit" },
        { status: 400 }
      );
    }
    // A live booking still references the slot — require cancelling the visit.
    if (slot.bookedByVisit) {
      return NextResponse.json(
        { error: "This slot is booked. Cancel the visit before removing it." },
        { status: 409 }
      );
    }

    await prisma.slot.delete({ where: { id: slot.id } });

    return NextResponse.json({ message: "Slot deleted" });
  } catch (error) {
    console.error("Availability delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
