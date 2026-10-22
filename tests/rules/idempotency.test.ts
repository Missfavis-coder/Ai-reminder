
import { describe, expect, it } from "vitest";

import {
  activeWorkIdempotencyKey,
  fixedTimeIdempotencyKey,
} from "@/lib/server/reminders/idempotency";

describe("reminder idempotency keys", () => {
  it("generates the same key for the same milestone", () => {
    const input = {
      ruleId: "rule-1",
      sessionId: "session-1",
      milestone: 1,
    };

    expect(activeWorkIdempotencyKey(input)).toBe(
      activeWorkIdempotencyKey(input),
    );
  });

  it("generates different keys for different milestones", () => {
    const first = activeWorkIdempotencyKey({
      ruleId: "rule-1",
      sessionId: "session-1",
      milestone: 1,
    });

    const second = activeWorkIdempotencyKey({
      ruleId: "rule-1",
      sessionId: "session-1",
      milestone: 2,
    });

    expect(first).not.toBe(second);
  });

  it("generates stable keys for fixed-time reminders", () => {
    const input = {
      ruleId: "rule-2",
      scheduledAt: new Date("2026-10-20T12:00:00.000Z"),
    };

    expect(fixedTimeIdempotencyKey(input)).toBe(
      fixedTimeIdempotencyKey(input),
    );
  });
});
