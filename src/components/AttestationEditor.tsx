import { useStore } from '../store';
import { useAttestationCatalog, useSpo } from '../data/spo';
import { PageTitle } from './PageTitle';
import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { ArrowLeft, Check, Pencil, Plus, UsersRound, BookOpen, X, Building2 } from 'lucide-react';
import { AppSelect } from './AppSelect';
import { Avatar, Breadcrumb, Confirm, Field, Modal } from './ui';
import { readCatalog } from '../data/catalog';
import { fixedChairman, type AttestationRecord } from '../data/attestation';
import { clone } from '../data/model';

type GroupKey = 'members' | 'directions' | 'programs' | 'disciplines';
type Option = { id: string; label: string; description?: string };
function Selection({ title, options, values, onApply, onClose }: { title: string; options: Option[]; values: string[]; onApply: (values: string[]) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(values);
  const [limit,setLimit]=useState(50);
  useEffect(()=>setLimit(50),[query]);
  return <Modal title={title} onClose={onClose} footer={<><span className="muted">Выбрано: {selected.length}</span><button className="button secondary" onClick={onClose}>Отмена</button><button className="button primary" onClick={() => onApply(selected)}>Подтвердить <Check size={16}/></button></>}><div className="search-field"><input aria-label="Поиск в справочнике" placeholder="Поиск по справочнику" value={query} onChange={e => setQuery(e.target.value)}/></div><div className="picker-list" onScroll={e=>{if(e.currentTarget.scrollHeight-e.currentTarget.scrollTop-e.currentTarget.clientHeight<100)setLimit(n=>n+50);}}>{options.filter(o => o.label.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'))).slice(0,limit).map(o => <label className={'picker-option ' + (selected.includes(o.id) ? 'selected' : '')} key={o.id}><input type="checkbox" checked={selected.includes(o.id)} onChange={e => setSelected(e.target.checked ? [...selected, o.id] : selected.filter(id => id !== o.id))}/><span><strong>{o.label}</strong><small>{o.description}</small></span></label>)}</div></Modal>;
}

export function AttestationEditor({ record, onSave, onClose }: { record: AttestationRecord; onSave: (record: AttestationRecord) => boolean | AttestationRecord | Promise<AttestationRecord | false>; onClose: () => void }) {
  const [draft, setDraft] = useState(() => clone(record));
  const baseline = useRef(JSON.stringify(record));
  const dirty = baseline.current !== JSON.stringify(draft);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('members');
  const [picker, setPicker] = useState<GroupKey | null>(null);
  const [role, setRole] = useState<'chairman' | 'secretary' | null>(null);
  const [metadata, setMetadata] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const c = useAttestationCatalog();
  const server=useSpo();
  const [saving,setSaving]=useState(false);
  const {user}=useStore();
  const canEditChairman=user?.role==='admin';
  const ppa = draft.kind === 'ppa';
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => { const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
  function update<K extends keyof AttestationRecord>(key: K, value: AttestationRecord[K]) { setDraft(current => ({ ...current, [key]: value })); }
  async function save() {
    if(saving)return;
    if(!/^\d+$/.test(draft.number.trim())){setError('Укажите номер комиссии цифрами');return;}
    setSaving(true);setError('');
    try {
      const result=await onSave({...draft,number:draft.number.trim()});
      if(!result)throw new Error('Не удалось сохранить запись. Проверьте уникальность номера.');
      const saved=typeof result==='object'?result:draft;
      baseline.current=JSON.stringify(saved);setDraft(clone(saved));
    }catch(reason){setError((reason as Error).message);}finally{setSaving(false);}
  }
  const options: Record<GroupKey, Option[]> = {
    members: c.teachers.filter(t => (t.id_school === draft.school || draft.members.includes(t.id_teacher)) && t.id_teacher !== draft.chairman && (!server || t.id_teacher !== draft.secretary)).map(t => ({ id: t.id_teacher, label: t.name_teacher, description: t.position_teacher })),
    directions: c.directions.map(d => ({ id: d.id_direction, label: d.number_direction + ' · ' + d.name_direction })),
    programs: c.programs.filter(p => !draft.directions.length || draft.directions.includes(p.id_direction) || draft.programs.includes(p.id_mep)).map(p => ({ id: p.id_mep, label: p.id_program + ' · ' + p.name_program })),
    disciplines: c.disciplines.filter(d => d.id_school === draft.school || draft.disciplines.includes(d.id_discipline)).map(d => ({ id: d.id_discipline, label: d.name_discipline })),
  };
  const titles = { members: 'Члены комиссии', directions: 'Направления подготовки', programs: 'Образовательные программы', disciplines: 'Дисциплины' };
  const school = c.schools.find(s => s.id_school === draft.school);
  const personCard = (key: 'chairman' | 'secretary', title: string) => {
    const person = c.teachers.find(t => t.id_teacher === draft[key]);
    const fixed = key === 'chairman' && !ppa && !canEditChairman;
    return <section className="person-role"><div className="person-role-heading"><span>{title}</span>{!fixed && <button className="icon-button" aria-label={'Изменить: ' + title.toLocaleLowerCase('ru')} onClick={() => setRole(key)}><Pencil size={15}/></button>}</div>{person || fixed ? <><Avatar person={person ? { initials: person.name_teacher.split(/\s+/).slice(0, 2).map(n => n[0]).join(''), color: 'sage' } : undefined}/><h3>{person?.name_teacher ?? fixedChairman}</h3><p>{fixed ? 'Фиксированное назначение' : person?.position_teacher}</p><span className="organization"><Building2 size={13}/>{fixed && !server ? 'Фиксированное назначение' : school?.short}</span></> : <button className="assign-person" onClick={() => setRole(key)}><span><Plus size={22}/></span><strong>Назначить {key === 'chairman' ? 'председателя' : 'секретаря'}</strong><small>Выбрать из справочника преподавателей</small></button>}</section>;
  };
  const group = (key: GroupKey) => <section className="member-section"><header><div><h3>{titles[key]}<span>{draft[key].length}</span></h3><p>{key === 'programs' ? 'Программы выбранных направлений подготовки.' : 'Сведения из исходных данных.'}</p></div><button className="button small secondary" onClick={() => setPicker(key)}><Plus size={15}/> Добавить</button></header>{draft[key].length ? <div className="member-list">{draft[key].map(id => { const option = options[key].find(o => o.id === id); return <div className="member-row" key={id}>{key === 'members' ? <Avatar person={{ initials: (option?.label ?? '').split(/\s+/).slice(0, 2).map(s => s[0]).join(''), color: 'sage' }}/> : <span className="program-icon"><BookOpen size={20}/></span>}<div><strong>{option?.label ?? 'Запись недоступна'}</strong><span>{option?.description}</span></div><button className="icon-button" aria-label={'Убрать ' + (option?.label ?? id)} onClick={() => update(key, draft[key].filter(v => v !== id))}><X size={16}/></button></div>; })}</div> : <div className="empty-members"><BookOpen size={20}/><span>Записи ещё не добавлены</span><button className="text-button" onClick={() => setPicker(key)}>Выбрать из справочника</button></div>}</section>;
  return <div className="page-enter detail-page"><Breadcrumb label="Список комиссий" current={'Комиссия № ' + draft.number + (ppa ? ' · ' + (school?.short || 'Школа не указана') : '')} onClick={() => dirty ? setLeaving(true) : onClose()}/><div className="page-heading detail-heading"><div><PageTitle>{ppa ? 'ППА' : draft.kind === 'spo' ? 'СПО' : 'АК'} № {draft.number}{ppa && ' · ' + (school?.short || 'Школа не указана')}</PageTitle><p>{school?.name_school ?? 'Общеинститутская комиссия'}{draft.amendment ? ' · Изменения и дополнения' : ''}</p></div><div className="button-row"><button className="button secondary" onClick={() => setMetadata(true)}><Pencil size={15}/> Сведения</button><button className="button primary" disabled={saving || !dirty} onClick={save}><Check size={17}/> Сохранить</button></div></div>
    <div className="detail-tabs" role="tablist" aria-label="Разделы карточки комиссии">{[['members', 'Состав комиссии'], ['programs', 'Программы'], ...(ppa ? [['disciplines', 'Дисциплины']] : [])].map(([key, title]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{key === 'members' ? <UsersRound size={17}/> : <BookOpen size={17}/>} {title}</button>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}{draft.special && <p className="info-note">{draft.special}</p>}
    <div className="detail-grid"><div className="detail-primary">{tab === 'members' ? <><div className="att-role-grid">{personCard('chairman', 'Председатель')}{!ppa && personCard('secretary', 'Секретарь')}</div>{group('members')}</> : tab === 'programs' ? <>{group('directions')}{group('programs')}</> : group('disciplines')}</div><aside className="att-card-aside"><span className="eyebrow">КАРТОЧКА КОМИССИИ</span><h3>Сведения о составе</h3><p>Члены комиссии <strong>{draft.members.length}</strong></p><p>Направления <strong>{draft.directions.length}</strong></p><p>Программы <strong>{draft.programs.length}</strong></p>{ppa && <p>Дисциплины <strong>{draft.disciplines.length}</strong></p>}<hr/><small>{dirty ? 'Есть несохранённые изменения' : 'Изменения не вносились'}<br/>Документы формируются из сохранённых сведений.</small></aside></div>
    {picker && <Selection title={titles[picker]} options={options[picker]} values={draft[picker]} onApply={ids => { update(picker, ids); setPicker(null); }} onClose={() => setPicker(null)}/>}
    {role && <Modal title={role === 'chairman' ? 'Председатель' : 'Секретарь'} onClose={() => setRole(null)} footer={<button className="button primary" onClick={() => setRole(null)}>Подтвердить <Check size={16}/></button>}><Field label="Преподаватель"><AppSelect aria-label="Преподаватель" value={draft[role]} onChange={e => update(role, e.target.value)}><option value="">Не назначен</option>{c.teachers.filter(t => role === 'chairman' ? t.id_teacher !== draft.secretary && !draft.members.includes(t.id_teacher) : t.id_teacher !== draft.chairman && (!server || !draft.members.includes(t.id_teacher))).map(t => <option key={t.id_teacher} value={t.id_teacher}>{t.name_teacher}</option>)}</AppSelect></Field></Modal>}
    {metadata && <Modal title="Сведения о комиссии" onClose={() => setMetadata(false)} footer={<button className="button primary" onClick={() => setMetadata(false)}>Подтвердить</button>}><Field label="Номер комиссии"><input aria-label="Номер комиссии" value={draft.number} onChange={e => update('number', e.target.value)}/></Field><Field label="Высшая школа"><input readOnly value={school?.name_school ?? 'Общеинститутская комиссия'}/></Field></Modal>}
    {(leaving || blocker.state === 'blocked') && <Confirm title="Изменения ещё не сохранены" confirmLabel="Уйти без сохранения" onClose={() => { setLeaving(false); if (blocker.state === 'blocked') blocker.reset(); }} onConfirm={() => { if (blocker.state === 'blocked') blocker.proceed(); else onClose(); }}>Сохраните карточку или покиньте её без сохранения.</Confirm>}
  </div>;
}
