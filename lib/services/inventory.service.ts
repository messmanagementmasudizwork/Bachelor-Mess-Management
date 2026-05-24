import { getRequiredClient } from "@/lib/supabase/client";

export interface CreateInventoryInput {
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_threshold: number;
}

export interface UpdateInventoryInput {
  quantity?: number;
  min_threshold?: number;
}

export const inventoryService = {
  async getInventory(messId: string) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("mess_id", messId)
      .order("category", { ascending: true })
      .order("item_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async createItem(messId: string, input: CreateInventoryInput) {
    const supabase = getRequiredClient();
    const { data, error } = await supabase
      .from("inventory")
      .insert({
        mess_id: messId,
        item_name: input.item_name,
        category: input.category,
        quantity: input.quantity,
        unit: input.unit,
        min_threshold: input.min_threshold,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateItem(itemId: string, input: UpdateInventoryInput) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("inventory")
      .update({
        ...input,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);
    if (error) throw new Error(error.message);
  },

  async deleteItem(itemId: string) {
    const supabase = getRequiredClient();
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", itemId);
    if (error) throw new Error(error.message);
  },
};
