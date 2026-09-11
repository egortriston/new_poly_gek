import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Catalog } from "./catalog";

export type ServerCatalog = Catalog & {
  levels: { id: string; name: string }[];
};
export function useServerData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    const next = await api<T>(path);
    setData(next);
    setError("");
    return next;
  }, [path]);
  useEffect(() => {
    let active = true;
    api<T>(path)
      .then((next) => {
        if (active) setData(next);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [path]);
  return { data, error, reload };
}
