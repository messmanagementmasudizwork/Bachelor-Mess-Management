"use client";
import { useState, useEffect } from "react";
import { UtensilsCrossed, Coffee, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMyMembership, useUpdateMealDefaults } from "@/lib/hooks/use-members";
import { useLanguage } from "@/lib/hooks/use-language";

export function MealDefaultsSection() {
  const { t } = useLanguage();
  const { data: membership } = useMyMembership();
  const updateDefaults = useUpdateMealDefaults();

  const [breakfast, setBreakfast] = useState(true);
  const [lunch, setLunch] = useState(true);
  const [dinner, setDinner] = useState(true);

  useEffect(() => {
    if (membership) {
      setBreakfast(membership.meal_default_breakfast ?? true);
      setLunch(membership.meal_default_lunch ?? true);
      setDinner(membership.meal_default_dinner ?? true);
    }
  }, [membership]);

  const handleSave = () => {
    if (!membership?.id) return;
    updateDefaults.mutate({
      memberId: membership.id,
      defaults: {
        meal_default_breakfast: breakfast,
        meal_default_lunch: lunch,
        meal_default_dinner: dinner,
      },
    });
  };

  const MEALS = [
    { key: "breakfast", label: t.meals.breakfastFull, icon: Coffee, value: breakfast, set: setBreakfast },
    { key: "lunch", label: t.meals.lunchFull, icon: Sun, value: lunch, set: setLunch },
    { key: "dinner", label: t.meals.dinnerFull, icon: Moon, value: dinner, set: setDinner },
  ] as const;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4" />
          {t.meals.defaultMealPrefs}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t.meals.defaultMealNote}
        </p>
        <div className="space-y-3">
          {MEALS.map(({ key, label, icon: Icon, value, set }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <Label className="cursor-pointer font-normal">{label}</Label>
              </div>
              <Switch checked={value} onCheckedChange={set} />
            </div>
          ))}
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          loading={updateDefaults.isPending}
          className="w-full"
        >
          {updateDefaults.isPending ? t.meals.savingDefaults : t.meals.saveDefaults}
        </Button>
      </CardContent>
    </Card>
  );
}
