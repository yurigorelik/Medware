import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/ai";

// Create a new consultation
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { portalId } = body;

    if (!portalId) {
      return NextResponse.json(
        { error: "Portal ID is required" },
        { status: 400 }
      );
    }

    const portal = await prisma.portal.findUnique({
      where: { id: portalId },
      include: {
        doctorProfile: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!portal || !portal.isActive) {
      return NextResponse.json(
        { error: "Portal not found or inactive" },
        { status: 404 }
      );
    }

    // Check for existing active consultation
    const existing = await prisma.consultation.findFirst({
      where: {
        portalId,
        patientId: session.user.id,
        status: "ACTIVE",
      },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const consultation = await prisma.consultation.create({
      data: {
        portalId,
        patientId: session.user.id,
      },
    });

    // Build system prompt and create initial AI message
    const systemPrompt = buildSystemPrompt({
      doctorName: portal.doctorProfile.user.name,
      medicalField: portal.medicalField,
      instructions: portal.instructions,
      guidelines: portal.guidelines,
      literature: portal.literature,
      sources: portal.sources,
      additionalDefinitions: portal.additionalDefinitions,
      welcomeMessage: portal.welcomeMessage,
    });

    // Store the system prompt as a system message
    await prisma.message.create({
      data: {
        consultationId: consultation.id,
        role: "SYSTEM",
        content: systemPrompt,
      },
    });

    // Create a welcome message from the AI
    const welcomeContent = portal.welcomeMessage
      ? portal.welcomeMessage
      : `Hello! I'm the AI medical assistant for Dr. ${portal.doctorProfile.user.name}'s ${portal.medicalField} practice. I'm here to help gather information about your medical concern so that Dr. ${portal.doctorProfile.user.name} can provide you with a thorough second opinion.\n\nPlease tell me: What is the main health concern or symptom that brings you here today?`;

    await prisma.message.create({
      data: {
        consultationId: consultation.id,
        role: "ASSISTANT",
        content: welcomeContent,
      },
    });

    return NextResponse.json(consultation, { status: 201 });
  } catch (error) {
    console.error("Consultation creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get consultations for the current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    if (session.user.role === "DOCTOR") {
      // Get consultations for the doctor's portal
      const profile = await prisma.doctorProfile.findUnique({
        where: { userId: session.user.id },
        include: { portal: true },
      });

      if (!profile?.portal) {
        return NextResponse.json([]);
      }

      const consultations = await prisma.consultation.findMany({
        where: {
          portalId: profile.portal.id,
          ...(status ? { status } : {}),
        },
        include: {
          patient: { select: { name: true, email: true } },
          summary: { include: { review: true } },
          _count: { select: { messages: true, attachments: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      return NextResponse.json(consultations);
    } else {
      // Get consultations for the patient
      const consultations = await prisma.consultation.findMany({
        where: {
          patientId: session.user.id,
          ...(status ? { status } : {}),
        },
        include: {
          portal: {
            include: {
              doctorProfile: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
          summary: { include: { review: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      return NextResponse.json(consultations);
    }
  } catch (error) {
    console.error("Consultation fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
