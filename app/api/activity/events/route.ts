
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { WorkspaceNotFoundError } from "@/lib/server/error";
import {
  activityEventSchema,
  validateEventTimestamp,
} from "@/lib/server/activity/type";
import { processActivityEvent } from
  "@/lib/server/activity/event-processor";
import { getCurrentUserId } from
  "@/lib/server/auth/session";


export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const event = activityEventSchema.parse(body);

    const timestampCheck = validateEventTimestamp(
      event.occurredAt,
    );

    if (!timestampCheck.valid) {
      return NextResponse.json(
        {
          error: "Activity event timestamp is outside the allowed window.",
          reason: timestampCheck.reason,
        },
        { status: 400 },
      );
    }

    const result = await processActivityEvent({
      userId,
      event,
    });

    return NextResponse.json(result, { status: 202 });
  
} catch (error) {
  if (error instanceof WorkspaceNotFoundError) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 404 },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid activity event.",
        issues: error.issues,
      },
      { status: 400 },
    );
  }

  // Log the error details without logging request bodies or credentials.
  console.error("Activity event processing failed.", {
    name: error instanceof Error ? error.name : "UnknownError",
    message:
      error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    { error: "Could not process activity event." },
    { status: 500 },
  );
};

}
