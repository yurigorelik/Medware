import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildFollowUpSystemPrompt, buildPatientMedicalSummary } from "@/lib/ai";

// Create a follow-up consultation from a completed one
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the original consultation with summary and review
    const originalConsultation = await prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        summary: {
          include: { review: true },
        },
        portal: {
          include: {
            doctorProfile: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!originalConsultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    if (originalConsultation.patientId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (originalConsultation.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Original consultation must be completed before starting a follow-up" },
        { status: 400 }
      );
    }

    if (!originalConsultation.summary?.review?.followUpRequested) {
      return NextResponse.json(
        { error: "Follow-up was not requested for this consultation" },
        { status: 400 }
      );
    }

    if (!originalConsultation.portal.isActive) {
      return NextResponse.json(
        { error: "Doctor's portal is no longer active" },
        { status: 400 }
      );
    }

    // Check if a follow-up already exists for this consultation
    const existingFollowUp = await prisma.consultation.findFirst({
      where: { parentConsultationId: params.id },
    });

    if (existingFollowUp) {
      // Return the existing follow-up instead of creating a new one
      return NextResponse.json(existingFollowUp);
    }

    // Fetch patient medical profile for context
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    // Create the follow-up consultation
    const followUpConsultation = await prisma.consultation.create({
      data: {
        portalId: originalConsultation.portalId,
        patientId: session.user.id,
        parentConsultationId: originalConsultation.id,
      },
    });

    const portal = originalConsultation.portal;
    const review = originalConsultation.summary!.review!;

    // Build patient medical summary from profile
    const patientSummary = patientProfile
      ? buildPatientMedicalSummary(patientProfile)
      : undefined;

    // Build follow-up system prompt with context from the original consultation
    const systemPrompt = buildFollowUpSystemPrompt(
      {
        doctorName: portal.doctorProfile.user.name,
        medicalField: portal.medicalField,
        instructions: portal.instructions,
        guidelines: portal.guidelines,
        literature: portal.literature,
        sources: portal.sources,
        additionalDefinitions: portal.additionalDefinitions,
        welcomeMessage: portal.welcomeMessage,
      },
      {
        originalSummary: originalConsultation.summary!.summary,
        originalDiagnosis: originalConsultation.summary!.differentialDiagnosis,
        originalWorkup: originalConsultation.summary!.suggestedWorkup,
        doctorNotes: review.doctorNotes,
        editedSummary: review.editedSummary,
        editedDiagnosis: review.editedDiagnosis,
        editedWorkup: review.editedWorkup,
      },
      patientSummary
    );

    // Store the system prompt
    await prisma.message.create({
      data: {
        consultationId: followUpConsultation.id,
        role: "SYSTEM",
        content: systemPrompt,
      },
    });

    // Create a follow-up welcome message
    const welcomeContent = `Hello! Welcome back to your follow-up consultation with Dr. ${portal.doctorProfile.user.name}'s ${portal.medicalField} practice.\n\nI have your previous consultation details on file and I'd like to check in on your progress. Let's start by discussing how you've been feeling since your last visit.\n\nHave your symptoms changed since the last consultation? Have they improved, worsened, or stayed about the same?`;

    await prisma.message.create({
      data: {
        consultationId: followUpConsultation.id,
        role: "ASSISTANT",
        content: welcomeContent,
      },
    });

    return NextResponse.json(followUpConsultation, { status: 201 });
  } catch (error) {
    console.error("Follow-up creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
