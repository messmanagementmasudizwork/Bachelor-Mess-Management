"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRequiredClient } from "@/lib/supabase/client";
import { useMessStore } from "@/lib/stores/mess.store";
import { showBrowserNotification } from "@/lib/utils/push-notification";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface RealtimeOptions {
  table: string;
  queryKeys: readonly unknown[][];
  events?: RealtimeEvent[];
  channelSuffix?: string;
  enabled?: boolean;
}

export function useRealtimeInvalidation({
  table,
  queryKeys,
  events = ["*"],
  channelSuffix = "",
  enabled = true,
}: RealtimeOptions) {
  const queryClient = useQueryClient();
  const { activeMess } = useMessStore();

  useEffect(() => {
    if (!activeMess?.id || !enabled) return;

    const supabase = getRequiredClient();
    const channelName = `rt:${table}:${activeMess.id}${channelSuffix}`;

    const channel = supabase.channel(channelName);

    events.forEach((event) => {
      channel.on(
        "postgres_changes" as Parameters<typeof channel.on>[0],
        {
          event,
          schema: "public",
          table,
          filter: `mess_id=eq.${activeMess.id}`,
        },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMess?.id, table, channelSuffix, enabled]);
}

export function useRealtimeManagerChange(queryKeys: readonly unknown[][]) {
  const queryClient = useQueryClient();
  const { activeMess } = useMessStore();

  useEffect(() => {
    if (!activeMess?.id) return;

    const supabase = getRequiredClient();
    const channelName = `rt:manager_history:${activeMess.id}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel: any = supabase.channel(channelName);
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "manager_history",
          filter: `mess_id=eq.${activeMess.id}`,
        },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key as unknown[] });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMess?.id]);
}

export function useRealtimeNotifications(queryKeys: readonly unknown[][], userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = getRequiredClient();
    const channelName = `rt:notifications:${userId}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel: any = supabase.channel(channelName);
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key as unknown[] });
          });
          // Show browser notification if permission granted and document is not focused
          const newRow = payload?.new;
          if (newRow?.title && newRow?.body) {
            if (typeof document !== "undefined" && !document.hasFocus()) {
              showBrowserNotification(newRow.title, newRow.body, newRow.action_url ?? undefined);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key as unknown[] });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
