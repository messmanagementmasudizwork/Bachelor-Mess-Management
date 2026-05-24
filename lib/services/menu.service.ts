import { getRequiredClient } from "@/lib/supabase/client";

export type MealSlot = "breakfast" | "lunch" | "dinner";
export type DayName = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

export const DAYS: DayName[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export interface MenuItem {
  id: string;
  mess_id: string;
  day: DayName;
  meal: MealSlot;
  items: string;
  note?: string | null;
  is_special: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertMenuInput {
  day: DayName;
  meal: MealSlot;
  items: string;
  note?: string;
  is_special?: boolean;
}

export const menuService = {
  async getWeeklyMenu(messId: string): Promise<MenuItem[]> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("mess_id", messId)
      .order("day")
      .order("meal");
    if (error) throw new Error(error.message);
    return (data ?? []) as MenuItem[];
  },

  async upsertMenuItem(
    messId: string,
    userId: string,
    input: UpsertMenuInput,
    existingId?: string
  ): Promise<MenuItem> {
    const supabase = getRequiredClient();

    if (existingId) {
      const { data, error } = await supabase
        .from("menus")
        .update({
          items: input.items,
          note: input.note ?? null,
          is_special: input.is_special ?? false,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as MenuItem;
    }

    const { data, error } = await supabase
      .from("menus")
      .insert({
        mess_id: messId,
        day: input.day,
        meal: input.meal,
        items: input.items,
        note: input.note ?? null,
        is_special: input.is_special ?? false,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as MenuItem;
  },

  async deleteMenuItem(itemId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase.from("menus").delete().eq("id", itemId);
    if (error) throw new Error(error.message);
  },
};
