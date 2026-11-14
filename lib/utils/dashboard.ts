import { CalendarClock, CalendarClockIcon, Clock3, Timer, Zap } from "lucide-react";
import { ReminderRule, ReminderRuleConfig } from "../types/reminder";
import { Task } from "../types/tasks";

export const now = new Date();
export function formatDate(value: string | null | undefined) {
    if (!value) return "No due date";
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) return "No due date";
  
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
    });
  }
  
 export function formatDateTime(value: string) {
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) return "Date unavailable";
  
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  
 export function formatDuration(seconds: number) {
    const safeSeconds = Math.max(0, seconds);
  
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
  
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
  
    return `${safeSeconds}s`;
  }
  
 export function isTaskOverdue(task: Task) {
    return (
      !task.completed &&
      Boolean(task.dueAt) &&
      new Date(task.dueAt as string).getTime() < Date.now()
    );
  }
  
 export  function getReminderTriggerTime(config: ReminderRuleConfig) {
    if (config.type === "fixed_time") {
      return new Date(config.scheduledAt).getTime();
    }
  
    if (config.type === "deadline") {
      return (
        new Date(config.deadlineAt).getTime() -
        config.leadTimeSeconds * 1000
      );
    }
  
    return null;
  }
  
  export function getReminderDescription(config: ReminderRuleConfig) {
    switch (config.type) {
      case "fixed_time":
        return `Scheduled for ${formatDateTime(config.scheduledAt)}`;
  
      case "deadline":
        return `Deadline reminder · ${formatDateTime(config.deadlineAt)}`;
  
      case "active_work":
        return `After ${Math.round(config.thresholdSeconds / 60)} minutes of active work`;
  
      case "inactivity":
        return `After ${Math.round(config.thresholdSeconds / 60)} minutes of inactivity`;
    }
  }
  
 export function getReminderIcon(type: ReminderRule["type"]) {
    switch (type) {
      case "fixed_time":
        return Clock3;
      case "deadline":
        return CalendarClockIcon;
      case "active_work":
        return Zap;
      case "inactivity":
        return Timer;
    }
  }
  
  export function getReminderTiming(rule: ReminderRule) {
    const triggerTime = getReminderTriggerTime(rule.config);
  
    if (triggerTime === null) {
      return "Condition-based";
    }
  
    if (triggerTime <= Date.now()) {
      return "Due or awaiting evaluation";
    }
  
    return formatDateTime(new Date(triggerTime).toISOString());
  }
  