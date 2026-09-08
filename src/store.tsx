import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { initialCommissions } from './data/seed';
import { clone, type Commission } from './data/model';
const DATA_KEY = 'polytech-gek-demo-v1';
const SESSION_KEY = 'polytech-gek-demo-session';
function readData(): Commission[] {
 try { const value = JSON.parse(localStorage.getItem(DATA_KEY) ?? 'null'); if (value?.version === 1 && Array.isArray(value.commissions) && value.commissions.every((c: Commission) => typeof c.id === 'string' && typeof c.number === 'string' && c.profile && ['university', 'educationName', 'qualification'].every(k => typeof c.profile[k as keyof typeof c.profile] === 'string') && Array.isArray(c.internalIds) && Array.isArray(c.externalIds) && Array.isArray(c.programIds))) return value.commissions; } catch { /* A malformed demo cache must not break the interface. */ }
 return clone(initialCommissions);
}
function readSession() { try { return sessionStorage.getItem(SESSION_KEY) === 'admin'; } catch { return false; } }
type Store = { commissions: Commission[]; save: (c: Commission) => boolean; remove: (id: string) => boolean; authenticated: boolean; login: () => void; logout: () => void; toast: string; notify: (message: string) => void; year: string; setYear: (year: string) => void };
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
 const [commissions, setCommissions] = useState(readData);
 const [authenticated, setAuthenticated] = useState(readSession);
 const [toast, setToast] = useState('');
 const [year, setYear] = useState('2026');
 const notify = useCallback((message: string) => setToast(message), []);
 useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
 const persist = (next: Commission[]) => { try { localStorage.setItem(DATA_KEY, JSON.stringify({ version: 1, commissions: next })); setCommissions(next); return true; } catch { notify('Не удалось сохранить: хранилище браузера недоступно или заполнено. Данные остались в форме.'); return false; } };
 const save = (commission: Commission) => { const next = clone({ ...commission, updatedAt: new Date().toISOString() }); return persist(commissions.some(c => c.id === next.id) ? commissions.map(c => c.id === next.id ? next : c) : [...commissions, next]); };
 const remove = (id: string) => persist(commissions.filter(c => c.id !== id));
 const login = () => { try { sessionStorage.setItem(SESSION_KEY, 'admin'); } catch { /* The session can still work in memory. */ } setAuthenticated(true); };
 const logout = () => { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* No persistent session. */ } setAuthenticated(false); };
 return <Context.Provider value={{ commissions, save, remove, authenticated, login, logout, toast, notify, year, setYear }}>{children}</Context.Provider>;
}
export function useStore() { const value = useContext(Context); if (!value) throw new Error('Store is missing'); return value; }
