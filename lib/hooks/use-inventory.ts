"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService, type CreateInventoryInput, type UpdateInventoryInput } from "@/lib/services/inventory.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";

export const INVENTORY_KEYS = {
  all: ["inventory"] as const,
  list: (messId: string) => [...INVENTORY_KEYS.all, "list", messId] as const,
};

export function useInventory() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: INVENTORY_KEYS.list(activeMess?.id!),
    queryFn: () => inventoryService.getInventory(activeMess!.id),
    enabled: !!activeMess?.id,
  });
}

export function useCreateInventoryItem() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInventoryInput) =>
      inventoryService.createItem(activeMess!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      toast.success(getT().toasts.itemAdded);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInventoryInput }) =>
      inventoryService.updateItem(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      toast.success(getT().toasts.itemUpdated);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => inventoryService.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      toast.success(getT().toasts.itemDeleted);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
