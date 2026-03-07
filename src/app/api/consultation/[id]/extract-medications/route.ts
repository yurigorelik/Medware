import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractMedicationsFromSummary } from "@/lib/ai";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        summary: {
          include: { review: true },
        },
        portal: {
          include: { doctorProfile: true },
        },
      },
    });

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    if (consultation.portal.doctorProfile.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!consultation.summary) {
      return NextResponse.json(
        { error: "No summary available" },
        { status: 400 }
      );
    }

    const review = consultation.summary.review;
    const summaryText = review?.editedSummary || consultation.summary.summary;
    const diagnosisText = review?.editedDiagnosis || consultation.summary.differentialDiagnosis;
    const workupText = review?.editedWorkup || consultation.summary.suggestedWorkup;

    const result = await extractMedicationsFromSummary(
      summaryText,
      diagnosisText,
      workupText
    );

    return NextResponse.json({
      medications: result.medications,
    });
  } catch (error) {
    console.error("Medication extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract medications" },
      { status: 500 }
    );
  }
}
