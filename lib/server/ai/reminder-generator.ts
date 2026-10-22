
import "server-only";

import { getGeminiClient, getGeminiModel } from
  "@/lib/server/ai/client";
import { buildReminderPrompt } from
  "@/lib/server/ai/prompts/reminder";

type ReminderInput = {
  ruleName: string;
  reason: string;
  personalize?: boolean;
};

function createFallbackMessage(input: ReminderInput): string {
  const ruleName = input.ruleName.trim().slice(0, 100);

  if (!ruleName) {
    return "It's time to check in on your work.";
  }

  return `Reminder: ${ruleName}`;
}

export async function generateReminderMessage(
  input: ReminderInput,
): Promise<string> {
  const fallback = createFallbackMessage(input);

  // Avoid spending tokens when a template is sufficient.
  if (
    input.personalize !== true ||
    !input.ruleName.trim() ||
    !input.reason.trim()
  ) {
    return fallback;
  }

  try {
    const ai = getGeminiClient();
    const model = getGeminiModel();

    const response = await ai.models.generateContent({
      model,
      contents: buildReminderPrompt(input),
      config: {
        maxOutputTokens: 48,
      },
    });

    const message = response.text?.trim();

    if (!message) {
      return fallback;
    }

    return message.slice(0, 500);
  } catch {
    // AI failure should not prevent a basic reminder.
    console.error("AI reminder generation failed; using fallback.");
    return fallback;
  }
}
