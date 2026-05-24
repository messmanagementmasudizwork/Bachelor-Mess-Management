"use client";
import { useState } from "react";
import { Users, Minus, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpdateMeal } from "@/lib/hooks/use-meals";
import { useLanguage } from "@/lib/hooks/use-language";
import { cn } from "@/lib/utils";
import type { MealEntry } from "@/lib/types";

interface GuestMealSectionProps {
  todayMeal: MealEntry | undefined;
  memberId: string;
  date: string;
}

type ColorKey = "amber" | "blue" | "indigo";

const colorMap: Record<ColorKey, { bg: string; text: string; btn: string }> = {
  amber: { bg: "bg-amber-50", text: "text-amber-700", btn: "border-amber-200 hover:bg-amber-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", btn: "border-blue-200 hover:bg-blue-100" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", btn: "border-indigo-200 hover:bg-indigo-100" },
};

export function GuestMealSection({ todayMeal, memberId, date }: GuestMealSectionProps) {
  const { t } = useLanguage();
  const updateMeal = useUpdateMeal(memberId);
  const [isOpen, setIsOpen] = useState(false);

  const guestTypes = [
    { key: "guest_breakfast" as const, label: t.meals.breakfast, color: "amber" as ColorKey },
    { key: "guest_lunch" as const, label: t.meals.lunch, color: "blue" as ColorKey },
    { key: "guest_dinner" as const, label: t.meals.dinner, color: "indigo" as ColorKey },
  ];

  const getCurrent = (key: typeof guestTypes[0]["key"]) =>
    todayMeal?.[key] ?? 0;

  const totalGuest =
    getCurrent("guest_breakfast") +
    getCurrent("guest_lunch") +
    getCurrent("guest_dinner");

  const handleChange = async (key: typeof guestTypes[0]["key"], delta: number) => {
    const next = Math.max(0, getCurrent(key) + delta);
    await updateMeal.mutateAsync({
      date,
      breakfast: todayMeal?.breakfast ?? true,
      lunch: todayMeal?.lunch ?? true,
      dinner: todayMeal?.dinner ?? true,
      guest_breakfast: key === "guest_breakfast" ? next : getCurrent("guest_breakfast"),
      guest_lunch: key === "guest_lunch" ? next : getCurrent("guest_lunch"),
      guest_dinner: key === "guest_dinner" ? next : getCurrent("guest_dinner"),
    });
  };

  return (
    <Card>
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => setIsOpen((v) => !v)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            {t.meals.guestMealTitle}
          </span>
          <div className="flex items-center gap-2">
            {totalGuest > 0 && (
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                {t.meals.guestMealTotal.replace("{count}", String(totalGuest))}
              </span>
            )}
            {isOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isOpen && (
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            {t.meals.guestMealNote}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {guestTypes.map(({ key, label, color }) => {
              const c = colorMap[color];
              const count = getCurrent(key);
              return (
                <div
                  key={key}
                  className={cn("rounded-xl p-3 flex flex-col items-center gap-2", c.bg)}
                >
                  <p className={cn("text-xs font-semibold", c.text)}>{label}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("h-7 w-7 rounded-full", c.btn)}
                      onClick={() => handleChange(key, -1)}
                      disabled={count === 0 || updateMeal.isPending}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className={cn("text-xl font-bold min-w-[2ch] text-center", c.text)}>
                      {count}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("h-7 w-7 rounded-full", c.btn)}
                      onClick={() => handleChange(key, 1)}
                      disabled={updateMeal.isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {totalGuest === 0 && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              {t.meals.noGuestToday}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
