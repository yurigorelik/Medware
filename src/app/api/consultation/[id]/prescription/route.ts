import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDoctor } from "@/lib/roles";

// Create prescription
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isDoctor(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        portal: {
          include: {
            doctorProfile: {
              include: { user: { select: { name: true } } },
            },
          },
        },
        patient: { select: { name: true } },
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

    const body = await request.json();
    const { items, patientIdNumber } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one prescription item is required" },
        { status: 400 }
      );
    }

    const doctorProfile = consultation.portal.doctorProfile;

    const prescription = await prisma.prescription.create({
      data: {
        consultationId: params.id,
        doctorName: doctorProfile.user.name,
        clinicName: doctorProfile.clinicName,
        patientName: consultation.patient.name,
        patientId: patientIdNumber || null,
        items: {
          create: items.map((item: {
            medicationName: string;
            dose?: string;
            route?: string;
            type?: string;
            duration?: string;
            instructions?: string;
          }) => ({
            medicationName: item.medicationName,
            dose: item.dose || null,
            route: item.route || null,
            type: item.type || null,
            duration: item.duration || null,
            instructions: item.instructions || null,
          })),
        },
      },
      include: { items: true },
    });

    // Mark any pending document requests as completed
    await prisma.documentRequest.updateMany({
      where: {
        consultationId: params.id,
        requestType: "PRESCRIPTION",
        status: "PENDING",
      },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    console.error("Prescription creation error:", error);
    return NextResponse.json(
      { error: "Failed to create prescription" },
      { status: 500 }
    );
  }
}
