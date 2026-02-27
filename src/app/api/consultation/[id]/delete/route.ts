import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
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
        portal: {
          include: { doctorProfile: true },
        },
        summary: {
          include: { review: true },
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

    // Delete in correct order to respect foreign key constraints
    if (consultation.summary?.review) {
      await prisma.doctorReview.delete({
        where: { id: consultation.summary.review.id },
      });
    }

    if (consultation.summary) {
      await prisma.caseSummary.delete({
        where: { id: consultation.summary.id },
      });
    }

    await prisma.attachment.deleteMany({
      where: { consultationId: params.id },
    });

    await prisma.message.deleteMany({
      where: { consultationId: params.id },
    });

    await prisma.consultation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Consultation deleted" });
  } catch (error) {
    console.error("Delete consultation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
