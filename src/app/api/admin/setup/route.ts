import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time setup: make yurigorelik@gmail.com the first admin
// Only works if no admin exists yet (safe to call multiple times)
export async function POST() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "An administrator already exists" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: "yurigorelik@gmail.com" },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User yurigorelik@gmail.com not found. Please register first." },
        { status: 404 }
      );
    }

    await prisma.user.update({
      where: { email: "yurigorelik@gmail.com" },
      data: { role: "ADMIN" },
    });

    return NextResponse.json({ success: true, message: "Admin account created" });
  } catch (error) {
    console.error("Admin setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
