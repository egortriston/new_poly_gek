import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { initialCommissions } from "./data/seed";
import {
  readSession,
  signIn,
  signOut,
  api,
  acceptDatabaseSession,
  type DatabaseSession,
  type SessionUser,
} from "./api";
import { clone, type Commission } from "./data/model";
const DATA_KEY = "polytech-gek-demo-v1";
function readData(): Commission[] {
  try {
    const value = JSON.parse(localStorage.getItem(DATA_KEY) ?? "null");
    if (
      value?.version === 1 &&
      Array.isArray(value.commissions) &&
      value.commissions.every(
        (c: Commission) =>
          typeof c.id === "string" &&
          typeof c.number === "string" &&
          c.profile &&
          ["university", "educationName", "qualification"].every(
            (k) => typeof c.profile[k as keyof typeof c.profile] === "string",
          ) &&
          Array.isArray(c.internalIds) &&
          Array.isArray(c.externalIds) &&
          Array.isArray(c.programIds),
      )
    )
      return value.commissions;
  } catch {
    /* A malformed demo cache must not break the interface. */
  }
  return clone(initialCommissions);
}
type Store = {
  commissions: Commission[];
  save: (c: Commission) => boolean;
  remove: (id: string) => boolean;
  authenticated: boolean;
  user: SessionUser | null;
  authLoading: boolean;
  authError: string;
  refreshSession: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  toast: string;
  notify: (message: string) => void;
  year: string;
  databases: DatabaseSession | null;
  switchDatabase: (id: string) => Promise<void>;
  refreshDatabases: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [commissions, setCommissions] = useState(readData);
  const [databases, setDatabases] = useState<DatabaseSession | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const authenticated = !!user;
  const refreshSession = useCallback(async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const session = await readSession();
      setUser(session.user);
      setDatabases(session.databases);
    } catch (error) {
      setAuthError((error as Error).message);
    } finally {
      setAuthLoading(false);
    }
  }, []);
  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  const [toast, setToast] = useState("");
  const year =
    databases?.items
      .find((item) => item.id === databases.selectedId)
      ?.academicYear.split("/")[0] ?? "2026";
  const refreshDatabases = useCallback(async () => {
    const next = await api<DatabaseSession>("/databases/choices");
    setDatabases(next);
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    const refresh = () => void refreshDatabases().catch(() => {});
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [authenticated, refreshDatabases]);
  const switchDatabase = async (id: string) => {
    const next = await api<DatabaseSession>("/databases/switch", { id });
    acceptDatabaseSession(next);
    setDatabases(next);
  };
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const persist = (next: Commission[]) => {
    try {
      localStorage.setItem(
        DATA_KEY,
        JSON.stringify({ version: 1, commissions: next }),
      );
      setCommissions(next);
      return true;
    } catch {
      notify(
        "Не удалось сохранить: хранилище браузера недоступно или заполнено. Данные остались в форме.",
      );
      return false;
    }
  };
  const save = (commission: Commission) => {
    const next = clone({ ...commission, updatedAt: new Date().toISOString() });
    return persist(
      commissions.some((c) => c.id === next.id)
        ? commissions.map((c) => (c.id === next.id ? next : c))
        : [...commissions, next],
    );
  };
  const remove = (id: string) =>
    persist(commissions.filter((c) => c.id !== id));
  const login = async (username: string, password: string) => {
    const session = await signIn(username, password);
    setUser(session.user);
    setDatabases(session.databases);
    setAuthError("");
  };
  const logout = async () => {
    await signOut();
    setUser(null);
  };
  return (
    <Context.Provider
      value={{
        commissions,
        save,
        remove,
        authenticated,
        user,
        authLoading,
        authError,
        refreshSession,
        login,
        logout,
        toast,
        notify,
        year,
        databases,
        switchDatabase,
        refreshDatabases,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Store is missing");
  return value;
}
