import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visits";

export const dynamic = "force-dynamic";

// List the current doctor's standing availability slots (visitId === null).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const slots = await prisma.slot.findMany({
      where: { doctorId: session.user.id, visitId: null },
      include: {
        bookedByVisit: { select: { id: true, status: true } },
      },
      orderBy: { start: "asc" },
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Availability fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a standing availability slot. Past-dated slots are rejected.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const active = await requireActiveUser(session.user.id);
    if ("error" in active) return active.error;

    if (!active.user.isDoctor) {
      return NextResponse.json(
        { error: "Enable doctor mode to manage availability" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const start = new Date(body?.start);
    const end = new Date(body?.end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Valid start and end are required" },
        { status: 400 }
      );
    }
    if (end <= start) {
      return NextResponse.json(
        { error: "End must be after start" },
        { status: 400 }
      );
    }
    if (start <= new Date()) {
      return NextResponse.json(
        { error: "Slots must be in the future" },
        { status: 400 }
      );
    }

    const slot = await prisma.slot.create({
      data: {
        doctorId: session.user.id,
        start,
        end,
      },
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    console.error("Availability create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
