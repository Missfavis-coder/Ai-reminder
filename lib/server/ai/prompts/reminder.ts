
type ReminderPromptInput = {
    ruleName: string;
    reason: string;
  };
  
  export function buildReminderPrompt(
    input: ReminderPromptInput,
  ): string {
    return [
      "Write one concise, friendly productivity reminder.",
      "Use at most 20 words.",
      "Return only the reminder message.",
      "Do not include headings, explanations, or emojis.",
      "",
      `Reminder type: ${input.ruleName.slice(0, 100)}`,
      `Reason: ${input.reason.slice(0, 160)}`,
    ].join("\n");
  }
  