import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { doctorProfile: true, patientProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "BOTH" || user.role === "ADMIN") {
      return NextResponse.json(
        { error: "You already have both profiles" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { targetRole, specialty, licenseNumber } = body;

    if (!targetRole || !["DOCTOR", "PATIENT"].includes(targetRole)) {
      return NextResponse.json(
        { error: "Invalid target role" },
        { status: 400 }
      );
    }

    // A PATIENT wants to also become a DOCTOR
    if (user.role === "PATIENT" && targetRole === "DOCTOR") {
      if (user.doctorProfile) {
        return NextResponse.json(
          { error: "Doctor profile already exists" },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        prisma.doctorProfile.create({
          data: {
            userId: user.id,
            specialty: specialty || "General Medicine",
            licenseNumber: licenseNumber || null,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { role: "BOTH" },
        }),
      ]);

      return NextResponse.json({
        message: "Doctor profile created. You can now switch between roles.",
        role: "BOTH",
      });
    }

    // A DOCTOR wants to also become a PATIENT
    if (user.role === "DOCTOR" && targetRole === "PATIENT") {
      if (user.patientProfile) {
        return NextResponse.json(
          { error: "Patient profile already exists" },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        prisma.patientProfile.create({
          data: { userId: user.id },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { role: "BOTH" },
        }),
      ]);

      return NextResponse.json({
        message: "Patient profile created. You can now switch between roles.",
        role: "BOTH",
      });
    }

    return NextResponse.json(
      { error: "You already have this role" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Add role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
