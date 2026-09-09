import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Table2, GraduationCap, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { PageTitle } from '../components/PageTitle';
import { AppSelect } from '../components/AppSelect';
import { Confirm, Empty, Field, Modal } from '../components/ui';
import { readCatalog } from '../data/catalog';
import { oopTables, readOopDraft, writeOopDraft } from '../data/oopForm';
import { useStore } from '../store';

const base = '/oop/data/programs';
const educationForms = ['очная', 'очно-заочная', 'заочная'];
const sections = [
  { id: 'matrix', title: 'Матрица ПК ООП', description: 'Профессиональные компетенции, индикаторы достижения и основания по образовательным программам.', icon: Table2 },
  { id: 'forms', title: 'Выбор форм обучения для образовательной программы', description: 'Связь образовательных программ с очной, очно-заочной и заочной формами обучения.', icon: GraduationCap },
];
type Entry = { programId: string; id: string; values: string[] };

export function OopProgramData() {
  const { table } = useParams();
  const section = sections.find(item => item.id === table);
  return <div className="page-enter hub-page">
    <Link className="text-button" to={table ? base : '/oop/data'}>{table ? 'Сведения по образовательным программам' : 'Ввод исходных данных'} /</Link>
    <div className="hub-welcome">
      <PageTitle>{section?.title ?? 'Исходные данные для формирования сведений по образовательным программам'}</PageTitle>
      <p>{section?.description ?? 'Матрица профессиональных компетенций и формы обучения.'}</p>
    </div>
    {!table ? <div className="people-hub-grid two">{sections.map(item => <Link className="module-card available" key={item.id} to={`${base}/${item.id}`}>
      <span className="module-icon"><item.icon size={24}/></span><h2>{item.title}</h2><p>{item.description}</p><footer>Открыть таблицу<ArrowUpRight size={17}/></footer>
    </Link>)}</div> : section ? <ProgramTable key={table} kind={section.id}/> : <Empty title="Таблица не найдена"/>}
  </div>;
}

