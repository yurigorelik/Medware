import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get SMTP settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { id: "singleton" },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: "singleton",
          smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
          smtpPort: parseInt(process.env.SMTP_PORT || "587"),
          smtpSecure: process.env.SMTP_SECURE === "true",
          smtpUser: process.env.SMTP_USER || "",
          smtpPass: process.env.SMTP_PASS || "",
          smtpFrom: process.env.SMTP_FROM || "",
        },
      });
    }

    // Mask password for display
    return NextResponse.json({
      ...settings,
      smtpPass: settings.smtpPass ? "••••••••" : "",
    });
  } catch (error) {
    console.error("Admin settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update SMTP settings
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom } = body;

    const updateData: Record<string, any> = {};
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = parseInt(smtpPort);
    if (smtpSecure !== undefined) updateData.smtpSecure = smtpSecure;
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser;
    if (smtpFrom !== undefined) updateData.smtpFrom = smtpFrom;
    // Only update password if it's not the masked value
    if (smtpPass !== undefined && smtpPass !== "••••••••") {
      updateData.smtpPass = smtpPass;
    }

    const settings = await prisma.systemSettings.upsert({
      where: { id: "singleton" },
      update: updateData,
      create: {
        id: "singleton",
        smtpHost: smtpHost || "smtp.gmail.com",
        smtpPort: parseInt(smtpPort || "587"),
        smtpSecure: smtpSecure || false,
        smtpUser: smtpUser || "",
        smtpPass: smtpPass || "",
        smtpFrom: smtpFrom || "",
      },
    });

    return NextResponse.json({
      ...settings,
      smtpPass: settings.smtpPass ? "••••••••" : "",
    });
  } catch (error) {
    console.error("Admin settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
