import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get ratings for a doctor (by doctorProfileId query param) or get the current doctor's ratings
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const doctorProfileId = searchParams.get("doctorProfileId");

    if (doctorProfileId) {
      // Get ratings for a specific doctor
      const ratings = await prisma.doctorRating.findMany({
        where: { doctorProfileId },
        include: {
          patient: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const aggregate = await prisma.doctorRating.aggregate({
        where: { doctorProfileId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      // If the user is a patient, check if they already rated this doctor
      let userRating = null;
      if (session.user.role === "PATIENT") {
        userRating = await prisma.doctorRating.findUnique({
          where: {
            doctorProfileId_patientId: {
              doctorProfileId,
              patientId: session.user.id,
            },
          },
        });
      }

      return NextResponse.json({
        ratings,
        average: aggregate._avg.rating || 0,
        count: aggregate._count.rating,
        userRating,
      });
    }

    // For doctors: get their own ratings
    if (session.user.role === "DOCTOR") {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!doctorProfile) {
        return NextResponse.json({ ratings: [], average: 0, count: 0 });
      }

      const ratings = await prisma.doctorRating.findMany({
        where: { doctorProfileId: doctorProfile.id },
        include: {
          patient: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const aggregate = await prisma.doctorRating.aggregate({
        where: { doctorProfileId: doctorProfile.id },
        _avg: { rating: true },
        _count: { rating: true },
      });

      return NextResponse.json({
        ratings,
        average: aggregate._avg.rating || 0,
        count: aggregate._count.rating,
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Doctor rating fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create or update a doctor rating (patient only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { doctorProfileId, rating, comment } = body;

    if (!doctorProfileId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Valid doctorProfileId and rating (1-5) are required" },
        { status: 400 }
      );
    }

    // Verify the doctor exists
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
    });

    if (!doctorProfile) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    // Verify the patient has had at least one consultation with this doctor
    const consultation = await prisma.consultation.findFirst({
      where: {
        patientId: session.user.id,
        portal: { doctorProfileId },
      },
    });

    if (!consultation) {
      return NextResponse.json(
        { error: "You must have at least one consultation with this doctor to leave a rating" },
        { status: 403 }
      );
    }

    // Upsert the rating (one rating per patient per doctor)
    const doctorRating = await prisma.doctorRating.upsert({
      where: {
        doctorProfileId_patientId: {
          doctorProfileId,
          patientId: session.user.id,
        },
      },
      update: {
        rating: Math.round(rating),
        comment: comment || null,
      },
      create: {
        doctorProfileId,
        patientId: session.user.id,
        rating: Math.round(rating),
        comment: comment || null,
      },
    });

    return NextResponse.json(doctorRating);
  } catch (error) {
    console.error("Doctor rating error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
