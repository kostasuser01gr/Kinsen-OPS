"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

const supabase = createBrowserClient();

/** Subscribe to vehicle status changes and auto-refresh fleet queries */
export function useRealtimeFleet() {
  const utils = trpc.useUtils();

  useEffect(() => {
    const channel = supabase
      .channel("fleet-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Vehicle" },
        () => {
          utils.fleet.list.invalidate();
          utils.fleet.statusSummary.invalidate();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "VehicleStatusEvent" },
        () => {
          utils.fleet.statusSummary.invalidate();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [utils]);
}

/** Subscribe to task changes and auto-refresh task queries */
export function useRealtimeTasks() {
  const utils = trpc.useUtils();

  useEffect(() => {
    const channel = supabase
      .channel("task-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Task" },
        () => {
          utils.task.list.invalidate();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [utils]);
}

/** Subscribe to chat messages for a specific channel */
export function useRealtimeChat(channelId: string | null) {
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`chat-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ChatMessage",
          filter: `channelId=eq.${channelId}`,
        },
        () => {
          utils.chat.getMessages.invalidate({ channelId });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelId, utils]);
}

/** Subscribe to incident changes */
export function useRealtimeIncidents() {
  const utils = trpc.useUtils();

  useEffect(() => {
    const channel = supabase
      .channel("incident-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Incident" },
        () => {
          utils.incident.list.invalidate();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [utils]);
}
