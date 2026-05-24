// ============================================================
// Leave Violation Utility
// Computes account status from open leave tracking data
// ============================================================

import type { AccountStatus } from "@/lib/types";

export interface ViolationStatus {
  status: AccountStatus;
  excessDays: number;
  violationSince: string | null;
}

/**
 * How many days between two YYYY-MM-DD strings.
 */
function daysDiff(from: string, to: string): number {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T00:00:00").getTime();
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

/**
 * Add N days to a YYYY-MM-DD string (local timezone).
 */
export function addDaysToDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

/**
 * Today as YYYY-MM-DD (local timezone).
 */
export function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Compute the current violation status for a member.
 *
 * @param openLeaveStarted  - date when Sick/Off-Until-ON leave was started (null = not on open leave)
 * @param maxLeaveDays      - mess setting: max allowed leave days (default 90)
 * @param currentStatus     - current stored account_status (used to preserve 'closed' permanently)
 * @returns ViolationStatus with computed status, excess days, and violation-since date
 */
export function computeViolationStatus(
  openLeaveStarted: string | null,
  maxLeaveDays: number,
  currentStatus: AccountStatus = "active"
): ViolationStatus {
  // Permanent closure — can never be changed
  if (currentStatus === "closed") {
    return { status: "closed", excessDays: 0, violationSince: null };
  }

  // No open leave → active
  if (!openLeaveStarted) {
    return { status: "active", excessDays: 0, violationSince: null };
  }

  const today = localToday();
  const totalDays = daysDiff(openLeaveStarted, today);

  if (totalDays <= maxLeaveDays) {
    // Still within limit — active
    return { status: "active", excessDays: 0, violationSince: null };
  }

  // Exceeded limit
  const violationSince = addDaysToDate(openLeaveStarted, maxLeaveDays);
  const excessDays = daysDiff(violationSince, today);

  let status: AccountStatus;
  if (excessDays <= 5) {
    status = "frozen";
  } else if (excessDays <= 10) {
    status = "banned";
  } else {
    status = "closed"; // permanent
  }

  return { status, excessDays, violationSince };
}

/**
 * Can this role reactivate a member with the given status?
 * frozen  → owner, admin, manager
 * banned  → owner, admin only
 * closed  → nobody
 */
export function canReactivate(
  role: string | undefined,
  targetStatus: AccountStatus
): boolean {
  if (!role || targetStatus === "active" || targetStatus === "closed") return false;
  if (targetStatus === "frozen") return ["owner", "admin", "manager"].includes(role);
  if (targetStatus === "banned") return ["owner", "admin"].includes(role);
  return false;
}
