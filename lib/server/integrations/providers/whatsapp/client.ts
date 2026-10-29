
import "server-only";

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION;

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

    throw new Error("WhatsApp Cloud API rejected the message");
  }

  return result;
}

export async function sendWhatsAppText(
  recipient: string,
  message: string,
) {
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
  const templateName =
    process.env.WHATSAPP_VERIFICATION_TEMPLATE_NAME;

  const language =
    process.env.WHATSAPP_VERIFICATION_TEMPLATE_LANGUAGE ?? "en_US";

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
      ],
    },
  });
}
