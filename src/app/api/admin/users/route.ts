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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        emailVerified: true,
        lastActiveAt: true,
        createdAt: true,
        doctorProfile: {
          select: {
            specialty: true,
            portal: {
              select: {
                name: true,
                isActive: true,
                _count: { select: { consultations: true } },
              },
            },
          },
        },
        consultations: {
          select: {
            id: true,
            status: true,
            messages: {
              select: {
                inputTokens: true,
                outputTokens: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const usersWithStats = users.map((user) => {
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let consultationCount = 0;

      if (user.role === "PATIENT") {
        consultationCount = user.consultations.length;
        for (const c of user.consultations) {
          for (const m of c.messages) {
            totalInputTokens += m.inputTokens;
            totalOutputTokens += m.outputTokens;
          }
        }
      } else if (user.role === "DOCTOR") {
        consultationCount = user.doctorProfile?.portal?._count?.consultations || 0;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isBlocked: user.isBlocked,
        emailVerified: user.emailVerified,
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt,
        specialty: user.doctorProfile?.specialty || null,
        portalName: user.doctorProfile?.portal?.name || null,
        portalActive: user.doctorProfile?.portal?.isActive ?? null,
        consultationCount,
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
      };
    });

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
