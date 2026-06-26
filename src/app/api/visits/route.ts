import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visits";

export const dynamic = "force-dynamic";

const visitInclude = {
  patient: { select: { id: true, name: true, email: true } },
  doctor: { select: { id: true, name: true, email: true, specialty: true } },
} as const;

// List visits for the current user, as patient and/or as doctor.
// Optional ?as=patient|doctor filters to a single side.
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const as = searchParams.get("as");

    const where =
      as === "patient"
        ? { patientId: session.user.id }
        : as === "doctor"
          ? { doctorId: session.user.id }
          : {
              OR: [
                { patientId: session.user.id },
                { doctorId: session.user.id },
              ],
            };

    const visits = await prisma.visit.findMany({
      where,
      include: visitInclude,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(visits);
  } catch (error) {
    console.error("Visit list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a visit request. Either side can initiate:
//  - role PATIENT: the current user picks a doctor (doctorId)
//  - role DOCTOR:  the current (doctor) user invites a patient by email
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const active = await requireActiveUser(session.user.id);
    if ("error" in active) return active.error;

    const body = await request.json();
    const { role, doctorId, patientEmail, reason, modality } = body;

    if (role !== "PATIENT" && role !== "DOCTOR") {
      return NextResponse.json(
        { error: "role must be PATIENT or DOCTOR" },
        { status: 400 }
      );
    }

    if (modality && modality !== "IN_PERSON" && modality !== "VIDEO") {
      return NextResponse.json({ error: "Invalid modality" }, { status: 400 });
    }

    let patientId: string;
    let resolvedDoctorId: string;

    if (role === "PATIENT") {
      // The current user is the patient and picks a doctor.
      if (!doctorId || typeof doctorId !== "string") {
        return NextResponse.json(
          { error: "doctorId is required" },
          { status: 400 }
        );
      }
      if (doctorId === session.user.id) {
        return NextResponse.json(
          { error: "You cannot request a visit with yourself" },
          { status: 400 }
        );
      }
      const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
      if (!doctor || !doctor.isDoctor) {
        return NextResponse.json(
          { error: "Doctor not found" },
          { status: 404 }
        );
      }
      if (doctor.isBlocked) {
        return NextResponse.json(
          { error: "This doctor is not accepting requests" },
          { status: 403 }
        );
      }
      patientId = session.user.id;
      resolvedDoctorId = doctor.id;
    } else {
      // The current user is the doctor and invites a patient by email.
      if (!active.user.isDoctor) {
        return NextResponse.json(
          { error: "Enable doctor mode before inviting patients" },
          { status: 403 }
        );
      }
      if (!patientEmail || typeof patientEmail !== "string") {
        return NextResponse.json(
          { error: "patientEmail is required" },
          { status: 400 }
        );
      }
      const patient = await prisma.user.findUnique({
        where: { email: patientEmail.trim() },
      });
      if (!patient) {
        return NextResponse.json(
          { error: "No user found with that email" },
          { status: 404 }
        );
      }
      if (patient.id === session.user.id) {
        return NextResponse.json(
          { error: "You cannot request a visit with yourself" },
          { status: 400 }
        );
      }
      // Reject requests targeting a blocked patient.
      if (patient.isBlocked) {
        return NextResponse.json(
          { error: "That patient account is blocked" },
          { status: 403 }
        );
      }
      patientId = patient.id;
      resolvedDoctorId = session.user.id;
    }

    const visit = await prisma.visit.create({
      data: {
        patientId,
        doctorId: resolvedDoctorId,
        requestedBy: role,
        status: "REQUESTED",
        reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
        modality: modality || "IN_PERSON",
      },
      include: visitInclude,
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error("Visit create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
