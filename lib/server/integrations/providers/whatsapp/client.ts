
import "server-only";

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION;

function isMockMode() {
  return process.env.WHATSAPP_PROVIDER === "mock";
}

function assertMockModeAllowed() {
  if (isMockMode() && process.env.NODE_ENV !== "development") {
    throw new Error("WhatsApp mock mode is only allowed in development.");
  }
}

export function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId || !GRAPH_API_VERSION) {
    throw new Error("WhatsApp Cloud API is not configured");
  }

  return {
    accessToken,
    phoneNumberId,
    apiVersion: GRAPH_API_VERSION,
  };
}

async function postWhatsApp(payload: Record<string, unknown>) {
  const config = getWhatsAppConfig();

  const response = await fetch(
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...payload,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    },
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("WhatsApp Cloud API request failed", {
      status: response.status,
      error: result?.error?.message ?? "Unknown provider error",
      code: result?.error?.code,
    });

    throw new Error(
      `WhatsApp Cloud API error (${response.status}): ${
        result?.error?.message ?? "Unknown provider error"
      }`,
    );
  }

  console.log("WhatsApp API accepted message:", {
    messageId: result?.messages?.[0]?.id,
    messageStatus: result?.messages?.[0]?.message_status,
    recipientId: result?.contacts?.[0]?.wa_id,
  });

  return result;
}

function mockWhatsAppMessage(
  recipient: string,
  message: string,
) {
  assertMockModeAllowed();

  const messageId = `mock_${crypto.randomUUID()}`;

  console.info("\n========== MOCK WHATSAPP MESSAGE ==========");
  console.info("Recipient:", recipient);
  console.info("Message:", message);
  console.info("Message ID:", messageId);
  console.info("Status: SIMULATED");
  console.info("===========================================\n");

  return {
    messaging_product: "whatsapp",
    contacts: [{ wa_id: recipient }],
    messages: [
      {
        id: messageId,
        message_status: "accepted",
      },
    ],
    mock: true,
  };
}

export async function sendWhatsAppText(
  recipient: string,
  message: string,
) {
  if (isMockMode()) {
    return mockWhatsAppMessage(recipient, message);
  }

  return postWhatsApp({
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: { body: message },
  });
}

export async function sendWhatsAppVerificationTemplate(
  recipient: string,
  code: string,
) {
  if (isMockMode()) {
    return mockWhatsAppMessage(
      recipient,
      `Your AI Reminder verification code is ${code}. It expires in 10 minutes.`,
    );
  }

  const templateName =
    process.env.WHATSAPP_VERIFICATION_TEMPLATE_NAME;

  const language =
    process.env.WHATSAPP_VERIFICATION_TEMPLATE_LANGUAGE ?? "en";

  if (!templateName) {
    throw new Error(
      "WHATSAPP_VERIFICATION_TEMPLATE_NAME is not configured",
    );
  }

  return postWhatsApp({
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: code,
            },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            {
              type: "text",
              text: code,
            },
          ],
        },
      ],
    },
  });
}
