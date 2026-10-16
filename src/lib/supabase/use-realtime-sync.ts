"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Custom React hook that subscribes to Supabase Realtime postgres_changes
 * on one or more tables. Automatically triggers `router.refresh()` to fetch
 * fresh server component data whenever database records change, and optionally
 * invokes a callback for immediate client state updates.
 */
export function useRealtimeTableSync(
  tables: string[],
  options?: {
    filter?: string;
    onEvent?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
    debounceMs?: number;
  }
) {
  const router = useRouter();
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const tablesKey = tables.join(",");
  const filter = options?.filter;

  useEffect(() => {
    if (typeof window === "undefined" || tables.length === 0) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch (e) {
      console.warn("Realtime sync: Supabase client unavailable", e);
      return;
    }

    const channelName = `realtime-sync-${tablesKey}-${Math.random().toString(36).slice(2, 7)}`;
    let channel = supabase.channel(channelName);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerRefresh = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      try {
        optionsRef.current?.onEvent?.(payload);
      } catch (err) {
        console.error("Realtime onEvent handler error:", err);
      }

      const debounceMs = optionsRef.current?.debounceMs ?? 300;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        router.refresh();
      }, debounceMs);
    };

    tables.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          triggerRefresh(payload as RealtimePostgresChangesPayload<Record<string, unknown>>);
        }
      );
    });

    channel.subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey, filter, router]);
}
