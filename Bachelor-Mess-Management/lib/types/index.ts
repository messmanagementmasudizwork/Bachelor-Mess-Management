// ============================================================
// BACHELOR MESS MANAGEMENT PLATFORM - Core Types
// ============================================================

export * from "./mess.types";
export * from "./member.types";
export * from "./meal.types";
export * from "./expense.types";
export * from "./deposit.types";
export * from "./notification.types";
export * from "./report.types";

// ---- Generic Types ----
export type UUID = string;
export type DateString = string; // ISO 8601

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface DateRangeFilter {
  from: DateString;
  to: DateString;
}

export interface AuditFields {
  created_at: string;
  updated_at: string;
  created_by?: UUID | null;
  updated_by?: UUID | null;
}
