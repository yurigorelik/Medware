import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      blockedUsers,
      totalConsultations,
      activeConsultations,
      completedConsultations,
      tokenUsage,
      recentUsers,
      recentConsultations,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.user.count({ where: { role: "DOCTOR" } }),
      prisma.user.count({ where: { role: "PATIENT" } }),
      prisma.user.count({ where: { isBlocked: true } }),
      prisma.consultation.count(),
      prisma.consultation.count({ where: { status: "ACTIVE" } }),
      prisma.consultation.count({ where: { status: "COMPLETED" } }),
      prisma.message.aggregate({
        _sum: {
          inputTokens: true,
          outputTokens: true,
        },
      }),
      prisma.user.findMany({
        where: { role: { not: "ADMIN" } },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.consultation.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          patient: { select: { name: true } },
          portal: {
            select: {
              medicalField: true,
              doctorProfile: {
                select: { user: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalDoctors,
      totalPatients,
      blockedUsers,
      totalConsultations,
      activeConsultations,
      completedConsultations,
      totalInputTokens: tokenUsage._sum.inputTokens || 0,
      totalOutputTokens: tokenUsage._sum.outputTokens || 0,
      totalTokens: (tokenUsage._sum.inputTokens || 0) + (tokenUsage._sum.outputTokens || 0),
      recentUsers,
      recentConsultations,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
