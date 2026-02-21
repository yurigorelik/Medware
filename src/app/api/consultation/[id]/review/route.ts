import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Doctor reviews/approves the case summary
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
        { error: "No summary to review" },
        { status: 400 }
      );
    }

    if (consultation.summary.review) {
      return NextResponse.json(
        { error: "This summary has already been reviewed" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      approved,
      editedSummary,
      editedDiagnosis,
      editedWorkup,
      doctorNotes,
    } = body;

    const review = await prisma.doctorReview.create({
      data: {
        summaryId: consultation.summary.id,
        approved: approved ?? true,
        editedSummary: editedSummary || null,
        editedDiagnosis: editedDiagnosis || null,
        editedWorkup: editedWorkup || null,
        doctorNotes: doctorNotes || null,
      },
    });

    // Update consultation status
    await prisma.consultation.update({
      where: { id: params.id },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
