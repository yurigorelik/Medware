import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visits";

export const dynamic = "force-dynamic";

// Get the current user's visit doctor settings.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isDoctor: true, specialty: true, bio: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Doctor mode fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Toggle doctor mode and update specialty / bio.
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const active = await requireActiveUser(session.user.id);
    if ("error" in active) return active.error;

    const body = await request.json();
    const { isDoctor, specialty, bio } = body;

    const data: { isDoctor?: boolean; specialty?: string | null; bio?: string | null } = {};
    if (typeof isDoctor === "boolean") {
      data.isDoctor = isDoctor;
    }
    if (specialty !== undefined) {
      data.specialty =
        typeof specialty === "string" && specialty.trim() ? specialty.trim() : null;
    }
    if (bio !== undefined) {
      data.bio = typeof bio === "string" && bio.trim() ? bio.trim() : null;
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { isDoctor: true, specialty: true, bio: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Doctor mode update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
