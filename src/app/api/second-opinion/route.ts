import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSecondOpinionSystemPrompt } from "@/lib/ai";

// Create a new second opinion consultation
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { patientName } = body;

    if (!patientName || !patientName.trim()) {
      return NextResponse.json(
        { error: "Patient name is required" },
        { status: 400 }
      );
    }

    // Get doctor's portal config for guidelines/literature
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true } },
        portal: true,
      },
    });

    if (!doctorProfile) {
      return NextResponse.json(
        { error: "Doctor profile not found" },
        { status: 404 }
      );
    }

    const secondOpinion = await prisma.secondOpinion.create({
      data: {
        doctorId: session.user.id,
        patientName: patientName.trim(),
      },
    });

    // Build system prompt with doctor's preferences
    const systemPrompt = buildSecondOpinionSystemPrompt({
      doctorName: doctorProfile.user.name,
      medicalField: doctorProfile.specialty,
      guidelines: doctorProfile.portal?.guidelines || "",
      literature: doctorProfile.portal?.literature || "",
      sources: doctorProfile.portal?.sources || "",
      additionalDefinitions: doctorProfile.portal?.additionalDefinitions || "",
    });

    // Store system prompt
    await prisma.secondOpinionMessage.create({
      data: {
        secondOpinionId: secondOpinion.id,
        role: "SYSTEM",
        content: systemPrompt,
      },
    });

    // Create welcome message
    const welcomeContent = `Hello Dr. ${doctorProfile.user.name}. I'm ready to provide a second opinion consultation on your patient "${patientName.trim()}".\n\nPlease present the case — include relevant history, chief complaint, physical exam findings, lab results, imaging, current medications, and any working diagnosis or clinical impression you have. I'll review everything and ask clarifying questions before providing my assessment.`;

    await prisma.secondOpinionMessage.create({
      data: {
        secondOpinionId: secondOpinion.id,
        role: "ASSISTANT",
        content: welcomeContent,
      },
    });

    return NextResponse.json(secondOpinion, { status: 201 });
  } catch (error) {
    console.error("Second opinion creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// List second opinion consultations for the current doctor
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secondOpinions = await prisma.secondOpinion.findMany({
      where: { doctorId: session.user.id },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(secondOpinions);
  } catch (error) {
    console.error("Second opinion fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
