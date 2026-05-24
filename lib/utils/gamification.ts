// ============================================================
// Gamification — Scoring & Achievement Engine
// All scores computed from existing DB data (no new table needed)
// ============================================================
import { getT } from "@/lib/i18n/get-t";

export interface MemberScore {
  member_id: string;
  member_name: string;
  avatar_url?: string | null;
  role: string;
  meal_score: number;
  expense_score: number;
  deposit_score: number;
  bazaar_score: number;
  total_score: number;
  rank: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  description: string;
  earned: boolean;
}

export interface Achievement {
  id: string;
  label: string;
  emoji: string;
  description: string;
  threshold: number;
  value: number;
  earned: boolean;
}

// Points multipliers
const POINTS = {
  per_meal: 1,
  per_expense_submitted: 5,
  per_expense_approved: 3,
  per_bazaar_entry: 8,
  per_deposit_confirmed: 2,
  manager_bonus: 20,
};

export function computeMemberScore(params: {
  memberId: string;
  memberName: string;
  avatarUrl?: string | null;
  role: string;
  totalMeals: number;
  expensesSubmitted: number;
  expensesApproved: number;
  bazaarEntries: number;
  depositsConfirmed: number;
  wasManager: boolean;
}): Omit<MemberScore, "rank"> {
  const meal_score = params.totalMeals * POINTS.per_meal;
  const expense_score =
    params.expensesSubmitted * POINTS.per_expense_submitted +
    params.expensesApproved * POINTS.per_expense_approved;
  const bazaar_score = params.bazaarEntries * POINTS.per_bazaar_entry;
  const deposit_score = params.depositsConfirmed * POINTS.per_deposit_confirmed;
  const manager_bonus = params.wasManager ? POINTS.manager_bonus : 0;
  const total_score = meal_score + expense_score + bazaar_score + deposit_score + manager_bonus;

  const badges = computeBadges(params);

  return {
    member_id: params.memberId,
    member_name: params.memberName,
    avatar_url: params.avatarUrl,
    role: params.role,
    meal_score,
    expense_score,
    deposit_score,
    bazaar_score,
    total_score,
    badges,
  };
}

export function computeBadges(params: {
  totalMeals: number;
  expensesSubmitted: number;
  bazaarEntries: number;
  depositsConfirmed: number;
  wasManager: boolean;
  role: string;
}): Badge[] {
  const g = getT().gamificationExt;
  return [
    {
      id: "regular_eater",
      label: g.badges.regularEater,
      emoji: "🍽️",
      description: g.badgeDescs.regularEater,
      earned: params.totalMeals >= 30,
    },
    {
      id: "super_eater",
      label: g.badges.mealChampion,
      emoji: "🏆",
      description: g.badgeDescs.mealChampion,
      earned: params.totalMeals >= 100,
    },
    {
      id: "bazaar_hero",
      label: g.badges.bazaarHero,
      emoji: "🛒",
      description: g.badgeDescs.bazaarHero,
      earned: params.bazaarEntries >= 10,
    },
    {
      id: "expense_keeper",
      label: g.badges.accountant,
      emoji: "📋",
      description: g.badgeDescs.accountant,
      earned: params.expensesSubmitted >= 5,
    },
    {
      id: "reliable_depositor",
      label: g.badges.trustedDepositor,
      emoji: "💰",
      description: g.badgeDescs.trustedDepositor,
      earned: params.depositsConfirmed >= 3,
    },
    {
      id: "manager_experience",
      label: g.badges.experiencedManager,
      emoji: "👔",
      description: g.badgeDescs.experiencedManager,
      earned: params.wasManager,
    },
    {
      id: "senior_role",
      label: g.badges.seniorMember,
      emoji: "⭐",
      description: g.badgeDescs.seniorMember,
      earned: params.role === "owner" || params.role === "admin",
    },
  ];
}

export function computeAchievements(totalMeals: number, bazaarEntries: number, expensesSubmitted: number): Achievement[] {
  const g = getT().gamificationExt;
  return [
    {
      id: "meals_10", label: g.achievements.meals10, emoji: "🌱",
      description: g.achievements.meals10Desc, threshold: 10, value: totalMeals,
      earned: totalMeals >= 10,
    },
    {
      id: "meals_50", label: g.achievements.meals50, emoji: "🌟",
      description: g.achievements.meals50Desc, threshold: 50, value: totalMeals,
      earned: totalMeals >= 50,
    },
    {
      id: "meals_100", label: g.achievements.meals100, emoji: "💯",
      description: g.achievements.meals100Desc, threshold: 100, value: totalMeals,
      earned: totalMeals >= 100,
    },
    {
      id: "bazaar_5", label: g.achievements.bazaar5, emoji: "🛍️",
      description: g.achievements.bazaar5Desc, threshold: 5, value: bazaarEntries,
      earned: bazaarEntries >= 5,
    },
    {
      id: "bazaar_20", label: g.achievements.bazaar20, emoji: "🏪",
      description: g.achievements.bazaar20Desc, threshold: 20, value: bazaarEntries,
      earned: bazaarEntries >= 20,
    },
    {
      id: "expense_3", label: g.achievements.expense3, emoji: "📊",
      description: g.achievements.expense3Desc, threshold: 3, value: expensesSubmitted,
      earned: expensesSubmitted >= 3,
    },
    {
      id: "expense_10", label: g.achievements.expense10, emoji: "📈",
      description: g.achievements.expense10Desc, threshold: 10, value: expensesSubmitted,
      earned: expensesSubmitted >= 10,
    },
  ];
}

export function rankMembers(scores: Omit<MemberScore, "rank">[]): MemberScore[] {
  const sorted = [...scores].sort((a, b) => b.total_score - a.total_score);
  return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
}
