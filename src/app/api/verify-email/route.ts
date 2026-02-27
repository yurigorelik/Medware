import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/auth/verify-email?status=invalid", request.url)
      );
    }

    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/auth/verify-email?status=invalid", request.url)
      );
    }

    if (user.emailVerified) {
      return NextResponse.redirect(
        new URL("/auth/verify-email?status=already-verified", request.url)
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    return NextResponse.redirect(
      new URL("/auth/verify-email?status=success", request.url)
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(
      new URL("/auth/verify-email?status=error", request.url)
    );
  }
}
