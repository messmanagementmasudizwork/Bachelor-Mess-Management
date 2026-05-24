"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vacationService, type CreateVacationInput } from "@/lib/services/vacation.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export const VACATION_KEYS = {
  all:    ["vacations"] as const,
  list:   (messId: string) => ["vacations", "list", messId] as const,
  active: (messId: string) => ["vacations", "active", messId] as const,
  byId:   (id: string)     => ["vacations", "byId", id]     as const,
};

export function useVacations() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: VACATION_KEYS.list(activeMess?.id ?? ""),
    queryFn:  () => vacationService.getVacations(activeMess!.id),
    enabled:  !!activeMess?.id,
  });
}

export function useActiveVacation() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey:      VACATION_KEYS.active(activeMess?.id ?? ""),
    queryFn:       () => vacationService.getActiveVacation(activeMess!.id),
    enabled:       !!activeMess?.id,
    refetchInterval: 60_000,
    staleTime:     60_000,
  });
}

export function useCreateVacation() {
  const { activeMess } = useMessStore();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateVacationInput) =>
      vacationService.createVacation(
        activeMess!.id,
        input,
        user!.id,
        activeMess!.name
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VACATION_KEYS.list(activeMess?.id ?? "") });
      qc.invalidateQueries({ queryKey: VACATION_KEYS.active(activeMess?.id ?? "") });
      qc.invalidateQueries({ queryKey: ["meals"] });
      toast.success("ছুটি ঘোষণা করা হয়েছে এবং সব সদস্যকে জানানো হয়েছে");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useVacationById(vacationId: string | undefined) {
  return useQuery({
    queryKey: VACATION_KEYS.byId(vacationId ?? ""),
    queryFn:  () => vacationService.getVacationById(vacationId!),
    enabled:  !!vacationId,
    staleTime: 5 * 60_000,
  });
}

export function useDeleteVacation() {
  const { activeMess } = useMessStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vacation: import("@/lib/services/vacation.service").MessVacation) =>
      vacationService.deleteVacation(vacation),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VACATION_KEYS.list(activeMess?.id ?? "") });
      qc.invalidateQueries({ queryKey: VACATION_KEYS.active(activeMess?.id ?? "") });
      qc.invalidateQueries({ queryKey: ["meals"] });
      toast.success("ছুটি বাতিল করা হয়েছে এবং সদস্যদের মিল পুনরায় চালু করা হয়েছে");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
