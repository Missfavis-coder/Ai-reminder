
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { extensionAuthRequests } from "@/lib/server/db/schema";
import {
  createRandomSecret,
  hashExtensionSecret,
} from "@/lib/server/auth/extension-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { codeChallenge, deviceName } = body;

    if (
      typeof codeChallenge !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)
    ) {
      return NextResponse.json(
        { error: "Invalid PKCE challenge." },
        { status: 400 },
      );
    }

    const pollToken = createRandomSecret();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const [authRequest] = await db
      .insert(extensionAuthRequests)
      .values({
        codeChallenge,
        pollTokenHash: hashExtensionSecret(pollToken),
        deviceName:
          typeof deviceName === "string"
            ? deviceName.slice(0, 200)
            : "VS Code",
        expiresAt,
      })
      .returning({
        id: extensionAuthRequests.id,
        expiresAt: extensionAuthRequests.expiresAt,
      });

    return NextResponse.json(
      {
        requestId: authRequest.id,
        pollToken,
        expiresAt: authRequest.expiresAt,
        authorizationUrl: `${request.nextUrl.origin}/connect/vscode?request=${authRequest.id}`,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Extension authorization request failed:", error);

    return NextResponse.json(
      { error: "Could not start VS Code authorization." },
      { status: 500 },
    );
  }
}
