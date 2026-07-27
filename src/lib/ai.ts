import Anthropic from "@anthropic-ai/sdk";

// Exported so every caller shares one client rather than constructing its own.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Single place to change the model the whole platform talks to.
// Override per-deployment with ANTHROPIC_MODEL without touching code.
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Sonnet 5 runs adaptive thinking when `thinking` is omitted, and max_tokens
// caps thinking plus response text together. These calls want the whole budget
// spent on the answer, so thinking is turned off explicitly. Swap to
// { type: "adaptive" } (and raise max_tokens) if you want the model to reason
// before answering.
export const THINKING = { type: "disabled" } as const;

/**
 * Pull the first text block out of a response. The content array is a
 * discriminated union, so the type predicate narrows it without a cast.
 */
export function firstText(message: Anthropic.Message): string {
  const block = message.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  return block?.text ?? "";
}

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

interface PatientMedicalSummary {
  dateOfBirth?: string | null;
  gender?: string | null;
  preferredLanguage?: string | null;
  medicalHistory?: string | null;
  currentMedications?: string | null;
  allergies?: string | null;
  pastProcedures?: string | null;
  familyHistory?: string | null;
  socialHistory?: string | null;
}

function formatCodeItemList(
  jsonStr: string | null | undefined,
  displayField: "description" | "name" = "description"
): string {
  if (!jsonStr) return "None reported";
  try {
    const items = JSON.parse(jsonStr);
    if (Array.isArray(items) && items.length > 0) {
      return items
        .map(
          (item: { code: string; description?: string; name?: string }) =>
            `${item[displayField] || item.description || item.name} (${item.code})`
        )
        .join(", ");
    }
  } catch {
    // Legacy text format
    if (jsonStr.trim()) return jsonStr;
  }
  return "None reported";
}

function formatSocialHistory(jsonStr: string | null | undefined): string {
  if (!jsonStr) return "None reported";
  try {
    const data = JSON.parse(jsonStr);
    if (typeof data === "object" && !Array.isArray(data)) {
      const parts: string[] = [];
      if (data.smoking) {
        let s = `Smoking: ${data.smoking}`;
        if (data.smokingDetails) s += ` (${data.smokingDetails})`;
        parts.push(s);
      }
      if (data.alcohol) {
        let s = `Alcohol: ${data.alcohol}`;
        if (data.alcoholDetails) s += ` (${data.alcoholDetails})`;
        parts.push(s);
      }
      if (data.drugs) {
        let s = `Drug use: ${data.drugs}`;
        if (data.drugDetails) s += ` (${data.drugDetails})`;
        parts.push(s);
      }
      if (parts.length > 0) return parts.join("; ");
    }
  } catch {
    if (jsonStr.trim()) return jsonStr;
  }
  return "None reported";
}

export function buildPatientMedicalSummary(
  profile: PatientMedicalSummary
): string {
  const sections: string[] = [];

  if (profile.dateOfBirth) {
    sections.push(`- Date of Birth: ${profile.dateOfBirth}`);
  }
  if (profile.gender) {
    sections.push(`- Gender: ${profile.gender}`);
  }
  if (profile.preferredLanguage) {
    sections.push(`- Preferred Language: ${profile.preferredLanguage}`);
  }

  sections.push(
    `- Medical History (Diagnoses): ${formatCodeItemList(profile.medicalHistory, "description")}`
  );
  sections.push(
    `- Current Medications: ${formatCodeItemList(profile.currentMedications, "name")}`
  );
  sections.push(`- Allergies: ${profile.allergies?.trim() || "None reported"}`);
  sections.push(
    `- Past Procedures/Surgeries: ${formatCodeItemList(profile.pastProcedures, "description")}`
  );
  sections.push(
    `- Family History: ${formatCodeItemList(profile.familyHistory, "description")}`
  );
  sections.push(`- Social History: ${formatSocialHistory(profile.socialHistory)}`);

  return sections.join("\n");
}

