import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visits";

// Either party cancels. Allowed from REQUESTED, ACCEPTED or BOOKED.
// Any slot the patient had secured is released.
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

    const isPatientParty = visit.patientId === session.user.id;
    const isDoctorParty = visit.doctorId === session.user.id;
    if (!isPatientParty && !isDoctorParty) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cancelledBy = isPatientParty ? "PATIENT" : "DOCTOR";

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.visit.updateMany({
        where: { id: visit.id, status: { in: ["REQUESTED", "ACCEPTED", "BOOKED"] } },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy,
          // Release the unique link so the slot can be reused / cleaned up.
          scheduledSlotId: null,
        },
      });
      if (claimed.count !== 1) {
        throw new Error("VISIT_NOT_CANCELLABLE");
      }

      // Free the booked slot, if any.
      if (visit.scheduledSlotId) {
        await tx.slot.updateMany({
          where: { id: visit.scheduledSlotId, booked: true },
          data: { booked: false },
        });
      }
    });

    return NextResponse.json({ status: "CANCELLED" });
  } catch (error) {
    if (error instanceof Error && error.message === "VISIT_NOT_CANCELLABLE") {
      return NextResponse.json(
        { error: "This visit can no longer be cancelled" },
        { status: 409 }
      );
    }
    console.error("Visit cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
