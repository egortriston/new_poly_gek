import { useEffect, useState } from 'react';
import { ArrowDownUp, ArrowUpRight, ChevronLeft, ChevronRight, FileSpreadsheet, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { AppSelect } from './AppSelect';
import { Avatar, Badge, Empty, Modal } from './ui';
import { AttestationPaper } from './AttestationPaper';
import { readCatalog } from '../data/catalog';
import { fixedChairman, isAttestationFilled, type AttestationRecord, type AttestationKind } from '../data/attestation';
import { useStore } from '../store';

export function AttestationList({ kind, rows, onOpen, onRemove }: { kind: AttestationKind; rows: AttestationRecord[]; onOpen: (r: AttestationRecord) => void; onRemove: (r: AttestationRecord) => void }) {
  const c = readCatalog();
  const {year} = useStore();
  const [query, setQuery] = useState('');
  const [school, setSchool] = useState('');
  const [status, setStatus] = useState('all');
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  useEffect(() => { setPage(1); setSelected([]); }, [query, school, status]);
  const name = (r: AttestationRecord) => (r.kind === 'spo' ? 'СПО' : r.kind === 'ac' ? 'АК' : 'ППА') + ' № ' + r.number;
  const teacher = (id: string) => c.teachers.find(t => t.id_teacher === id);
  const avatar = (id: string) => {
    const t = teacher(id);
    return t ? { initials: t.name_teacher.split(/\s+/).slice(0, 2).map(n => n[0]).join(''), color: 'sage' } : undefined;
  };
  const schoolInfo = (r: AttestationRecord) => c.schools.find(s => s.id_school === r.school);
  const filtered = rows.filter(r => (!school || r.school === (school === 'institute' ? '' : school)) && (status === 'all' || isAttestationFilled(r) === (status === 'ready')) && [r.number, schoolInfo(r)?.name_school, teacher(r.chairman)?.name_teacher, r.kind !== 'ppa' ? fixedChairman : '', r.special, ...c.programs.filter(p => r.programs.includes(p.id_mep)).map(p => p.name_program)].join(' ').toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'))).sort((a, b) => (Number(a.number) - Number(b.number)) * (descending ? -1 : 1));
  const lastPage = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, lastPage);
  const shown = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const chosen = filtered.filter(r => selected.includes(r.id));
  const printRows = chosen.length ? chosen : filtered;
  const toggle = (id: string) => setSelected(ids => ids.includes(id) ? ids.filter(v => v !== id) : [...ids, id]);
  const programLabel = (r: AttestationRecord) => c.programs.find(p => p.id_mep === r.programs[0])?.name_program ?? 'Программа не выбрана';
  const actions = (r: AttestationRecord) => <div className="button-row"><button className="row-open icon-button" aria-label={'Открыть ' + name(r)} onClick={() => onOpen(r)}><ArrowUpRight size={17}/></button><button className="icon-button" disabled={!!r.special} title={r.special ? 'Удаление специальной комиссии недоступно' : 'Удалить комиссию'} aria-label={'Удалить ' + name(r)} onClick={() => onRemove(r)}><Trash2 size={16}/></button></div>;
  return <><div className="list-panel">
    <div className="status-tabs" role="tablist" aria-label="Статус заполнения">{[['all', 'Все комиссии', rows.length], ['draft', 'На заполнении', rows.filter(r => !isAttestationFilled(r)).length], ['ready', 'Заполнены', rows.filter(isAttestationFilled).length]].map(([value, label, count]) => <button key={value} role="tab" aria-selected={status === value} className={status === value ? 'active' : ''} onClick={() => setStatus(String(value))}>{label}<span>{count}</span></button>)}</div>
    <div className="table-toolbar"><div className="search-field"><Search size={17}/><input aria-label="Поиск комиссий" placeholder="Номер, программа или председатель" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button className="icon-button" aria-label="Очистить поиск" onClick={() => setQuery('')}><X size={14}/></button>}</div><div className="school-filter"><SlidersHorizontal size={15}/><AppSelect aria-label="Фильтр высшей школы" value={school} onChange={e => setSchool(e.target.value)}><option value="">Все высшие школы</option>{c.schools.map(s => <option key={s.id_school} value={s.id_school}>{s.short}</option>)}{rows.some(r => r.special) && <option value="institute">Общеинститутские комиссии</option>}</AppSelect></div><button className="button secondary export-button" disabled={!filtered.length} onClick={() => setPreview(true)}><FileSpreadsheet size={16}/><span>{chosen.length ? `Таблица · ${chosen.length} выбрано` : 'Сформировать таблицу'}</span></button></div>
    {!!chosen.length && <div className="selection-bar"><span><strong>{chosen.length}</strong> комиссий выбрано</span><button onClick={() => setSelected([])}>Снять выбор <X size={14}/></button></div>}
    {filtered.length ? <><div className="table-scroll"><table className="commissions-table"><thead><tr><th className="checkbox-cell"><input type="checkbox" aria-label="Выбрать все комиссии на странице" checked={shown.length > 0 && shown.every(r => selected.includes(r.id))} onChange={e => setSelected(e.target.checked ? [...new Set([...selected, ...shown.map(r => r.id)])] : selected.filter(id => !shown.some(r => r.id === id)))}/></th><th><button onClick={() => setDescending(!descending)}>Комиссия <ArrowDownUp size={13}/></button></th><th>Председатель</th>{kind !== 'ppa' && <th>Секретарь</th>}<th>Высшая школа</th><th>Состав</th><th>Действия</th></tr></thead><tbody>{shown.map(r => {
      const chair = teacher(r.chairman); const secretary = teacher(r.secretary);
      const members = [...new Set([r.chairman, r.secretary, ...r.members].filter(Boolean))];
      return <tr key={r.id} className={selected.includes(r.id) ? 'is-selected' : ''}><td className="checkbox-cell"><input type="checkbox" aria-label={'Выбрать ' + name(r)} checked={selected.includes(r.id)} onChange={() => toggle(r.id)}/></td><td><button className="commission-link att-commission-link" onClick={() => onOpen(r)}><strong>{name(r)}{r.special && <span className="type-label">Специальная</span>}</strong><span title={r.special}>{programLabel(r)}{r.programs.length > 1 && <b>+{r.programs.length - 1}</b>}</span></button></td><td>{r.kind !== 'ppa' || chair ? <div className="table-person"><Avatar person={avatar(r.chairman)} small/><span><strong>{chair ? chair.name_teacher.split(' ')[0] + ' ' + chair.name_teacher.split(' ').slice(1).map(n => n[0] + '.').join(' ') : 'Фиксированный председатель'}</strong><small>{chair?.position_teacher ?? 'Назначен для СПО и АК'}</small></span></div> : <button className="missing-link att-commission-link" onClick={() => onOpen(r)}><Plus size={14}/> Назначить</button>}</td>{kind !== 'ppa' && <td>{secretary ? <div className="table-person"><Avatar person={avatar(r.secretary)} small/><span><strong>{secretary.name_teacher.split(' ')[0]} {secretary.name_teacher.split(' ').slice(1).map(n => n[0] + '.').join(' ')}</strong><small>{secretary.position_teacher}</small></span></div> : <button className="missing-link att-commission-link" onClick={() => onOpen(r)}><Plus size={14}/> Назначить</button>}</td>}<td><span className="school-pill" title={schoolInfo(r)?.name_school ?? r.special}>{schoolInfo(r)?.short ?? 'ИПМЭиТ'}</span></td><td><div className="avatar-stack" title={`${members.length} участников`}>{members.slice(0, 3).map(id => <Avatar key={id} person={avatar(id)} small/>)}{members.length > 3 && <span className="avatar-overflow">+{members.length - 3}</span>}</div></td><td>{actions(r)}</td></tr>;
    })}</tbody></table></div><div className="commission-mobile-list">{shown.map(r => <div key={r.id} className="commission-mobile"><div><strong>{name(r)}</strong><Badge ready={isAttestationFilled(r)}/></div><h3>{programLabel(r)}</h3><p>{schoolInfo(r)?.short ?? 'ИПМЭиТ'}</p><footer><span>{teacher(r.chairman)?.name_teacher ?? (r.kind === 'ppa' ? 'Председатель не назначен' : 'Фиксированный председатель')}</span>{actions(r)}</footer></div>)}</div></> : <Empty title="Комиссии не найдены">Измените запрос или фильтры, либо создайте комиссию.</Empty>}
    <footer className="table-footer"><span>{filtered.length ? `${(currentPage - 1) * 8 + 1}–${Math.min(currentPage * 8, filtered.length)} из ${filtered.length}` : '0'} комиссий</span><div><button className="icon-button" aria-label="Предыдущая страница" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></button><span>{currentPage}</span><button className="icon-button" aria-label="Следующая страница" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></button></div></footer>
  </div><div className="list-footnote"><span className="legend-dot"/><span>«Заполнена» — все основные сведения внесены. Это не статус утверждения.</span></div>
  {preview && printRows[0] && <Modal wide title="Составы комиссий" subtitle="Предпросмотр на основе сохранённых сведений" onClose={() => setPreview(false)} footer={<><span className="muted">Версия 1.0</span><button className="button primary" onClick={() => window.print()}>Печать / PDF</button></>}><AttestationPaper tableOnly kind={printRows[0].kind} school="" rows={printRows} cover={{cover_year: `${year}/${Number(year) + 1}`}} memo={false} amendment={printRows[0].amendment}/></Modal>}
  </>;
}
