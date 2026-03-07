import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Create summary letter
export async function POST(
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
        summary: {
          include: { review: true },
        },
        portal: {
          include: {
            doctorProfile: {
              include: { user: { select: { name: true } } },
            },
          },
        },
        patient: {
          select: {
            name: true,
            patientProfile: {
              select: { phone: true, dateOfBirth: true },
            },
          },
        },
        summaryLetter: true,
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

    if (!consultation.summary) {
      return NextResponse.json(
        { error: "No summary available to create a letter from" },
        { status: 400 }
      );
    }

    if (consultation.summaryLetter) {
      return NextResponse.json(
        { error: "A summary letter already exists for this consultation" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content, patientIdNumber } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Summary letter content is required" },
        { status: 400 }
      );
    }

    const doctorProfile = consultation.portal.doctorProfile;
    const doctorName = doctorProfile.user.name;
    const clinicName = doctorProfile.clinicName;

    const letter = await prisma.summaryLetter.create({
      data: {
        consultationId: params.id,
        content: content.trim(),
        doctorName,
        clinicName,
        patientName: consultation.patient.name,
        patientId: patientIdNumber || null,
      },
    });

    // Mark any pending document requests as completed
    await prisma.documentRequest.updateMany({
      where: {
        consultationId: params.id,
        requestType: "SUMMARY_LETTER",
        status: "PENDING",
      },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json(letter, { status: 201 });
  } catch (error) {
    console.error("Summary letter creation error:", error);
    return NextResponse.json(
      { error: "Failed to create summary letter" },
      { status: 500 }
    );
  }
}

// Get summary letter
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        summaryLetter: true,
        prescriptions: {
          include: { items: true },
        },
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

    const isPatient = consultation.patientId === session.user.id;
    const isDoctor =
      session.user.role === "DOCTOR" &&
      consultation.portal.doctorProfile.userId === session.user.id;

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const doctorProfile = consultation.portal.doctorProfile;

    return NextResponse.json({
      summaryLetter: consultation.summaryLetter,
      prescriptions: consultation.prescriptions,
      doctorProfile: {
        stampUrl: doctorProfile.stampUrl,
        signatureUrl: doctorProfile.signatureUrl,
        clinicName: doctorProfile.clinicName,
        specialty: doctorProfile.specialty,
      },
      doctorName: doctorProfile.user.name,
      patientName: consultation.patient.name,
    });
  } catch (error) {
    console.error("Summary letter fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
