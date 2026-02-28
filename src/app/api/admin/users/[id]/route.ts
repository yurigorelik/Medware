import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Block/Unblock user
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot block yourself" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isBlocked } = body;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { isBlocked },
      select: { id: true, name: true, isBlocked: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Admin block user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete yourself" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        doctorProfile: {
          include: {
            portal: {
              include: {
                consultations: {
                  include: {
                    summary: { include: { review: true } },
                  },
                },
              },
            },
          },
        },
        consultations: {
          include: {
            summary: { include: { review: true } },
          },
        },
        patientProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete in proper order respecting foreign keys
    // 1. Delete consultations where user is patient
    for (const consultation of user.consultations) {
      if (consultation.summary?.review) {
        await prisma.doctorReview.delete({ where: { id: consultation.summary.review.id } });
      }
      if (consultation.summary) {
        await prisma.caseSummary.delete({ where: { id: consultation.summary.id } });
      }
      await prisma.attachment.deleteMany({ where: { consultationId: consultation.id } });
      await prisma.message.deleteMany({ where: { consultationId: consultation.id } });
      await prisma.consultation.delete({ where: { id: consultation.id } });
    }

    // 2. Delete doctor-related data
    if (user.doctorProfile?.portal) {
      for (const consultation of user.doctorProfile.portal.consultations) {
        if (consultation.summary?.review) {
          await prisma.doctorReview.delete({ where: { id: consultation.summary.review.id } });
        }
        if (consultation.summary) {
          await prisma.caseSummary.delete({ where: { id: consultation.summary.id } });
        }
        await prisma.attachment.deleteMany({ where: { consultationId: consultation.id } });
        await prisma.message.deleteMany({ where: { consultationId: consultation.id } });
        await prisma.consultation.delete({ where: { id: consultation.id } });
      }
      await prisma.portal.delete({ where: { id: user.doctorProfile.portal.id } });
    }

    if (user.doctorProfile) {
      await prisma.doctorProfile.delete({ where: { id: user.doctorProfile.id } });
    }

    if (user.patientProfile) {
      await prisma.patientProfile.delete({ where: { id: user.patientProfile.id } });
    }

    // 3. Delete the user
    await prisma.user.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
