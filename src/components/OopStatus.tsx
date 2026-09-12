import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, ClipboardCheck, Printer } from 'lucide-react';
import { AppSelect } from './AppSelect';
import { Empty } from './ui';
import { type CatalogRow } from '../data/catalog';
import { api } from '../api';
import { ProgressiveRows } from './ProgressiveRows';
import { useDebounced, useProgressiveList } from '../data/useProgressiveList';

export function OopStatus() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const direction = params.get('direction') ?? '';
  const status = params.get('status') ?? '';
  const setFilter = (key: string, value: string) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  };
  const search=useDebounced(query);
  const base=`/oop/status?q=${encodeURIComponent(search)}&direction=${encodeURIComponent(direction)}`;
  const list=useProgressiveList<CatalogRow>(`${base}&status=${encodeURIComponent(status)}`,'id_mep');
  const [meta,setMeta]=useState<{key:string; statuses:{status:string;count:number}[]; directions:CatalogRow[]}>({key:'',statuses:[],directions:[]});
  const [metaError,setMetaError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();setMetaError('');
    api<{statuses:{status:string;count:number}[];directions:CatalogRow[]}>(base,undefined,controller.signal)
      .then(data=>setMeta({...data,key:base})).catch(error=>{if(!controller.signal.aborted)setMetaError(error.message);});
    return ()=>controller.abort();
  },[base]);
  const statuses=meta.key===base?meta.statuses:[];
  const rows=list.items;
  const reset = () => setParams({});

  return <div className="oop-status">
    <div className="list-intro">
      <div className="list-intro-icon"><ClipboardCheck size={23}/></div>
      <div><strong>Контроль состояния образовательных программ</strong><p>Статусы образовательных программ из системы. Раздел доступен только администратору.</p></div>
    </div>
    <div className="people-table-shell">
      <div className="status-tabs oop-status-tabs" aria-label="Фильтр статуса">
        {[['', 'Все программы'], ...statuses.map(item => [item.status, item.status])].map(([value, label]) =>
          <button key={value} className={status === value ? 'active' : ''} aria-pressed={status === value} onClick={() => setFilter('status', value)}>
            {label}<span>{value ? statuses.find(item=>item.status===value)?.count ?? 0 : statuses.reduce((sum,item)=>sum+Number(item.count),0)}</span>
          </button>,
        )}
      </div>
      <div className="table-toolbar">
        <div className="search-field">
          <Search size={17}/>
          <input aria-label="Поиск ООП" placeholder="Код или название ООП" value={query} onChange={e => setFilter('q', e.target.value)}/>
          {query && <button className="icon-button" aria-label="Очистить поиск" onClick={() => setFilter('q', '')}><X size={14}/></button>}
        </div>
        <AppSelect aria-label="Направление подготовки" value={direction} onChange={e => setFilter('direction', e.target.value)}>
          <option value="">Все направления</option>
          {meta.directions.map(item => <option key={item.id_direction} value={item.id_direction}>{`${item.number_direction} · ${item.name_direction}`}</option>)}
        </AppSelect>
        <span className="muted oop-status-count" aria-live="polite">Найдено: {list.total}</span>
      </div>
      <div className="people-table-scroll">
        <table className="people-table oop-status-table">
          <thead><tr><th scope="col">Код ООП</th><th scope="col">Название ООП</th><th scope="col">Статус</th><th scope="col">Действия</th></tr></thead>
          <ProgressiveRows rows={rows} rowKey={row=>row.id_mep} columns={4} resetKey={base+status} hasMore={list.hasMore} loading={list.loading} error={list.error} onMore={()=>void (list.error?list.retry():list.more()).catch(()=>{})} renderRow={program => <tr key={program.id_mep}>
            <td className="oop-status-code">{program.id_program}</td>
            <td><strong>{program.name_program}</strong></td>
            <td><span className={`oop-status-badge ${program.status === 'Утверждён' ? 'approved' : 'draft'}`}><span/>{program.status}</span></td>
            <td><div className="button-row">
              <Link className="text-button" aria-label={`Открыть ООП ${program.id_program}`} to={`/oop/formation?program=${encodeURIComponent(program.id_mep)}`}>Открыть</Link>
              <Link className="icon-button" title="Печать ООП" aria-label={`Печать ООП ${program.id_program}`} to={`/oop/print?program=${encodeURIComponent(program.id_mep)}`}><Printer size={16}/></Link>
            </div></td>
          </tr>}/>
        </table>
      </div>
      {metaError && <p className="form-error" role="alert">{metaError}</p>}
      {list.ready && !list.loading && !list.error && !rows.length && <Empty title="Программы не найдены"><p>Измените запрос или сбросьте фильтры.</p><button className="button secondary" onClick={reset}>Сбросить фильтры</button></Empty>}
    </div>
    <p className="hub-footnote">Статус показан без изменения значений из БД. Если запись отсутствует, указано «Не указан».</p>
  </div>;
}

