"use client";
import { useState } from "react";
import { Trophy, Star, Medal, Crown, Award, TrendingUp, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { useLeaderboard, useMyAchievements } from "@/lib/hooks/use-gamification";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { MemberScore } from "@/lib/utils/gamification";
import { useLanguage } from "@/lib/hooks/use-language";

const RANK_COLORS = [
  "text-yellow-500",
  "text-gray-400",
  "text-amber-600",
];

const RANK_BG = [
  "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800",
  "bg-gray-50 border-gray-200 dark:bg-gray-800/30 dark:border-gray-700",
  "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
];

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

function RankCard({ score, isMe }: { score: MemberScore; isMe: boolean }) {
  const { t } = useLanguage();
  const isTop3 = score.rank <= 3;
  const earnedBadges = score.badges.filter((b) => b.earned);

  const roleLabels: Record<string, string> = {
    owner: t.gamification.roles.owner,
    admin: t.gamification.roles.admin,
    manager: t.gamification.roles.manager,
    assistant_manager: t.gamification.roles.assistant_manager,
    member: t.gamification.roles.member,
    guest: t.gamification.roles.guest,
  };

  return (
    <Card className={cn(
      "border transition-all",
      isTop3 && RANK_BG[score.rank - 1],
      isMe && "ring-2 ring-primary"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarFallback className={cn("text-sm font-bold", isTop3 && RANK_COLORS[score.rank - 1])}>
                {getInitials(score.member_name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -top-1 -right-1 text-lg leading-none">
              {isTop3 ? RANK_EMOJI[score.rank - 1] : `#${score.rank}`}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{score.member_name}</h3>
              {isMe && <Badge variant="default" className="text-xs">{t.gamification.you}</Badge>}
              <span className="text-xs text-muted-foreground">{roleLabels[score.role] ?? score.role}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {earnedBadges.slice(0, 3).map((badge) => (
                <span
                  key={badge.id}
                  className="text-sm"
                  title={`${badge.label}: ${badge.description}`}
                >
                  {badge.emoji}
                </span>
              ))}
              {earnedBadges.length > 3 && (
                <span className="text-xs text-muted-foreground">+{earnedBadges.length - 3}</span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1 mt-2 text-center">
              {[
                { label: t.gamification.meals, value: score.meal_score },
                { label: t.gamification.bazaar, value: score.bazaar_score },
                { label: t.gamification.expenses, value: score.expense_score },
                { label: t.gamification.deposits, value: score.deposit_score },
              ].map((item) => (
                <div key={item.label} className="bg-muted/50 rounded p-1">
                  <p className="text-xs font-medium">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 text-center">
            <p className={cn(
              "text-2xl font-bold",
              isTop3 ? RANK_COLORS[score.rank - 1] : "text-foreground"
            )}>
              {score.total_score}
            </p>
            <p className="text-[10px] text-muted-foreground">{t.gamification.points}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementsTab() {
  const { t } = useLanguage();
  const { data: achievements = [], isLoading } = useMyAchievements();

  const earned = achievements.filter((a) => a.earned);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <span>{earned.length}/{achievements.length} {t.gamification.allAchievements}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {achievements.map((ach) => {
            const pct = Math.min(100, Math.round((ach.value / ach.threshold) * 100));
            return (
              <Card key={ach.id} className={cn("border", !ach.earned && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className={cn("text-3xl", !ach.earned && "grayscale")}>{ach.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground">{ach.label}</h4>
                        {ach.earned && (
                          <Badge variant="default" className="text-xs gap-1">
                            <Star className="h-3 w-3" /> {t.gamification.achieved}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{ach.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground font-mono">
                          {ach.value}/{ach.threshold}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GamificationPage() {
  const { t } = useLanguage();
  const { data: leaderboard = [], isLoading } = useLeaderboard();
  const { user } = useAuthStore();

  const topPlayer = leaderboard[0];
  const myRank = leaderboard.find((s) => s.member_id === user?.id);
  const earnedBadgesCount = myRank?.badges.filter((b) => b.earned).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center p-4">
          <p className="text-2xl">🏆</p>
          <p className="text-xs font-medium text-foreground mt-1 truncate">
            {topPlayer?.member_name?.split(" ")[0] ?? "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">{t.gamification.stats.bestThisMonth}</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-primary">#{myRank?.rank ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.gamification.stats.yourRank}</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-yellow-500">{earnedBadgesCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.gamification.stats.badgesEarned}</p>
        </Card>
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList className="w-full">
          <TabsTrigger value="leaderboard" className="flex-1 gap-1.5">
            <Trophy className="h-4 w-4" /> {t.gamification.tabs.leaderboard}
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex-1 gap-1.5">
            <Star className="h-4 w-4" /> {t.gamification.tabs.achievements}
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex-1 gap-1.5">
            <Medal className="h-4 w-4" /> {t.gamification.tabs.badges}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : leaderboard.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-8 w-8" />}
              title={t.noData}
              description={t.noData}
            />
          ) : (
            leaderboard.map((score) => (
              <RankCard
                key={score.member_id}
                score={score}
                isMe={score.member_id === user?.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <AchievementsTab />
        </TabsContent>

        <TabsContent value="badges" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : myRank == null ? (
            <EmptyState
              icon={<Award className="h-8 w-8" />}
              title={t.noData}
              description={t.noData}
            />
          ) : (
            <div className="space-y-2">
              {myRank.badges.map((badge) => (
                <Card key={badge.id} className={cn("border", !badge.earned && "opacity-50")}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <span className={cn("text-3xl", !badge.earned && "grayscale")}>{badge.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{badge.label}</h4>
                        {badge.earned && (
                          <Badge variant="default" className="text-xs">{t.gamification.achieved} ✓</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
