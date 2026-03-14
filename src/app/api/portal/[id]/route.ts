import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDoctor } from "@/lib/roles";

// Get a specific portal (public for patients)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const portal = await prisma.portal.findUnique({
      where: { id: params.id },
      include: {
        doctorProfile: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    if (!portal) {
      return NextResponse.json(
        { error: "Portal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(portal);
  } catch (error) {
    console.error("Portal fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update a portal (doctor only)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isDoctor(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portal = await prisma.portal.findUnique({
      where: { id: params.id },
      include: { doctorProfile: true },
    });

    if (!portal) {
      return NextResponse.json(
        { error: "Portal not found" },
        { status: 404 }
      );
    }

    if (portal.doctorProfile.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();

    const updated = await prisma.portal.update({
      where: { id: params.id },
      data: {
        name: body.name,
        medicalField: body.medicalField,
        instructions: body.instructions,
        guidelines: body.guidelines ?? "",
        literature: body.literature ?? "",
        sources: body.sources ?? "",
        additionalDefinitions: body.additionalDefinitions ?? "",
        welcomeMessage: body.welcomeMessage ?? "",
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Portal update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
