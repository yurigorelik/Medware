import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChatResponse } from "@/lib/ai";

// Get messages for a consultation
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
          include: {
            doctorProfile: true,
          },
        },
      },
    });

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    // Verify access
    const isPatient = consultation.patientId === session.user.id;
    const isDoctor =
      session.user.role === "DOCTOR" &&
      consultation.portal.doctorProfile.userId === session.user.id;

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: {
        consultationId: params.id,
        role: { not: "SYSTEM" },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Send a message in a consultation
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
      include: {
        portal: {
          include: {
            doctorProfile: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
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

    if (consultation.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This consultation is no longer active" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        consultationId: params.id,
        role: "USER",
        content: content.trim(),
      },
    });

    // Get all messages for context
    const allMessages = await prisma.message.findMany({
      where: { consultationId: params.id },
      orderBy: { createdAt: "asc" },
    });

    const systemMessage = allMessages.find((m) => m.role === "SYSTEM");
    const chatMessages = allMessages
      .filter((m) => m.role !== "SYSTEM")
      .map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

    // Get recent attachments for image context
    const recentAttachments = await prisma.attachment.findMany({
      where: {
        consultationId: params.id,
        mimetype: { startsWith: "image/" },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    let imageAttachments: { base64: string; mediaType: string }[] | undefined;
    if (recentAttachments.length > 0) {
      const fs = await import("fs/promises");
      const path = await import("path");
      imageAttachments = [];

      for (const att of recentAttachments) {
        try {
          const filePath = path.join(process.cwd(), att.filepath);
          const fileBuffer = await fs.readFile(filePath);
          imageAttachments.push({
            base64: fileBuffer.toString("base64"),
            mediaType: att.mimetype,
          });
        } catch {
          // Skip files that can't be read
        }
      }
    }

    // Get AI response
    const aiResponse = await getChatResponse(
      systemMessage?.content || "",
      chatMessages,
      imageAttachments
    );

    // Save AI response
    const assistantMessage = await prisma.message.create({
      data: {
        consultationId: params.id,
        role: "ASSISTANT",
        content: aiResponse,
      },
    });

    // Update consultation timestamp
    await prisma.consultation.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });

    // Check if AI has gathered enough information (look for summary-readiness signals)
    const totalMessages = allMessages.filter((m) => m.role !== "SYSTEM").length;
    const readyForSummary =
      totalMessages >= 6 &&
      /(?:I (?:now )?have (?:enough|sufficient|all the) (?:information|details)|(?:ready|enough information) (?:to |for )(?:generate|create|prepare|compile|provide) (?:a |the )?(?:case |medical )?summary|you (?:can|may) (?:now )?request (?:a |the )?(?:case )?summary|all (?:the )?(?:necessary |relevant )?information (?:has been |is )(?:gathered|collected|obtained)|shall I (?:go ahead and |now )?(?:generate|create|prepare) (?:a |the )?summary)/i.test(
        aiResponse
      );

    return NextResponse.json({
      userMessage,
      assistantMessage,
      readyForSummary,
    });
  } catch (error) {
    console.error("Message send error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
