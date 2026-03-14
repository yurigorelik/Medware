import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCaseSummary } from "@/lib/ai";
import { isPatient as isPatientRole, isDoctor as isDoctorRole } from "@/lib/roles";

// Generate case summary
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isPatientRole(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        summary: true,
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

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    if (consultation.patientId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (consultation.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Summary has already been generated for this consultation" },
        { status: 400 }
      );
    }

    if (consultation.summary) {
      return NextResponse.json(
        { error: "A summary already exists" },
        { status: 400 }
      );
    }

    // Get all messages
    const messages = await prisma.message.findMany({
      where: { consultationId: params.id },
      orderBy: { createdAt: "asc" },
    });

    const systemMessage = messages.find((m) => m.role === "SYSTEM");
    const chatMessages = messages
      .filter((m) => m.role !== "SYSTEM")
      .map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

    if (chatMessages.length < 3) {
      return NextResponse.json(
        { error: "Please continue the consultation a bit longer before requesting a summary" },
        { status: 400 }
      );
    }

    // Generate summary
    const result = await generateCaseSummary(
      systemMessage?.content || "",
      chatMessages
    );

    // Track token usage on a placeholder message
    if (result.inputTokens || result.outputTokens) {
      await prisma.message.create({
        data: {
          consultationId: params.id,
          role: "SYSTEM",
          content: "[Summary generation]",
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      });
    }

    // Save summary
    const summary = await prisma.caseSummary.create({
      data: {
        consultationId: params.id,
        summary: result.summary,
        differentialDiagnosis: result.differentialDiagnosis,
        suggestedWorkup: result.suggestedWorkup,
      },
    });

    // Update consultation status
    await prisma.consultation.update({
      where: { id: params.id },
      data: { status: "SUMMARY_GENERATED" },
    });

    return NextResponse.json(summary, { status: 201 });
  } catch (error) {
    console.error("Summary generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary. Please try again." },
      { status: 500 }
    );
  }
}

// Get case summary
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consultation = await prisma.consultation.findUnique({
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
        patient: { select: { name: true } },
      },
    });

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    // Verify access
    const isPatient = consultation.patientId === session.user.id;
    const isDoctor =
      isDoctorRole(session.user.role) &&
      consultation.portal.doctorProfile.userId === session.user.id;

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!consultation.summary) {
      return NextResponse.json(
        { error: "No summary available yet" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      consultation: {
        id: consultation.id,
        status: consultation.status,
        patientName: consultation.patient.name,
        doctorName: consultation.portal.doctorProfile.user.name,
        medicalField: consultation.portal.medicalField,
        createdAt: consultation.createdAt,
      },
      summary: consultation.summary,
    });
  } catch (error) {
    console.error("Summary fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
