import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Get a single visit. Patient, doctor, or admin (read-only) may view it.
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const visit = await prisma.visit.findUnique({
      where: { id: params.id },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: {
          select: { id: true, name: true, email: true, specialty: true, bio: true },
        },
        scheduledSlot: true,
        customSlots: { orderBy: { start: "asc" } },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const isParty =
      visit.patientId === session.user.id ||
      visit.doctorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isParty && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Slots the patient may currently choose from. Only meaningful once the
    // doctor has accepted and chosen a slot source.
    const now = new Date();
    let availableSlots: typeof visit.customSlots = [];
    if (visit.status === "ACCEPTED") {
      if (visit.slotSource === "CUSTOM") {
        availableSlots = visit.customSlots.filter(
          (s) => !s.booked && s.start > now
        );
      } else if (visit.slotSource === "EXISTING") {
        availableSlots = await prisma.slot.findMany({
          where: {
            doctorId: visit.doctorId,
            visitId: null,
            booked: false,
            start: { gt: now },
          },
          orderBy: { start: "asc" },
        });
      }
    }

    return NextResponse.json({
      ...visit,
      viewerRole:
        visit.patientId === session.user.id
          ? "PATIENT"
          : visit.doctorId === session.user.id
            ? "DOCTOR"
            : "ADMIN",
      availableSlots,
    });
  } catch (error) {
    console.error("Visit fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
