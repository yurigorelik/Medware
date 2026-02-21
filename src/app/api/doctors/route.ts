import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// List all doctors with active portals
export async function GET() {
  try {
    const doctors = await prisma.doctorProfile.findMany({
      where: {
        portal: {
          isActive: true,
        },
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
        portal: {
          select: {
            id: true,
            name: true,
            medicalField: true,
            welcomeMessage: true,
          },
        },
      },
    });

    return NextResponse.json(doctors);
  } catch (error) {
    console.error("Doctors fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
