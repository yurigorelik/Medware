import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visits";

// Doctor marks a booked visit as completed. BOOKED -> COMPLETED.
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

    const result = await prisma.visit.updateMany({
      where: { id: visit.id, status: "BOOKED" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    if (result.count !== 1) {
      return NextResponse.json(
        { error: `Cannot complete a visit that is ${visit.status}` },
        { status: 409 }
      );
    }

    return NextResponse.json({ status: "COMPLETED" });
  } catch (error) {
    console.error("Visit complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
