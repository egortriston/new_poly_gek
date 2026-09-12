import { createContext, useContext, useState, type ReactNode } from 'react';
import { useServerData } from './serverCatalog';
import { api } from '../api';
import { useStore } from '../store';
import type { Commission, Person, Program } from './model';
import { Empty } from '../components/ui';

type GekData = { numberingStart: number; commissions: Commission[]; people: Person[]; programs: Program[]; schools: {id:string;name:string;short:string}[] };
const Context = createContext<ReturnType<typeof useGekState> | null>(null);
function useGekState(data: GekData, reload: () => Promise<GekData>) {
  const store = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const commissions = data.commissions.map(c => ({ ...c, year: store.year }));
  const save = async (commission: Commission): Promise<Commission | null> => {
    if (busy) return null;
    setBusy(true); setError('');
    try {
      const saved = await api<Commission>('/gek/save', { ...commission, id: /^\d+$/.test(commission.id) ? commission.id : null });
      try { const fresh = await reload(); return {...(fresh.commissions.find(c=>c.id===saved.id) ?? saved),year:store.year}; } catch { store.notify('Комиссия сохранена. Обновите список для загрузки изменений.'); }
      return { ...saved, year: store.year };
    } catch (reason) { setError((reason as Error).message); return null; }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (busy) return false;
    setBusy(true); setError('');
    try {
      const c = commissions.find(c => c.id === id);
      await api('/gek/delete', { id, version: c?.version });
      try { await reload(); } catch { store.notify('Комиссия удалена. Обновите список.'); }
      return true;
    } catch (reason) { setError((reason as Error).message); return false; }
    finally { setBusy(false); }
  };
  const updateNumbering = async (start:number) => { await api('/gek/numbering',{academicYear:`${store.year}/${Number(store.year)+1}`,start}); await reload(); };
  return { ...store, ...data, updateNumbering, commissions, save, remove, busy, error,
    schoolName: (id: string) => data.schools.find(s => s.id === id)?.name ?? 'Школа не найдена',
    schoolShort: (id: string) => data.schools.find(s => s.id === id)?.short ?? '—' };
}
function Loaded({data,reload,children}:{data:GekData;reload:()=>Promise<GekData>;children:ReactNode}) {
  const state=useGekState(data,reload);
  return <Context.Provider value={state}>{state.error && <p className="form-error" role="alert">{state.error}</p>}{children}</Context.Provider>;
}
export function GekBoundary({children}:{children:ReactNode}) {
  const {year}=useStore();
  const source=useServerData<GekData>(`/gek/context?academicYear=${year}/${Number(year)+1}`);
  if(!source.data) return <Empty title={source.error || 'Загрузка комиссий ГЭК…'} action={source.error ? <button className="button secondary" onClick={()=>void source.reload().catch(()=>{})}>Повторить</button> : undefined}/>;
  return <Loaded data={source.data} reload={source.reload}>{children}</Loaded>;
}
export function useGek() {
  const value=useContext(Context);
  if(!value) throw new Error('GekBoundary is missing');
  return value;
}

export function normalizedGekId(value:string,school:string) {
 return /^\d{1,6}$/.test(value) && Number(value.slice(-2))>0 && school ? school+value.slice(-2).padStart(2,'0') : '';
}
export function gekIdError(value:string,school:string,commissions:Commission[],id='') {
 const normalized=normalizedGekId(value,school);
 if(!normalized)return 'Укажите высшую школу и ГЭК ID с порядковой частью от 01 до 99.';
 return commissions.some(c=>c.id!==id && c.gekId===normalized) ? 'Такой ГЭК ID уже используется.' : '';
}
