import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// List all doctors with active portals, ordered by most active (consultation count)
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
            _count: {
              select: { consultations: true },
            },
          },
        },
        ratings: {
          select: { rating: true },
        },
      },
    });

    // Add average rating to each doctor and sort by consultation count
    const withRatings = doctors.map((doc) => {
      const ratings = doc.ratings || [];
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;
      const { ratings: _ratings, ...rest } = doc;
      return {
        ...rest,
        averageRating: Math.round(avgRating * 10) / 10,
        ratingCount: ratings.length,
      };
    });

    const sorted = withRatings.sort((a, b) => {
      const countA = a.portal?._count?.consultations ?? 0;
      const countB = b.portal?._count?.consultations ?? 0;
      return countB - countA;
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Doctors fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
