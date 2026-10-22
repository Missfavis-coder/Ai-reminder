
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

export async function sendWhatsAppText(
  recipient: string,
  message: string,
) {
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
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: { body: message },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `WhatsApp request failed (${response.status}): ${JSON.stringify(result)}`,
    );
  }

  return result;
}
