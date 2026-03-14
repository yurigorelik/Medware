import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPatient } from "@/lib/roles";

// Get patient profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isPatient(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create or update patient profile
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isPatient(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      dateOfBirth,
      gender,
      preferredLanguage,
      medicalHistory,
      currentMedications,
      allergies,
      pastProcedures,
      familyHistory,
      socialHistory,
    } = body;

    const profile = await prisma.patientProfile.upsert({
      where: { userId: session.user.id },
      update: {
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        preferredLanguage: preferredLanguage || null,
        medicalHistory: medicalHistory || null,
        currentMedications: currentMedications || null,
        allergies: allergies || null,
        pastProcedures: pastProcedures || null,
        familyHistory: familyHistory || null,
        socialHistory: socialHistory || null,
      },
      create: {
        userId: session.user.id,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        preferredLanguage: preferredLanguage || null,
        medicalHistory: medicalHistory || null,
        currentMedications: currentMedications || null,
        allergies: allergies || null,
        pastProcedures: pastProcedures || null,
        familyHistory: familyHistory || null,
        socialHistory: socialHistory || null,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
