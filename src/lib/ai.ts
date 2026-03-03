import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface PortalConfig {
  doctorName: string;
  medicalField: string;
  instructions: string;
  guidelines: string;
  literature: string;
  sources: string;
  additionalDefinitions: string;
  welcomeMessage: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export function buildSystemPrompt(config: PortalConfig): string {
  let prompt = `You are a medical AI assistant operating within Dr. ${config.doctorName}'s consultation portal, specializing in ${config.medicalField}.

## Your Role
You are conducting a medical second opinion consultation on behalf of Dr. ${config.doctorName}. Your tasks are:
1. Greet the patient warmly and introduce yourself as the AI medical assistant for Dr. ${config.doctorName}'s ${config.medicalField} practice
2. Take a thorough medical history from the patient
3. Ask relevant questions about their symptoms, onset, duration, severity, associated symptoms, medical history, current medications, allergies, family history, and social history
4. Accept and review any medical documents or images the patient shares
5. Be empathetic, professional, and thorough
6. Ask one or two questions at a time - do not overwhelm the patient
7. When you have gathered sufficient information, let the patient know that a case summary will be generated automatically

## Important Guidelines
- You are an AI assistant providing a PRELIMINARY assessment for review by Dr. ${config.doctorName}
- ALL findings will be reviewed and approved by the doctor before being finalized
- You should NOT provide definitive diagnoses - present differential diagnoses with reasoning
- Encourage patients to seek emergency care if symptoms suggest urgent conditions
- Be clear that this is a second opinion consultation, not a replacement for in-person care
- Maintain a professional yet compassionate tone throughout`;

  if (config.instructions) {
    prompt += `\n\n## Doctor's Specific Instructions\n${config.instructions}`;
  }

  if (config.guidelines) {
    prompt += `\n\n## Clinical Guidelines to Follow\n${config.guidelines}`;
  }

  if (config.literature) {
    prompt += `\n\n## Reference Literature\n${config.literature}`;
  }

  if (config.sources) {
    prompt += `\n\n## Sources\n${config.sources}`;
  }

  if (config.additionalDefinitions) {
    prompt += `\n\n## Additional Definitions and Context\n${config.additionalDefinitions}`;
  }

  return prompt;
}

export async function getChatResponse(
  systemPrompt: string,
  messages: ChatMessage[],
  imageAttachments?: { base64: string; mediaType: string }[]
): Promise<AiResponse> {
  const anthropicMessages: Anthropic.MessageParam[] = messages.map(
    (msg, index) => {
      if (
        msg.role === "user" &&
        index === messages.length - 1 &&
        imageAttachments &&
        imageAttachments.length > 0
      ) {
        return {
          role: "user" as const,
          content: [
            ...imageAttachments.map(
              (img) =>
                ({
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: img.mediaType as
                      | "image/jpeg"
                      | "image/png"
                      | "image/gif"
                      | "image/webp",
                    data: img.base64,
                  },
                }) satisfies Anthropic.ImageBlockParam
            ),
            {
              type: "text" as const,
              text: msg.content,
            } satisfies Anthropic.TextBlockParam,
          ],
        };
      }
      return {
        role: msg.role as "user" | "assistant",
        content: msg.content,
      };
    }
  );

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: anthropicMessages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return {
    text: textBlock ? (textBlock as Anthropic.TextBlock).text : "",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

export async function generateCaseSummary(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<{
  summary: string;
  differentialDiagnosis: string;
  suggestedWorkup: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const conversationText = messages
    .map((msg) => `${msg.role === "user" ? "Patient" : "AI Assistant"}: ${msg.content}`)
    .join("\n\n");

  const summaryPrompt = `${systemPrompt}

## TASK: Generate Case Summary
Based on the following consultation conversation, generate a comprehensive case summary. You MUST respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text) with exactly these three keys:

{
  "summary": "A comprehensive case summary including: patient presentation, chief complaint, history of present illness, relevant past medical history, medications, allergies, family history, social history, and review of systems as discussed",
  "differentialDiagnosis": "A ranked list of possible diagnoses with brief reasoning for each. Format as a numbered list.",
  "suggestedWorkup": "Recommended further tests, imaging, lab work, specialist referrals, or other investigations. Format as a numbered list."
}

## Consultation Conversation:
${conversationText}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: summaryPrompt,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const responseText = textBlock
    ? (textBlock as Anthropic.TextBlock).text
    : "";

  // Strip markdown code blocks if present (e.g. ```json ... ```)
  let cleanedText = responseText.trim();
  const codeBlockMatch = cleanedText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    cleanedText = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleanedText);
    return {
      summary: parsed.summary || "Unable to generate summary",
      differentialDiagnosis:
        parsed.differentialDiagnosis || "Unable to generate differential diagnosis",
      suggestedWorkup:
        parsed.suggestedWorkup || "Unable to generate suggested workup",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch {
    // Try to extract JSON object from the response text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || "Unable to generate summary",
          differentialDiagnosis:
            parsed.differentialDiagnosis || "Unable to generate differential diagnosis",
          suggestedWorkup:
            parsed.suggestedWorkup || "Unable to generate suggested workup",
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        };
      } catch {
        // Fall through to fallback
      }
    }

    return {
      summary: responseText,
      differentialDiagnosis: "Error parsing AI response. Please review the summary above.",
      suggestedWorkup: "Error parsing AI response. Please review the summary above.",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
