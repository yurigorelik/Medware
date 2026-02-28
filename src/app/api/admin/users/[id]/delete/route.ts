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
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Prevent deleting yourself
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        doctorProfile: {
          include: { portal: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete in proper order to respect foreign key constraints
    // 1. Delete token usages
    await prisma.tokenUsage.deleteMany({ where: { userId: params.id } });

    // 2. For patients: delete their consultations' data
    const patientConsultations = await prisma.consultation.findMany({
      where: { patientId: params.id },
      select: { id: true },
    });
    const patientConsultationIds = patientConsultations.map((c) => c.id);

    if (patientConsultationIds.length > 0) {
      // Delete reviews via summaries
      const summaries = await prisma.caseSummary.findMany({
        where: { consultationId: { in: patientConsultationIds } },
        select: { id: true },
      });
      const summaryIds = summaries.map((s) => s.id);
      if (summaryIds.length > 0) {
        await prisma.doctorReview.deleteMany({
          where: { summaryId: { in: summaryIds } },
        });
        await prisma.caseSummary.deleteMany({
          where: { id: { in: summaryIds } },
        });
      }
      await prisma.attachment.deleteMany({
        where: { consultationId: { in: patientConsultationIds } },
      });
      await prisma.message.deleteMany({
        where: { consultationId: { in: patientConsultationIds } },
      });
      await prisma.consultation.deleteMany({
        where: { id: { in: patientConsultationIds } },
      });
    }

    // 3. For doctors: delete portal and its consultations
    if (user.doctorProfile?.portal) {
      const portalConsultations = await prisma.consultation.findMany({
        where: { portalId: user.doctorProfile.portal.id },
        select: { id: true },
      });
      const portalConsultationIds = portalConsultations.map((c) => c.id);

      if (portalConsultationIds.length > 0) {
        const summaries = await prisma.caseSummary.findMany({
          where: { consultationId: { in: portalConsultationIds } },
          select: { id: true },
        });
        const summaryIds = summaries.map((s) => s.id);
        if (summaryIds.length > 0) {
          await prisma.doctorReview.deleteMany({
            where: { summaryId: { in: summaryIds } },
          });
          await prisma.caseSummary.deleteMany({
            where: { id: { in: summaryIds } },
          });
        }
        await prisma.attachment.deleteMany({
          where: { consultationId: { in: portalConsultationIds } },
        });
        await prisma.message.deleteMany({
          where: { consultationId: { in: portalConsultationIds } },
        });
        await prisma.consultation.deleteMany({
          where: { portalId: user.doctorProfile.portal.id },
        });
      }

      await prisma.portal.delete({
        where: { id: user.doctorProfile.portal.id },
      });
    }

    // 4. Delete profiles
    if (user.doctorProfile) {
      await prisma.doctorProfile.delete({
        where: { userId: params.id },
      });
    }
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: params.id },
    });
    if (patientProfile) {
      await prisma.patientProfile.delete({
        where: { userId: params.id },
      });
    }

    // 5. Delete user
    await prisma.user.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