export function buildSystemPrompt(
  config: PortalConfig,
  patientSummary?: string,
  preferredLanguage?: string | null
): string {
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

  if (patientSummary) {
    prompt += `\n\n## Patient Medical Profile Summary
The following medical information was provided by the patient in their profile. Use this as context for the consultation - you already have this information and do not need to re-ask about it, but you may ask for clarification or additional details as needed:
${patientSummary}`;
  }

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

  if (preferredLanguage && preferredLanguage !== "English") {
    prompt += `\n\n## Language Preference\nThe patient's preferred language is **${preferredLanguage}**. You MUST communicate predominantly in ${preferredLanguage}. Use ${preferredLanguage} for all your responses, questions, and explanations. You may use English medical terminology where appropriate but always provide the ${preferredLanguage} explanation alongside it. Greet the patient in ${preferredLanguage}.`;
  }

  return prompt;
}

interface FollowUpContext {
  originalSummary: string;
  originalDiagnosis: string;
  originalWorkup: string;
  doctorNotes: string | null;
  editedSummary: string | null;
  editedDiagnosis: string | null;
  editedWorkup: string | null;
}

export function buildFollowUpSystemPrompt(
  config: PortalConfig,
  followUpContext: FollowUpContext,
  patientSummary?: string,
  preferredLanguage?: string | null
): string {
  // Use doctor-edited versions if available, otherwise originals
  const summary = followUpContext.editedSummary || followUpContext.originalSummary;
  const diagnosis = followUpContext.editedDiagnosis || followUpContext.originalDiagnosis;
  const workup = followUpContext.editedWorkup || followUpContext.originalWorkup;

  let prompt = `You are a medical AI assistant operating within Dr. ${config.doctorName}'s consultation portal, specializing in ${config.medicalField}.

## Your Role
You are conducting a FOLLOW-UP consultation on behalf of Dr. ${config.doctorName}. The patient has previously completed an initial consultation and has been asked to return for a follow-up visit.

## Previous Consultation Summary
${summary}

## Previous Differential Diagnosis
${diagnosis}

## Previous Suggested Workup
${workup}`;

  if (followUpContext.doctorNotes) {
    prompt += `\n\n## Doctor's Notes from Previous Review\n${followUpContext.doctorNotes}`;
  }

  prompt += `

## Follow-Up Instructions
Your primary tasks in this follow-up are:
1. Greet the patient warmly and remind them this is a follow-up to their previous consultation with Dr. ${config.doctorName}
2. Ask about **changes in symptoms** since the last consultation - have they improved, worsened, or remained the same? Any new symptoms?
3. Ask about **results of any tests** that were recommended (laboratory tests, imaging, procedures) from the suggested workup above
4. Ask about **response to medications** - if any medications were being taken or were recommended, how has the patient responded? Any side effects?
5. Ask about any **new findings** - any new diagnoses, procedures, or events since the last visit
6. Be systematic and cover each area from the original consultation, but ask one or two questions at a time - do not overwhelm the patient
7. When you have gathered sufficient follow-up information, let the patient know that an updated summary will be generated

## Important Guidelines
- You are an AI assistant providing a PRELIMINARY follow-up assessment for review by Dr. ${config.doctorName}
- ALL findings will be reviewed and approved by the doctor before being finalized
- Compare the patient's current state to the previous consultation findings
- Note any improvements, deteriorations, or new developments
- You should NOT provide definitive diagnoses - present updated differential diagnoses with reasoning
- Encourage patients to seek emergency care if symptoms suggest urgent conditions
- Be clear that this is a follow-up second opinion consultation, not a replacement for in-person care
- Maintain a professional yet compassionate tone throughout`;

  if (patientSummary) {
    prompt += `\n\n## Patient Medical Profile Summary\n${patientSummary}`;
  }

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

  if (preferredLanguage && preferredLanguage !== "English") {
    prompt += `\n\n## Language Preference\nThe patient's preferred language is **${preferredLanguage}**. You MUST communicate predominantly in ${preferredLanguage}. Use ${preferredLanguage} for all your responses, questions, and explanations. You may use English medical terminology where appropriate but always provide the ${preferredLanguage} explanation alongside it. Greet the patient in ${preferredLanguage}.`;
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
    model: MODEL,
    thinking: THINKING,
    max_tokens: 2048,
    system: systemPrompt,
    messages: anthropicMessages,
  });

  return {
    text: firstText(response),
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
    model: MODEL,
    thinking: THINKING,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: summaryPrompt,
      },
    ],
  });

  const responseText = firstText(response);

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

