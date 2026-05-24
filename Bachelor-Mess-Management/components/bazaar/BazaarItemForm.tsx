"use client";
import { useState } from "react";
import { Plus, Trash2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/hooks/use-language";
import { usePreferences } from "@/lib/hooks/use-preferences";

export interface BazaarItem {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface Props {
  items: BazaarItem[];
  onChange: (items: BazaarItem[]) => void;
}

export function BazaarItemForm({ items, onChange }: Props) {
  const { t } = useLanguage();
  const { formatCurrency } = usePreferences();
  const b = t.bazaar;
  const units = Object.values(t.inventory.units);
  const cats = t.bazaarForm.categories;
  const catItems = t.bazaarForm.items;

  type CatKey = keyof typeof cats;
  const CAT_KEYS: CatKey[] = ["grainLentils", "fishMeat", "vegetables", "spices", "oilOther"];

  const [activeCategoryKey, setActiveCategoryKey] = useState<CatKey>("grainLentils");

  const addItem = (name = "") => {
    onChange([
      ...items,
      { name, quantity: 1, unit: units[0], unit_price: 0, total_price: 0 },
    ]);
  };

  const updateItem = (index: number, field: keyof BazaarItem, value: string | number) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, [field]: value };
      if (field === "quantity" || field === "unit_price") {
        next.total_price = Number(next.quantity) * Number(next.unit_price);
      }
      return next;
    });
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const grandTotal = items.reduce((s, it) => s + it.total_price, 0);

  return (
    <div className="space-y-4">
      {/* Quick-add category selector */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">{b.quickAdd}</Label>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {CAT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategoryKey(key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                activeCategoryKey === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {cats[key]}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(catItems[activeCategoryKey] as readonly string[]).map((name) => (
            <Badge
              key={name}
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
              onClick={() => addItem(name)}
            >
              + {name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Item list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-2"
            >
              {/* Row 1: Name + delete */}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground mb-0.5 block">
                    {b.itemLabel}
                  </Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder={b.itemNamePlaceholder}
                    value={item.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="mt-4 flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Row 2: Qty | Unit | Price | Total */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-0.5 block">
                    {b.quantityLabel}
                  </Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="1"
                    value={item.quantity || ""}
                    onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-0.5 block">
                    {b.unitLabel ?? t.inventory.itemUnit}
                  </Label>
                  <Select value={item.unit} onValueChange={(v) => updateItem(i, "unit", v)}>
                    <SelectTrigger className="h-8 text-sm w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u} value={u} className="text-sm">{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-0.5 block">
                    {b.pricePerUnit}
                  </Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={item.unit_price || ""}
                    onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-0.5 block">
                    {b.totalLabel}
                  </Label>
                  <div className="h-8 flex items-center px-2 rounded-md bg-muted border border-transparent text-sm font-semibold text-primary">
                    {item.total_price > 0 ? formatCurrency(item.total_price) : "—"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add item button + grand total */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addItem()}
          className="gap-1.5 text-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          {b.addItemBtn}
        </Button>
        {grandTotal > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
            <Calculator className="h-4 w-4" />
            {b.grandTotal.replace("{amount}", formatCurrency(grandTotal))}
          </div>
        )}
      </div>
    </div>
  );
}
