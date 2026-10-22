
import { describe, expect, it } from "vitest";

import { evaluateReminderRule } from "@/lib/server/rules/evaluator";

describe("evaluateReminderRule", () => {
  const now = new Date("2026-10-20T10:20:00.000Z");

  it("triggers after 20 minutes of active work", () => {
    const result = evaluateReminderRule(
      "rule-1",
      {
        type: "active_work",
        thresholdSeconds: 1200,
        repeat: false,
      },
      {
        now,
        sessionId: "session-1",
        activeSeconds: 1200,
      },
    );

    expect(result.shouldTrigger).toBe(true);
  });

  it("does not trigger before the active-work threshold", () => {
    const result = evaluateReminderRule(
      "rule-1",
      {
        type: "active_work",
        thresholdSeconds: 1200,
        repeat: false,
      },
      {
        now,
        sessionId: "session-1",
        activeSeconds: 1199,
      },
    );

    expect(result.shouldTrigger).toBe(false);
  });

  it("triggers when inactivity reaches 20 minutes", () => {
    const result = evaluateReminderRule(
      "rule-2",
      {
        type: "inactivity",
        thresholdSeconds: 1200,
        repeat: false,
      },
      {
        now,
        sessionId: "session-1",
        idleSinceAt: new Date(
          "2026-10-20T10:00:00.000Z",
        ),
      },
    );

    expect(result.shouldTrigger).toBe(true);
  });

  it("triggers 20 minutes before a deadline", () => {
    const result = evaluateReminderRule(
      "rule-3",
      {
        type: "deadline",
        deadlineAt: "2026-10-20T10:40:00.000Z",
        leadTimeSeconds: 1200,
      },
      { now },
    );

    expect(result.shouldTrigger).toBe(true);
  });

  it("does not trigger a deadline reminder after the deadline", () => {
    const result = evaluateReminderRule(
      "rule-3",
      {
        type: "deadline",
        deadlineAt: "2026-10-20T10:10:00.000Z",
        leadTimeSeconds: 1200,
      },
      { now },
    );

    expect(result.shouldTrigger).toBe(false);
  });

  it("does not trigger a future fixed-time reminder early", () => {
    const result = evaluateReminderRule(
      "rule-4",
      {
        type: "fixed_time",
        scheduledAt: "2026-10-20T11:00:00.000Z",
      },
      { now },
    );

    expect(result.shouldTrigger).toBe(false);
  });
});
