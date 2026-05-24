"use client";
import { Settings2, CopyCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/hooks/use-language";
import { cn } from "@/lib/utils";

interface MealDefaults {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface Props {
  defaults: MealDefaults;
  setDefaults: React.Dispatch<React.SetStateAction<MealDefaults>>;
  onSave: () => void;
  isSaving: boolean;
  disabled: boolean;
}

export function MealDefaultsTab({ defaults, setDefaults, onSave, isSaving, disabled }: Props) {
  const { t } = useLanguage();

  const mealItems = [
    { key: "breakfast" as const, label: t.meals.breakfastFull, emoji: "🌅" },
    { key: "lunch" as const, label: t.meals.lunchFull, emoji: "☀️" },
    { key: "dinner" as const, label: t.meals.dinnerFull, emoji: "🌙" },
  ];

  const activeLabels = [
    defaults.breakfast && `🌅 ${t.meals.breakfast}`,
    defaults.lunch && `☀️ ${t.meals.lunch}`,
    defaults.dinner && `🌙 ${t.meals.dinner}`,
  ].filter(Boolean).join(", ") || t.meals.allOff;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-slate-500" />
          {t.meals.recurringDefaults}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t.meals.defaultsNote}</p>

        <div className="space-y-2">
          {mealItems.map(({ key, label, emoji }) => (
            <div
              key={key}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border-2 transition-colors",
                defaults[key] ? "border-green-200 bg-green-50/40" : "border-border bg-background"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{emoji}</span>
                <div>
                  <Label className="text-sm font-medium cursor-pointer">{label}</Label>
                  <p className="text-xs text-muted-foreground">
                    {defaults[key] ? t.meals.mealOn : t.meals.mealOff}
                  </p>
                </div>
              </div>
              <Switch
                checked={defaults[key]}
                onCheckedChange={(v) => setDefaults((prev) => ({ ...prev, [key]: v }))}
              />
            </div>
          ))}
        </div>

        <Button onClick={onSave} disabled={isSaving || disabled} className="w-full">
          <CopyCheck className="h-4 w-4 mr-2" />
          {isSaving ? t.meals.savingDefaults : t.meals.saveDefaults}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          {t.meals.currentDefaults} {activeLabels}
        </p>
      </CardContent>
    </Card>
  );
}