export async function extractMedicationsFromSummary(
  summaryText: string,
  diagnosisText: string,
  workupText: string
): Promise<{
  medications: { name: string; suggestedDose?: string; suggestedRoute?: string; suggestedDuration?: string; reason?: string }[];
  inputTokens: number;
  outputTokens: number;
}> {
  const prompt = `You are a medical AI assistant. Analyze the following case summary, differential diagnosis, and suggested workup. Identify ALL medications that are mentioned or recommended in any section.

For each medication found, extract or suggest:
- name: The medication name
- suggestedDose: The dosage if mentioned, or a common starting dose
- suggestedRoute: The route of administration (e.g., "oral", "IV", "topical", "inhaled")
- suggestedDuration: The duration if mentioned
- reason: Brief reason for the medication

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "medications": [
    {
      "name": "Medication Name",
      "suggestedDose": "dose if available",
      "suggestedRoute": "route",
      "suggestedDuration": "duration if available",
      "reason": "brief reason"
    }
  ]
}

If no medications are mentioned or recommended, return: {"medications": []}

## Case Summary:
${summaryText}

## Differential Diagnosis:
${diagnosisText}

## Suggested Workup:
${workupText}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    thinking: THINKING,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = firstText(response);

  let cleanedText = responseText.trim();
  const codeBlockMatch = cleanedText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    cleanedText = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleanedText);
    return {
      medications: parsed.medications || [],
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch {
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          medications: parsed.medications || [],
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        };
      } catch {
        // Fall through
      }
    }
    return {
      medications: [],
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}

interface SecondOpinionConfig {
  doctorName: string;
  medicalField: string;
  guidelines: string;
  literature: string;
  sources: string;
  additionalDefinitions: string;
}

export function buildSecondOpinionSystemPrompt(
  config: SecondOpinionConfig
): string {
  let prompt = `You are an expert medical AI consultant providing a **second opinion** to Dr. ${config.doctorName}, who specializes in ${config.medicalField}. You are having a doctor-to-doctor consultation.

## Your Role
You are acting as a senior consulting physician. Dr. ${config.doctorName} will present a patient case to you, including findings, test results, imaging, and their clinical reasoning. Your job is to:

1. Listen carefully to the case presentation
2. Ask clarifying questions about the patient's history, findings, test results, imaging, physical exam, or any other relevant clinical details you need
3. Ask focused, relevant follow-up questions one or two at a time — do not overwhelm the doctor
4. Once you have sufficient information, provide a comprehensive second opinion including:
   - **Differential Diagnosis**: A ranked list of possible diagnoses with probabilities (as percentages) and reasoning for each
   - **Assessment**: Your clinical assessment of the case, highlighting areas of agreement or disagreement with the presenting doctor's impression
   - **Recommended Next Steps**: Further workup, tests, imaging, or consultations you would recommend
   - **Prognosis**: Expected outcomes for the most likely diagnoses
   - **Treatment Options**: Evidence-based treatment recommendations for the top differential diagnoses

## Important Guidelines
- You are speaking doctor-to-doctor — use appropriate medical terminology and clinical reasoning
- Do NOT focus on a single primary complaint — consider the full clinical picture presented
- Provide probability estimates for each differential diagnosis (must sum to approximately 100%)
- Reference relevant clinical guidelines, scoring systems, or diagnostic criteria where applicable
- Be thorough but concise — focus on clinically actionable information
- If the case presentation is incomplete, ask for specific missing information before providing your opinion
- Flag any red flags or urgent findings that require immediate attention
- Consider both common and less common diagnoses based on the clinical presentation`;

  if (config.guidelines) {
    prompt += `\n\n## Clinical Guidelines the Doctor Follows\n${config.guidelines}`;
  }

  if (config.literature) {
    prompt += `\n\n## Reference Literature\n${config.literature}`;
  }

  if (config.sources) {
    prompt += `\n\n## Preferred Sources\n${config.sources}`;
  }

  if (config.additionalDefinitions) {
    prompt += `\n\n## Additional Context\n${config.additionalDefinitions}`;
  }

  return prompt;
}
