import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        emailVerified: true,
        createdAt: true,
        doctorProfile: {
          select: {
            specialty: true,
            portal: {
              select: {
                id: true,
                name: true,
                medicalField: true,
                isActive: true,
                _count: { select: { consultations: true } },
              },
            },
          },
        },
        _count: {
          select: {
            consultations: true,
            tokenUsages: true,
          },
        },
        tokenUsages: {
          select: {
            inputTokens: true,
            outputTokens: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute aggregated stats
    const usersWithStats = users.map((user) => {
      const totalInputTokens = user.tokenUsages.reduce(
        (sum, t) => sum + t.inputTokens,
        0
      );
      const totalOutputTokens = user.tokenUsages.reduce(
        (sum, t) => sum + t.outputTokens,
        0
      );

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isBlocked: user.isBlocked,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        consultationCount: user._count.consultations,
        doctorProfile: user.doctorProfile,
        tokenUsage: {
          totalInputTokens,
          totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          callCount: user._count.tokenUsages,
        },
      };
    });

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
