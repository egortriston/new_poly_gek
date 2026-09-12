import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";

export type ListPage<T> = {
  items: T[];
  nextCursor: string | null;
  total: number;
};
export function useDebounced(value: string, delay = 250) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return value === "" ? "" : settled;
}
export function useProgressiveList<T>(
  path: string,
  key: keyof T,
  enabled = true,
) {
  const [state, setState] = useState<{
    path: string;
    items: T[];
    cursor: string | null;
    ready: boolean;
    total: number;
  }>({ path, items: [], cursor: null, ready: false, total: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled);
  const active = useRef(path);
  active.current = path;
  const stateRef = useRef(state);
  stateRef.current = state;
  const request = useRef<AbortController | null>(null);
  const lastReset = useRef(true);
  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!enabled)
        return { items: [], nextCursor: null, total: 0 } as ListPage<T>;
      if (!reset && (request.current || !stateRef.current.cursor)) return null;
      request.current?.abort();
      const controller = new AbortController();
      lastReset.current = reset;
      request.current = controller;
      setLoading(true);
      setError("");
      const cursor = reset ? null : stateRef.current.cursor;
      try {
        const result = await api<ListPage<T>>(
          path +
            (cursor
              ? (path.includes("?") ? "&" : "?") +
                "cursor=" +
                encodeURIComponent(cursor)
              : ""),
          undefined,
          controller.signal,
        );
        if (controller.signal.aborted || active.current !== path) return null;
        setState((previous) => {
          const items =
            reset || previous.path !== path
              ? result.items
              : [...previous.items, ...result.items];
          return {
            path,
            items: Array.from(
              new Map(items.map((item) => [item[key], item])).values(),
            ),
            cursor: result.nextCursor,
            ready: true,
            total: result.total,
          };
        });
        return result;
      } catch (error) {
        if (!controller.signal.aborted && active.current === path) {
          setError((error as Error).message);
          throw error;
        }
        return null;
      } finally {
        if (request.current === controller) {
          request.current = null;
          setLoading(false);
        }
      }
    },
    [path, key, enabled],
  );
  useEffect(() => {
    if (enabled) void fetchPage(true).catch(() => {});
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [fetchPage, enabled]);
  const current = state.path === path;
  return {
    items: current ? state.items : [],
    ready: current && state.ready,
    error,
    loading,
    total: current ? state.total : 0,
    hasMore: current && !!state.cursor,
    reload: useCallback(() => fetchPage(true), [fetchPage]),
    more: useCallback(() => fetchPage(false), [fetchPage]),
    retry: useCallback(() => fetchPage(lastReset.current), [fetchPage]),
  };
}
