// ============================================================
// Financial Utility Functions
// All monetary calculations use integer arithmetic (paisa/cents)
// to avoid floating-point precision issues
// ============================================================

/**
 * Format amount as Bangladeshi Taka
 */
export function formatTaka(amount: number, showSymbol = true): string {
  const formatted = Math.abs(amount).toLocaleString("bn-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? "-" : "";
  return showSymbol ? `${sign}৳${formatted}` : `${sign}${formatted}`;
}

/**
 * Format amount as English number with Taka symbol
 */
export function formatTakaEN(amount: number, showSymbol = true): string {
  const formatted = Math.abs(amount).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? "-" : "";
  return showSymbol ? `${sign}৳${formatted}` : `${sign}${formatted}`;
}

/**
 * Calculate meal rate
 * Formula: Total Variable Expense / Total Meals
 */
export function calculateMealRate(
  totalVariableExpense: number,
  totalMeals: number
): number {
  if (totalMeals === 0) return 0;
  return Math.round((totalVariableExpense / totalMeals) * 100) / 100;
}

/**
 * Calculate member's meal cost
 */
export function calculateMemberMealCost(
  memberTotalMeals: number,
  mealRate: number
): number {
  return Math.round(memberTotalMeals * mealRate * 100) / 100;
}

/**
 * Calculate member's share of fixed expenses
 */
export function calculateFixedExpenseShare(
  totalFixedExpense: number,
  activeMembers: number
): number {
  if (activeMembers === 0) return 0;
  return Math.round((totalFixedExpense / activeMembers) * 100) / 100;
}

/**
 * Calculate member's balance
 * Positive = advance, Negative = due
 */
export function calculateBalance(
  totalDeposited: number,
  totalCost: number
): number {
  return Math.round((totalDeposited - totalCost) * 100) / 100;
}

/**
 * Determine balance status
 */
export function getBalanceStatus(
  balance: number
): "advance" | "clear" | "due" {
  if (balance > 0) return "advance";
  if (balance < 0) return "due";
  return "clear";
}

/**
 * Count total meals from a meal entry
 */
export function countTotalMeals(
  breakfast: boolean,
  lunch: boolean,
  dinner: boolean,
  guestBreakfast = 0,
  guestLunch = 0,
  guestDinner = 0
): number {
  const regular = (breakfast ? 1 : 0) + (lunch ? 1 : 0) + (dinner ? 1 : 0);
  const guests = guestBreakfast + guestLunch + guestDinner;
  return regular + guests;
}

/**
 * Parse number safely, returning 0 for invalid values
 */
export function safeParseNumber(value: unknown): number {
  const n = Number(value);
  return isNaN(n) || !isFinite(n) ? 0 : n;
}

/**
 * Round to 2 decimal places
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate guest meal charge for a member
 * Each guest meal is charged at guestMealCharge rate (per meal)
 */
export function calculateGuestMealCharge(
  guestBreakfast: number,
  guestLunch: number,
  guestDinner: number,
  guestMealCharge: number
): number {
  const totalGuestMeals = guestBreakfast + guestLunch + guestDinner;
  return round2(totalGuestMeals * guestMealCharge);
}

/**
 * Calculate late meal penalty for a member
 * lateMealCount: number of late meal toggles (after cutoff)
 * penaltyPerLate: penalty amount per late toggle from mess settings
 */
export function calculateLateMealPenalty(
  lateMealCount: number,
  penaltyPerLate: number
): number {
  return round2(lateMealCount * penaltyPerLate);
}

/**
 * Calculate total member cost including guest charges and late penalties
 */
export function calculateTotalMemberCost(
  regularMeals: number,
  mealRate: number,
  fixedShare: number,
  guestBreakfast: number,
  guestLunch: number,
  guestDinner: number,
  guestMealCharge: number,
  lateMealCount: number,
  lateMealPenalty: number
): number {
  const mealCost = calculateMemberMealCost(regularMeals, mealRate);
  const guestCost = calculateGuestMealCharge(guestBreakfast, guestLunch, guestDinner, guestMealCharge);
  const penalty = calculateLateMealPenalty(lateMealCount, lateMealPenalty);
  return round2(mealCost + fixedShare + guestCost + penalty);
}