function ProgramTable({ kind }: { kind: string }) {
  const matrix = kind === 'matrix';
  const columns = matrix ? oopTables.oop.columns : ['Форма обучения'];
  const [catalog] = useState(readCatalog);
  const [params, setParams] = useSearchParams();
  const [version, setVersion] = useState(0);
  const [edit, setEdit] = useState<Entry | null>(null);
  const [original, setOriginal] = useState<Entry | null>(null);
  const [remove, setRemove] = useState<Entry | null>(null);
  const [error, setError] = useState('');
  const { notify } = useStore();
  const filter = params.get('program') ?? '';
  const query = params.get('q') ?? '';
  const programs = [...catalog.programs].sort((a, b) => a.id_program.localeCompare(b.id_program, 'ru', { numeric: true }));
  const name = (id: string) => { const p = programs.find(item => item.id_mep === id); return p ? `${p.id_program} · ${p.name_program}` : 'Программа не найдена'; };
  const allRows: Entry[] = programs.flatMap(program => {
    const draft = readOopDraft(program.id_mep);
    return matrix ? (draft.tables.oop ?? []).map(row => ({ ...row, programId: program.id_mep })) : draft.forms.map(form => ({ programId: program.id_mep, id: form, values: [form] }));
  });
  const rows = allRows.filter(row => (!filter || row.programId === filter) && `${name(row.programId)} ${row.values.join(' ')}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
  const setFilter = (key: string, value: string) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  }, { replace: true });
  const startEdit = (row: Entry | null) => {
    setError('');
    setOriginal(row);
    setEdit(row ? structuredClone(row) : { programId: filter, id: crypto.randomUUID(), values: columns.map(() => '') });
  };
  const persist = (entry: Entry, deleting = false) => {
    const draft = readOopDraft(entry.programId);
    if (matrix) {
      const stored = draft.tables.oop ?? [];
      draft.tables.oop = deleting ? stored.filter(row => row.id !== entry.id) : original ? stored.map(row => row.id === entry.id ? { id: entry.id, values: entry.values } : row) : [...stored, { id: entry.id, values: entry.values }];
    } else {
      if (!deleting && draft.forms.some(form => form === entry.values[0] && form !== original?.id)) {
        setError('Эта форма обучения уже добавлена к программе.');
        return false;
      }
      draft.forms = deleting ? draft.forms.filter(form => form !== entry.id) : original ? draft.forms.map(form => form === original.id ? entry.values[0] : form) : [...draft.forms, entry.values[0]];
    }
    try {
      writeOopDraft(entry.programId, draft);
      setVersion(value => value + 1);
      notify(deleting ? 'Запись удалена' : 'Запись сохранена');
      return true;
    } catch { setError('Не удалось сохранить сведения в браузере.'); return false; }
  };
  const save = () => {
    if (!edit) return;
    if (!programs.some(program => program.id_mep === edit.programId)) { setError('Выберите образовательную программу.'); return; }
    if (matrix ? !edit.values.some(value => value.trim()) : !educationForms.includes(edit.values[0])) { setError(matrix ? 'Заполните сведения матрицы.' : 'Выберите форму обучения.'); return; }
    if (persist(edit)) setEdit(null);
  };

  return <div data-version={version}>
    <div className="oop-data-actions"><span className="muted">{matrix ? 'Профессиональные компетенции разработчика ООП' : 'Одна программа может иметь несколько форм обучения'}</span><button className="button primary" onClick={() => startEdit(null)}><Plus size={16}/>Добавить</button></div>
    <div className="people-table-shell">
      <div className="table-toolbar">
        <div className="search-field"><Search size={17}/><input aria-label="Поиск в таблице" placeholder="Код, программа или сведения" value={query} onChange={e => setFilter('q', e.target.value)}/></div>
        <AppSelect aria-label="Фильтр образовательной программы" value={filter} onChange={e => setFilter('program', e.target.value)}><option value="">Все программы</option>{programs.map(program => <option key={program.id_mep} value={program.id_mep}>{name(program.id_mep)}</option>)}</AppSelect>
        <span className="muted">Записей: {rows.length}</span>
      </div>
      <div className="people-table-scroll"><table className={`people-table oop-data-table ${matrix ? 'matrix' : ''}`}>
        <thead><tr><th>Код ООП</th><th>Название ООП</th>{columns.map(column => <th key={column}>{column}</th>)}<th>Действия</th></tr></thead>
        <tbody>{rows.map(row => { const program = programs.find(p => p.id_mep === row.programId)!; return <tr key={`${row.programId}-${row.id}`}>
          <td>{program.id_program}</td><td><strong>{program.name_program}</strong></td>{row.values.map((value, index) => <td key={index}>{value || '—'}</td>)}
          <td><div className="button-row"><button className="icon-button" aria-label={`Изменить запись ${program.id_program}`} onClick={() => startEdit(row)}><Pencil size={15}/></button><button className="icon-button" aria-label={`Удалить запись ${program.id_program}`} onClick={() => { setError(''); setRemove(row); }}><Trash2 size={15}/></button></div></td>
        </tr>; })}</tbody>
      </table></div>
      {!rows.length && <Empty title="Записи не найдены">{filter || query ? <><p>Измените условия поиска или добавьте запись.</p><button className="button secondary" onClick={() => setParams({})}>Сбросить фильтры</button></> : 'Нажмите «Добавить», чтобы внести сведения по образовательной программе.'}</Empty>}
    </div>
    <p className="hub-footnote">Изменения сохраняются в демоверсии и используются в формировании и печати ООП. {matrix ? 'Отображение матрицы в печатной форме настраивается в разделе 8.4 формы ООП.' : 'Удаление связи с формой обучения сохраняет ранее введённые сроки и ссылки в карточке ООП.'}</p>
    {edit && <Modal wide title={original ? 'Редактирование записи' : 'Новая запись'} onClose={() => setEdit(null)} footer={<><button className="button secondary" onClick={() => setEdit(null)}>Отмена</button><button type="submit" form="oop-data-edit" className="button primary">Сохранить</button></>}>
      <form id="oop-data-edit" onSubmit={e => { e.preventDefault(); save(); }}>
        <Field label="Образовательная программа" required><AppSelect aria-label="Образовательная программа" value={edit.programId} disabled={!!original} onChange={e => { setEdit({ ...edit, programId: e.target.value }); setError(''); }}><option value="">Выберите программу</option>{programs.map(program => <option key={program.id_mep} value={program.id_mep}>{name(program.id_mep)}</option>)}</AppSelect></Field>
        {matrix ? <div className="form-grid">{columns.map((column, index) => <Field key={column} label={column}><textarea aria-label={column} rows={4} value={edit.values[index] ?? ''} onChange={e => setEdit({ ...edit, values: edit.values.map((value, i) => i === index ? e.target.value : value) })}/></Field>)}</div> : <Field label="Форма обучения" required><AppSelect aria-label="Форма обучения" value={edit.values[0]} onChange={e => { setEdit({ ...edit, values: [e.target.value] }); setError(''); }}><option value="">Выберите форму обучения</option>{educationForms.map(form => <option key={form} value={form}>{form}</option>)}</AppSelect></Field>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>}
    {remove && <Confirm title="Удалить запись?" confirmLabel="Удалить" danger onClose={() => setRemove(null)} onConfirm={() => { if (persist(remove, true)) setRemove(null); }}>
      <p>{name(remove.programId)}</p><p>{matrix ? 'Запись будет удалена из матрицы ПК ООП и больше не попадёт в печать.' : `Форма обучения «${remove.values[0]}» будет исключена из программы.`}</p>{error && <p role="alert">{error}</p>}
    </Confirm>}
  </div>;
}
