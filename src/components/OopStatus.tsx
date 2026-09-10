import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, ClipboardCheck, Printer } from 'lucide-react';
import { AppSelect } from './AppSelect';
import { Empty } from './ui';
import { readCatalog, type CatalogRow } from '../data/catalog';
import { readOopDraft } from '../data/oopForm';

export function OopStatus() {
  const [params, setParams] = useSearchParams();
  const [catalog, setCatalog] = useState(readCatalog);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => {
      setCatalog(readCatalog());
      setRevision(value => value + 1);
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

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
  // Read the same saved draft as the editor; never infer approval from completeness.
  const programs = catalog.programs.map<CatalogRow>(program => ({
    ...program,
    status: readOopDraft(program.id_mep).status || 'Черновик',
  })).sort((a, b) => a.id_program.localeCompare(b.id_program, 'ru', { numeric: true }));
  const statuses = ['Черновик', 'Утверждён', ...new Set(programs.map(p => p.status).filter(s => !['Черновик', 'Утверждён'].includes(s)))];
  const matched = programs.filter(program =>
    (!direction || program.id_direction === direction) &&
    `${program.id_program} ${program.name_program}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')),
  );
  const rows = matched.filter(program => !status || program.status === status);
  const reset = () => setParams({});

  return <div className="oop-status" data-revision={revision}>
    <div className="list-intro">
      <div className="list-intro-icon"><ClipboardCheck size={23}/></div>
      <div><strong>Контроль состояния образовательных программ</strong><p>Для просмотра и изменения сведений откройте ООП. Утверждение выполняется в форме программы.</p></div>
    </div>
    <div className="people-table-shell">
      <div className="status-tabs oop-status-tabs" aria-label="Фильтр статуса">
        {[['', 'Все программы'], ...statuses.map(value => [value, value])].map(([value, label]) =>
          <button key={value} className={status === value ? 'active' : ''} aria-pressed={status === value} onClick={() => setFilter('status', value)}>
            {label}<span>{value ? matched.filter(p => p.status === value).length : matched.length}</span>
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
          {catalog.directions.map(item => <option key={item.id_direction} value={item.id_direction}>{`${item.number_direction} · ${item.name_direction}`}</option>)}
        </AppSelect>
        <span className="muted oop-status-count" aria-live="polite">Найдено: {rows.length}</span>
      </div>
      <div className="people-table-scroll">
        <table className="people-table oop-status-table">
          <thead><tr><th scope="col">Код ООП</th><th scope="col">Название ООП</th><th scope="col">Статус</th><th scope="col">Действия</th></tr></thead>
          <tbody>{rows.map(program => <tr key={program.id_mep}>
            <td className="oop-status-code">{program.id_program}</td>
            <td><strong>{program.name_program}</strong></td>
            <td><span className={`oop-status-badge ${program.status === 'Утверждён' ? 'approved' : 'draft'}`}><span/>{program.status}</span></td>
            <td><div className="button-row">
              <Link className="text-button" aria-label={`Открыть ООП ${program.id_program}`} to={`/oop/formation?program=${encodeURIComponent(program.id_mep)}`}>Открыть</Link>
              <Link className="icon-button" title="Печать ООП" aria-label={`Печать ООП ${program.id_program}`} to={`/oop/print?program=${encodeURIComponent(program.id_mep)}`}><Printer size={16}/></Link>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!rows.length && <Empty title={programs.length ? 'Программы не найдены' : 'Образовательные программы отсутствуют'}>
        {programs.length ? <><p>Измените запрос или сбросьте фильтры.</p><button className="button secondary" onClick={reset}>Сбросить фильтры</button></> : <Link className="text-button" to="/data/catalog/programs">Открыть образовательные программы</Link>}
      </Empty>}
    </div>
    <p className="hub-footnote">Статус отражает утверждение ООП, а не полноту заполнения. Новая программа имеет статус «Черновик».</p>
  </div>;
}

