
type ActiveWorkKeyInput = {
    ruleId: string;
    sessionId: string;
    milestone: number;
  };
  
  type InactivityKeyInput = {
    ruleId: string;
    sessionId: string;
    idleSince: Date;
  };
  
  type DeadlineKeyInput = {
    ruleId: string;
    deadlineAt: Date;
  };
  
  type FixedTimeKeyInput = {
    ruleId: string;
    scheduledAt: Date;
  };
  
  export function activeWorkIdempotencyKey(
    input: ActiveWorkKeyInput,
  ): string {
    return [
      input.ruleId,
      input.sessionId,
      "active",
      input.milestone,
    ].join(":");
  }
  
  export function inactivityIdempotencyKey(
    input: InactivityKeyInput,
  ): string {
    return [
      input.ruleId,
      input.sessionId,
      "idle",
      input.idleSince.getTime(),
    ].join(":");
  }
  
  export function deadlineIdempotencyKey(
    input: DeadlineKeyInput,
  ): string {
    return [
      input.ruleId,
      "deadline",
      input.deadlineAt.getTime(),
    ].join(":");
  }
  
  export function fixedTimeIdempotencyKey(
    input: FixedTimeKeyInput,
  ): string {
    return [
      input.ruleId,
      "fixed",
      input.scheduledAt.getTime(),
    ].join(":");
  }
  