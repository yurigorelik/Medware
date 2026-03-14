import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDoctor } from "@/lib/roles";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isDoctor(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: session.user.id },
      include: { portal: true },
    });

    if (!doctorProfile?.portal) {
      return NextResponse.json(
        { error: "No portal found. Create a portal first." },
        { status: 404 }
      );
    }

    // Get all consultations with summaries that have doctor reviews with edits
    const consultations = await prisma.consultation.findMany({
      where: {
        portalId: doctorProfile.portal.id,
        summary: {
          review: {
            isNot: null,
          },
        },
      },
      include: {
        summary: {
          include: {
            review: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Build a comparison of original vs edited summaries
    const comparisons: string[] = [];
    let reviewedCount = 0;

    for (const c of consultations) {
      if (!c.summary?.review) continue;
      const review = c.summary.review;
      const original = c.summary;

      const hasEdits =
        review.editedSummary ||
        review.editedDiagnosis ||
        review.editedWorkup ||
        review.doctorNotes;

      if (!hasEdits) continue;
      reviewedCount++;

      let comparison = `### Consultation ${reviewedCount} (${new Date(c.updatedAt).toLocaleDateString()})\n`;

      if (review.editedSummary) {
        comparison += `**Original Summary:**\n${original.summary}\n\n**Edited Summary:**\n${review.editedSummary}\n\n`;
      }
      if (review.editedDiagnosis) {
        comparison += `**Original Diagnosis:**\n${original.differentialDiagnosis}\n\n**Edited Diagnosis:**\n${review.editedDiagnosis}\n\n`;
      }
      if (review.editedWorkup) {
        comparison += `**Original Workup:**\n${original.suggestedWorkup}\n\n**Edited Workup:**\n${review.editedWorkup}\n\n`;
      }
      if (review.doctorNotes) {
        comparison += `**Doctor Notes:**\n${review.doctorNotes}\n\n`;
      }

      comparisons.push(comparison);
    }

    if (comparisons.length === 0) {
      return NextResponse.json(
        { error: "No reviewed consultations with edits found. Review and edit some consultation summaries first." },
        { status: 404 }
      );
    }

    const prompt = `You are analyzing a doctor's review patterns across multiple AI-generated medical consultation summaries. The doctor has reviewed and edited these summaries. Your task is to identify patterns in the doctor's changes and generate actionable instructions that could improve future AI-generated summaries.

Here are the original AI summaries and the doctor's edited versions:

${comparisons.join("\n---\n\n")}

Based on these changes, please provide:
1. A concise summary (3-5 sentences) of the main patterns you observe in the doctor's edits
2. A list of specific, actionable instructions (formatted as bullet points) that could be added to the doctor's AI portal settings to improve future summary generation. These instructions should reflect the doctor's preferences, style, and areas where the AI consistently needed correction.

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "patternSummary": "A 3-5 sentence summary of the editing patterns observed",
  "instructions": ["instruction 1", "instruction 2", ...]
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const responseText = textBlock
      ? (textBlock as Anthropic.TextBlock).text
      : "";

    let cleanedText = responseText.trim();
    const codeBlockMatch = cleanedText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) {
      cleanedText = codeBlockMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(cleanedText);
      return NextResponse.json({
        patternSummary: parsed.patternSummary || "Unable to analyze patterns.",
        instructions: parsed.instructions || [],
        reviewedCount,
      });
    } catch {
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            patternSummary: parsed.patternSummary || "Unable to analyze patterns.",
            instructions: parsed.instructions || [],
            reviewedCount,
          });
        } catch {
          // Fall through
        }
      }
      return NextResponse.json({
        patternSummary: responseText,
        instructions: [],
        reviewedCount,
      });
    }
  } catch (error) {
    console.error("Summary of changes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
