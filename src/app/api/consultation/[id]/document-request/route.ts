import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Patient requests a document
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: params.id },
    });

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    if (consultation.patientId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (consultation.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Documents can only be requested for completed consultations" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { requestType, notes } = body;

    if (!requestType || !["SUMMARY_LETTER", "PRESCRIPTION"].includes(requestType)) {
      return NextResponse.json(
        { error: "Invalid request type. Must be SUMMARY_LETTER or PRESCRIPTION" },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const existing = await prisma.documentRequest.findFirst({
      where: {
        consultationId: params.id,
        patientId: session.user.id,
        requestType,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already have a pending request for this document type" },
        { status: 400 }
      );
    }

    const docRequest = await prisma.documentRequest.create({
      data: {
        consultationId: params.id,
        patientId: session.user.id,
        requestType,
        notes: notes || null,
      },
    });

    return NextResponse.json(docRequest, { status: 201 });
  } catch (error) {
    console.error("Document request error:", error);
    return NextResponse.json(
      { error: "Failed to create document request" },
      { status: 500 }
    );
  }
}

// Get document requests for a consultation
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
        portal: {
          include: { doctorProfile: true },
        },
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

    const requests = await prisma.documentRequest.findMany({
      where: { consultationId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Document request fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
