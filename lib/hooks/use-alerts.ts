"use client";
import { useEffect } from "react";
import { notificationService } from "@/lib/services/notification.service";
import { useAuth } from "./use-auth";
import { useMessStore } from "@/lib/stores/mess.store";
import { useMemberBalances } from "./use-deposits";
import { getT } from "@/lib/i18n/get-t";

const ALERT_KEY = (messId: string, userId: string, month: string) =>
  `messpilot_alert_sent_${messId}_${userId}_${month}`;

export function useLowBalanceAlert(threshold = -500) {
  const { user } = useAuth();
  const { activeMess, activeMonth } = useMessStore();
  const { data: balances } = useMemberBalances();

  useEffect(() => {
    if (!user?.id || !activeMess?.id || !balances) return;

    const myBalance = balances.find((b) => b.member_id === user.id);
    if (!myBalance) return;

    const balance = Number(myBalance.balance);
    if (balance >= threshold) return;

    const key = ALERT_KEY(activeMess.id, user.id, activeMonth);
    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "1");

    const t = getT();
    notificationService.createNotification({
      user_id: user.id,
      mess_id: activeMess.id,
      type: "low_balance",
      title: t.toasts.lowBalanceTitle,
      body: t.toasts.lowBalanceBody.replace("{amount}", Math.abs(balance).toFixed(0)),
      action_url: "/dashboard/deposits",
    }).catch(() => {});
  }, [balances, user?.id, activeMess?.id, activeMonth, threshold]);
}

export function useDueReminderAlert() {
  const { user } = useAuth();
  const { activeMess, activeMonth } = useMessStore();
  const { data: balances } = useMemberBalances();

  useEffect(() => {
    if (!user?.id || !activeMess?.id || !balances) return;

    const myBalance = balances.find((b) => b.member_id === user.id);
    if (!myBalance) return;

    const balance = Number(myBalance.balance);
    if (balance >= 0) return;

    const key = `messpilot_due_alert_${activeMess.id}_${user.id}_${activeMonth}`;
    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "1");

    const t = getT();
    notificationService.createNotification({
      user_id: user.id,
      mess_id: activeMess.id,
      type: "due_reminder",
      title: t.toasts.dueReminderTitle,
      body: t.toasts.dueReminderBody.replace("{amount}", Math.abs(balance).toFixed(0)),
      action_url: "/dashboard/deposits",
    }).catch(() => {});
  }, [balances, user?.id, activeMess?.id, activeMonth]);
}
