
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { evaluateScheduledRules } from
  "@/lib/server/reminders/evaluate-scheduled-rules";
import { processDueNotificationJobs } from
  "@/workers/notification-worker";
import { reconcileStaleNotificationJobs } from
  "@/workers/reminder-reconciler";



function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization ?? "");

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    // 1. Flag jobs stuck in processing for review.
    const reconciliation =
      await reconcileStaleNotificationJobs();

    // 2. Create jobs for rules that are due.
    const evaluation = await evaluateScheduledRules();

    // 3. Process due notification jobs.
    const notifications =
      await processDueNotificationJobs();

    return NextResponse.json({
      success: true,
      reconciliation,
      evaluation,
      notifications,
    });
  } catch (error) {
    console.error("Scheduled reminder run failed:", error);
  
    return NextResponse.json(
      { error: "Scheduled reminder run failed." },
      { status: 500 },
    );
  }
}
