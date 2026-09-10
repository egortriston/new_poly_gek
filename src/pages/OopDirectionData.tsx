import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Table2, Layers3, BriefcaseBusiness, Boxes, Link2, GraduationCap, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { PageTitle } from '../components/PageTitle';
import { AppSelect } from '../components/AppSelect';
import { Confirm, Empty, Field, Modal } from '../components/ui';
import { readCatalog } from '../data/catalog';
import { oopTables } from '../data/oopForm';
import { useStore } from '../store';

const base = '/oop/data/directions';
const storageKey = 'polytech-oop-direction-data-v1';
export const directionSections = [
  { id: 'areas', title: 'Сферы в областях ПД', description: 'Области профессиональной деятельности и сферы работы выпускников.', icon: Layers3, columns: ['Код области ПД', 'Область ПД', 'Сфера'] },
  { id: 'tasks', title: 'Задачи ПД', description: 'Типы задач и задачи профессиональной деятельности по направлениям.', icon: BriefcaseBusiness, columns: ['Тип задачи ПД', 'Задача профессиональной деятельности'] },
  { id: 'objects', title: 'Объекты ПД', description: 'Объекты и области знания, связанные с типами задач профессиональной деятельности.', icon: Boxes, columns: ['Тип задачи ПД', 'Объект или область знания'] },
  { id: 'standards', title: 'Связь проф. стандартов и НП', description: 'Профессиональные стандарты, относящиеся к направлению подготовки.', icon: Link2, columns: ['Код проф. стандарта', 'Название проф. стандарта'] },
  { id: 'pk', title: 'Матрица ПК СУОС', description: 'Профессиональные компетенции и индикаторы достижения для раздела 8.3 ООП.', icon: Table2, columns: oopTables.pk.columns },
  { id: 'opk', title: 'Матрица ОПК', description: 'Общепрофессиональные компетенции и индикаторы их достижения.', icon: GraduationCap, columns: oopTables.opk.columns },
];
type Entry = { id: string; directionId: string; values: string[] };
type Tables = Record<string, Entry[]>;
function readTables(): Tables {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    return Object.fromEntries(directionSections.map(section => [section.id, Array.isArray(saved[section.id]) ? saved[section.id] : []]));
  } catch { return {}; }
}

export function OopDirectionData() {
  const { table } = useParams();
  const section = directionSections.find(item => item.id === table);
  return <div className="page-enter hub-page">
    <Link className="text-button" to={table ? base : '/oop/data'}>{table ? 'Исходные для направлений' : 'Ввод исходных данных'} /</Link>
    <div className="hub-welcome"><PageTitle>{section?.title ?? 'Исходные данные для формирования сведений по направлениям подготовки'}</PageTitle><p>{section?.description ?? 'Профессиональная деятельность, стандарты и компетенции по направлениям подготовки.'}</p></div>
    {!table ? <div className="people-hub-grid two">{directionSections.map(item => <Link className="module-card available" key={item.id} to={`${base}/${item.id}`}>
      <span className="module-icon"><item.icon size={24}/></span><h2>{item.title}</h2><p>{item.description}</p><footer>Открыть таблицу<ArrowUpRight size={17}/></footer>
    </Link>)}</div> : section ? <DirectionTable key={table} section={section}/> : <Empty title="Таблица не найдена"/>}
  </div>;
}

