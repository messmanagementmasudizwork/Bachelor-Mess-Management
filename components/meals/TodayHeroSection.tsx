"use client";
import { Check, X, Utensils } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTodayString } from "@/lib/utils/date";
import { useLanguage } from "@/lib/hooks/use-language";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { cn } from "@/lib/utils";
import type { MealEntry } from "@/lib/types";

const MEAL_EMOJIS = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" } as const;

interface Props {
  todayMeal: MealEntry | undefined;
}

export function TodayHeroSection({ todayMeal }: Props) {
  const { t } = useLanguage();
  const { formatDatePref } = usePreferences();
  const today = getTodayString();

  const mealTypes = [
    { key: "breakfast" as const, label: t.meals.breakfast },
    { key: "lunch"     as const, label: t.meals.lunch     },
    { key: "dinner"    as const, label: t.meals.dinner    },
  ];

  const isVacationDay = !!todayMeal?.vacation_id &&
    !todayMeal.breakfast && !todayMeal.lunch && !todayMeal.dinner;

  const userMealCount = mealTypes.reduce(
    (sum, mt) => sum + (todayMeal ? (todayMeal[mt.key] ? 1 : 0) : 1),
    0
  );

  return (
    <Card className="overflow-hidden border shadow-sm bg-gradient-to-br from-primary/5 via-background to-blue-50/20">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold">{t.meals.todayMeals}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDatePref(today)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Utensils className="h-3 w-3" />
              {userMealCount}/3 {t.meals.sessionsUnit}
            </Badge>
            {isVacationDay && (
              <Badge className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100">
                🏖️ {t.meals.vacationLabel}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {mealTypes.map((type) => {
            const isOn = todayMeal ? todayMeal[type.key] : true;
            const isVacationOff = !isOn && !!todayMeal?.vacation_id;

            return (
              <div
                key={type.key}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 select-none min-h-[100px] justify-center",
                  isOn
                    ? "bg-green-50 border-green-300 text-green-800"
                    : isVacationOff
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-red-50 border-red-300 text-red-700"
                )}
              >
                <span className="text-2xl leading-none select-none">
                  {isVacationOff ? "🏖️" : MEAL_EMOJIS[type.key]}
                </span>
                <span className="text-xs font-bold">{type.label}</span>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                  isOn
                    ? "bg-green-200 text-green-800"
                    : isVacationOff
                    ? "bg-blue-200 text-blue-800"
                    : "bg-red-200 text-red-800"
                )}>
                  {isOn
                    ? <Check className="h-2.5 w-2.5" />
                    : <X className="h-2.5 w-2.5" />}
                  <span>
                    {isOn ? t.meals.mealOn : isVacationOff ? t.meals.vacationOff : t.meals.mealOff}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
