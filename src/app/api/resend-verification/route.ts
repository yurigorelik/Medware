import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateVerificationToken, sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({
        message: "If an account exists with this email, a verification link has been sent.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        message: "This email is already verified. You can sign in.",
      });
    }

    const newToken = generateVerificationToken();

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: newToken },
    });

    await sendVerificationEmail(user.email, user.name, newToken);

    return NextResponse.json({
      message: "If an account exists with this email, a verification link has been sent.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