function DirectionTable({ section }: { section: typeof directionSections[number] }) {
  const [data, setData] = useState(readTables);
  const [catalog] = useState(readCatalog);
  const [params, setParams] = useSearchParams();
  const [edit, setEdit] = useState<Entry | null>(null);
  const [fresh, setFresh] = useState(false);
  const [remove, setRemove] = useState<Entry | null>(null);
  const [error, setError] = useState('');
  const { notify } = useStore();
  const filter = params.get('direction') ?? '';
  const query = params.get('q') ?? '';
  const directions = [...catalog.directions].sort((a, b) => a.number_direction.localeCompare(b.number_direction, 'ru', { numeric: true }));
  const directionName = (id: string) => {
    const direction = directions.find(item => item.id_direction === id);
    return direction ? `${direction.number_direction} · ${direction.name_direction}` : 'Направление не найдено';
  };
  const rows = (data[section.id] ?? []).filter(row => (!filter || row.directionId === filter) && `${directionName(row.directionId)} ${row.values.join(' ')}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
  const setFilter = (key: string, value: string) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  }, { replace: true });
  const persist = (rows: Entry[]) => {
    // Merge only this table, preserving edits made in other tables.
    const next = { ...readTables(), [section.id]: rows };
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setData(next); return true; }
    catch { setError('Не удалось сохранить сведения в браузере.'); return false; }
  };
  const startEdit = (row?: Entry) => {
    setError(''); setFresh(!row);
    setEdit(row ? structuredClone(row) : { id: crypto.randomUUID(), directionId: filter, values: section.columns.map(() => '') });
  };
  const save = () => {
    if (!edit) return;
    if (!directions.some(direction => direction.id_direction === edit.directionId)) { setError('Выберите направление подготовки.'); return; }
    if (!edit.values.some(value => value.trim())) { setError('Заполните сведения записи.'); return; }
    const current = readTables()[section.id] ?? [];
    if (section.id === 'standards' && current.some(row => row.id !== edit.id && row.directionId === edit.directionId && row.values[0].trim() === edit.values[0].trim())) { setError('Этот проф. стандарт уже связан с направлением.'); return; }
    if (persist(fresh ? [...current, edit] : current.map(row => row.id === edit.id ? edit : row))) { setEdit(null); notify('Запись сохранена'); }
  };

  return <>
    <div className="oop-data-actions"><span className="muted">Сведения относятся к направлению подготовки и могут использоваться несколькими программами.</span><button className="button primary" onClick={() => startEdit()}><Plus size={16}/>Добавить</button></div>
    <div className="people-table-shell">
      <div className="table-toolbar"><div className="search-field"><Search size={17}/><input aria-label="Поиск в таблице" placeholder="Код, направление или сведения" value={query} onChange={e => setFilter('q', e.target.value)}/></div>
        <AppSelect aria-label="Фильтр направления подготовки" value={filter} onChange={e => setFilter('direction', e.target.value)}><option value="">Все направления</option>{directions.map(direction => <option key={direction.id_direction} value={direction.id_direction}>{directionName(direction.id_direction)}</option>)}</AppSelect><span className="muted">Записей: {rows.length}</span>
      </div>
      <div className="people-table-scroll"><table className={`people-table oop-data-table ${section.id === 'pk' ? 'matrix' : ''}`}>
        <thead><tr><th>Код НП</th><th>Наименование НП</th>{section.columns.map(column => <th key={column}>{column}</th>)}<th>Действия</th></tr></thead>
        <tbody>{rows.map(row => { const direction = directions.find(item => item.id_direction === row.directionId); return <tr key={row.id}>
          <td>{direction?.number_direction ?? '—'}</td><td><strong>{direction?.name_direction ?? 'Направление не найдено'}</strong></td>{row.values.map((value, index) => <td key={index}>{value || '—'}</td>)}
          <td><div className="button-row"><button className="icon-button" aria-label={`Изменить запись ${direction?.number_direction ?? ''}`} onClick={() => startEdit(row)}><Pencil size={15}/></button><button className="icon-button" aria-label={`Удалить запись ${direction?.number_direction ?? ''}`} onClick={() => { setError(''); setRemove(row); }}><Trash2 size={15}/></button></div></td>
        </tr>; })}</tbody>
      </table></div>
      {!rows.length && <Empty title="Записи не найдены">{filter || query ? <><p>Измените фильтры или добавьте запись.</p><button className="button secondary" onClick={() => setParams({})}>Сбросить фильтры</button></> : 'Добавьте сведения по направлению подготовки.'}</Empty>}
    </div>

    {edit && <Modal wide title={fresh ? 'Новая запись' : 'Редактирование записи'} onClose={() => setEdit(null)} footer={<><button className="button secondary" onClick={() => setEdit(null)}>Отмена</button><button className="button primary" type="submit" form="direction-data-edit">Сохранить</button></>}>
      <form id="direction-data-edit" onSubmit={e => { e.preventDefault(); save(); }}>
        <Field label="Направление подготовки" required><AppSelect aria-label="Направление подготовки" value={edit.directionId} onChange={e => setEdit({ ...edit, directionId: e.target.value })}><option value="">Выберите направление</option>{directions.map(direction => <option key={direction.id_direction} value={direction.id_direction}>{directionName(direction.id_direction)}</option>)}</AppSelect></Field>
        <div className="form-grid">{section.columns.map((column, index) => <Field key={column} label={column}><textarea aria-label={column} rows={4} value={edit.values[index] ?? ''} onChange={e => setEdit({ ...edit, values: edit.values.map((value, i) => i === index ? e.target.value : value) })}/></Field>)}</div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>}
    {remove && <Confirm title="Удалить запись?" confirmLabel="Удалить" danger onClose={() => setRemove(null)} onConfirm={() => { if (persist((readTables()[section.id] ?? []).filter(row => row.id !== remove.id))) { setRemove(null); notify('Запись удалена'); } }}><p>{directionName(remove.directionId)}</p><p>Запись будет удалена из таблицы «{section.title}».</p>{error && <p role="alert">{error}</p>}</Confirm>}
  </>;
}
