import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChatResponse } from "@/lib/ai";
import { isDoctor } from "@/lib/roles";

// Get messages for a second opinion consultation
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isDoctor(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secondOpinion = await prisma.secondOpinion.findUnique({
      where: { id: params.id },
    });

    if (!secondOpinion || secondOpinion.doctorId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const messages = await prisma.secondOpinionMessage.findMany({
      where: {
        secondOpinionId: params.id,
        role: { not: "SYSTEM" },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Second opinion messages fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Send a message in a second opinion consultation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isDoctor(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secondOpinion = await prisma.secondOpinion.findUnique({
      where: { id: params.id },
    });

    if (!secondOpinion || secondOpinion.doctorId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (secondOpinion.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This consultation has been completed" },
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

    // Save doctor's message
    const userMessage = await prisma.secondOpinionMessage.create({
      data: {
        secondOpinionId: params.id,
        role: "USER",
        content: content.trim(),
      },
    });

    // Get all messages for context
    const allMessages = await prisma.secondOpinionMessage.findMany({
      where: { secondOpinionId: params.id },
      orderBy: { createdAt: "asc" },
    });

    const systemMessage = allMessages.find((m) => m.role === "SYSTEM");
    const chatMessages = allMessages
      .filter((m) => m.role !== "SYSTEM")
      .map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

    // Get AI response
    const aiResult = await getChatResponse(
      systemMessage?.content || "",
      chatMessages
    );

    // Save AI response
    const assistantMessage = await prisma.secondOpinionMessage.create({
      data: {
        secondOpinionId: params.id,
        role: "ASSISTANT",
        content: aiResult.text,
        inputTokens: aiResult.inputTokens,
        outputTokens: aiResult.outputTokens,
      },
    });

    // Update timestamp
    await prisma.secondOpinion.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    console.error("Second opinion message error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
