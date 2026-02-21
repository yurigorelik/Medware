import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Create a portal
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: session.user.id },
      include: { portal: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Doctor profile not found" },
        { status: 404 }
      );
    }

    if (profile.portal) {
      return NextResponse.json(
        { error: "You already have a portal. Edit it instead." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      medicalField,
      instructions,
      guidelines,
      literature,
      sources,
      additionalDefinitions,
      welcomeMessage,
    } = body;

    if (!name || !medicalField || !instructions) {
      return NextResponse.json(
        { error: "Name, medical field, and instructions are required" },
        { status: 400 }
      );
    }

    const portal = await prisma.portal.create({
      data: {
        doctorProfileId: profile.id,
        name,
        medicalField,
        instructions,
        guidelines: guidelines || "",
        literature: literature || "",
        sources: sources || "",
        additionalDefinitions: additionalDefinitions || "",
        welcomeMessage: welcomeMessage || "",
      },
    });

    return NextResponse.json(portal, { status: 201 });
  } catch (error) {
    console.error("Portal creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get the current doctor's portal
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        portal: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Doctor profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(profile.portal);
  } catch (error) {
    console.error("Portal fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
