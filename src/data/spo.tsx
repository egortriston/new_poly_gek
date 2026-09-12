import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { api } from '../api';
import { Empty } from '../components/ui';
import { useServerData } from './serverCatalog';
import { readCatalog, type Catalog } from './catalog';
import type { AttestationRecord } from './attestation';

type SpoData = { records: AttestationRecord[]; catalog: Catalog };
type SpoStore = SpoData & {
  busy: boolean;
  save: (record: AttestationRecord) => Promise<AttestationRecord>;
  remove: (record: AttestationRecord) => Promise<void>;
};
const Context = createContext<SpoStore | null>(null);

export function SpoBoundary({ children, kind = 'spo' }: { children: ReactNode; kind?: 'spo' | 'ac' | 'ppa' }) {
  const source = useServerData<SpoData>(`/${kind}/context`);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  async function mutate<T>(path: string, body: unknown): Promise<T> {
    if (lock.current) throw new Error('Дождитесь завершения сохранения.');
    lock.current = true; setBusy(true);
    try {
      const result = await api<T>(path, body);
      try { await source.reload(); setRefreshError(''); }
      catch { setRefreshError('Изменение сохранено. Не удалось обновить список — повторите загрузку.'); }
      return result;
    } finally { lock.current = false; setBusy(false); }
  }
  if (!source.data) return <Empty title={source.error || 'Загрузка комиссий…'} action={source.error ? <button className="button secondary" onClick={() => void source.reload().catch(() => {})}>Повторить</button> : undefined}/>;
  const value: SpoStore = {
    ...source.data, busy,
    save: record => mutate(`/${kind}/save`, { ...record, id: /^\d+$/.test(record.id) ? record.id : null }),
    remove: record => mutate(`/${kind}/delete`, { id: record.id, version: record.version }),
  };
  return <Context.Provider value={value}>{refreshError && <div role="alert" className="form-error">{refreshError}<button className="text-button" onClick={() => void source.reload().then(() => setRefreshError('')).catch(() => {})}>Повторить</button></div>}{children}</Context.Provider>;
}

export const useSpo = () => useContext(Context);
export function useAttestationCatalog() { return useSpo()?.catalog ?? readCatalog(); }
