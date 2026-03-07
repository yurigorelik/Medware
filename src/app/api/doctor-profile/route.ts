import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Doctor profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const clinicName = formData.get("clinicName") as string | null;
    const stampFile = formData.get("stamp") as File | null;
    const signatureFile = formData.get("signature") as File | null;
    const removeStamp = formData.get("removeStamp") === "true";
    const removeSignature = formData.get("removeSignature") === "true";

    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const updateData: Record<string, string | null> = {};

    if (clinicName !== null) {
      updateData.clinicName = clinicName || null;
    }

    if (removeStamp) {
      updateData.stampUrl = null;
    }

    if (removeSignature) {
      updateData.signatureUrl = null;
    }

    // Handle stamp upload
    if (stampFile && stampFile.size > 0) {
      if (stampFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Stamp image must be less than 5MB" },
          { status: 400 }
        );
      }

      if (!stampFile.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Stamp must be an image file" },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), "uploads", "doctor-profiles", profile.id);
      await mkdir(uploadDir, { recursive: true });

      const bytes = await stampFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = stampFile.name.split(".").pop() || "png";
      const filename = `stamp-${Date.now()}.${ext}`;
      const filepath = path.join("uploads", "doctor-profiles", profile.id, filename);
      await writeFile(path.join(process.cwd(), filepath), buffer);

      updateData.stampUrl = "/" + filepath;
    }

    // Handle signature upload
    if (signatureFile && signatureFile.size > 0) {
      if (signatureFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Signature image must be less than 5MB" },
          { status: 400 }
        );
      }

      if (!signatureFile.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Signature must be an image file" },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), "uploads", "doctor-profiles", profile.id);
      await mkdir(uploadDir, { recursive: true });

      const bytes = await signatureFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = signatureFile.name.split(".").pop() || "png";
      const filename = `signature-${Date.now()}.${ext}`;
      const filepath = path.join("uploads", "doctor-profiles", profile.id, filename);
      await writeFile(path.join(process.cwd(), filepath), buffer);

      updateData.signatureUrl = "/" + filepath;
    }

    const updated = await prisma.doctorProfile.update({
      where: { id: profile.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Doctor profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
