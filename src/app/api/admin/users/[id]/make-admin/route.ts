import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "User is already an administrator" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { role: "ADMIN" },
      select: { id: true, name: true, role: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin make-admin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
