import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { menuService, type UpsertMenuInput } from "@/lib/services/menu.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { getT } from "@/lib/i18n/get-t";

const MENU_KEY = (messId?: string) => ["menu", messId];

export function useWeeklyMenu() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: MENU_KEY(activeMess?.id),
    queryFn: () => menuService.getWeeklyMenu(activeMess!.id),
    enabled: !!activeMess?.id,
    staleTime: 5 * 60_000,
  });
}

export function useUpsertMenuItem() {
  const { activeMess } = useMessStore();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ input, existingId }: { input: UpsertMenuInput; existingId?: string }) =>
      menuService.upsertMenuItem(activeMess!.id, user!.id, input, existingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MENU_KEY(activeMess?.id) });
      toast.success(getT().toasts.menuSaved);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteMenuItem() {
  const { activeMess } = useMessStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => menuService.deleteMenuItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MENU_KEY(activeMess?.id) });
      toast.success(getT().toasts.menuDeleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
