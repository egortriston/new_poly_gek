import { PpaDocuments } from '../components/PpaDocuments';
import { SpoBoundary, useSpo, useAttestationCatalog } from '../data/spo';
import { SpoDocuments } from '../components/SpoDocuments';
import { PageTitle } from '../components/PageTitle';
import { AttestationList } from '../components/AttestationList';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Layers3, Plus, Pencil, Trash2, Search, LockKeyhole, Printer, GraduationCap, ClipboardCheck, ClipboardClock } from 'lucide-react';
import { AppSelect } from '../components/AppSelect';
import { Avatar, Badge, Confirm, Empty, Field, Modal } from '../components/ui';
import { AttestationEditor } from '../components/AttestationEditor';
import { AttestationDocuments } from '../components/AttestationDocuments';
import { readCatalog } from '../data/catalog';
import { isAttestationFilled, attestationTypes, readAttestations, saveAttestations, fixedChairman, type AttestationKind, type AttestationRecord } from '../data/attestation';
import { useStore } from '../store';

export function AttestationHub() {
  return <div className="page-enter hub-page"><div className="hub-welcome"><PageTitle>Формирование аттестационных комиссий</PageTitle><p>Выберите тип комиссии для заполнения состава и подготовки документов.</p></div><div className="people-hub-grid">{Object.entries(attestationTypes).map(([kind, info]) => <Link key={kind} to={`/attestation/${kind}`} className="module-card available"><span className="module-icon">{kind==='spo'?<GraduationCap size={25}/>:kind==='ac'?<ClipboardCheck size={25}/>:<ClipboardClock size={25}/>}</span><h2>{info.title}</h2><p>{info.description}</p><footer>Открыть раздел <ArrowUpRight size={17} /></footer></Link>)}</div><Link to="/data" className="hub-related">Исходные данные · преподаватели, школы, направления и программы <ArrowUpRight size={16} /></Link></div>;
}
export function AttestationPage() {
 const {kind}=useParams();
 return (kind==='spo'||kind==='ac'||kind==='ppa') ? <SpoBoundary key={kind} kind={kind}><AttestationContent/></SpoBoundary> : <AttestationContent/>;
}
function AttestationContent() {
 const server=useSpo();
  const { kind, view } = useParams();
  const [params] = useSearchParams();
  if (!kind || !(kind in attestationTypes)) return <Empty title="Раздел не найден" />;
  if (!view && params.has('tab')) {
    const next = new URLSearchParams(params);
    const target = next.get('tab') === 'documents' ? 'documents' : 'commissions';
    if (target === 'documents') next.delete('tab');
    return <Navigate replace to={'/attestation/' + kind + '/' + target + '?' + next} />;
  }
  if (view) return ['commissions', 'documents'].includes(view) ? <CommissionTable key={kind + view} kind={kind as AttestationKind} view={view} /> : <Empty title="Раздел не найден" />;
  const info = attestationTypes[kind as AttestationKind];
  const count = (server?.records ?? readAttestations()).filter(row => row.kind === kind && !row.amendment).length;
  return <div className="page-enter hub-page">
    <Link className="text-button" to="/attestation">Аттестационные комиссии /</Link>
    <div className="hub-welcome"><span className="eyebrow">ФОРМИРОВАНИЕ КОМИССИЙ</span><PageTitle>{info.title}</PageTitle><p>Подготовьте составы комиссий и сформируйте необходимые документы.</p></div>
<div className="gek-overview"><section><span className="eyebrow">ТЕКУЩАЯ КАМПАНИЯ</span><h2>{count} комиссий <span>в работе</span></h2><p>{kind === 'ppa' ? 'Председатели, члены комиссий, программы и дисциплины.' : 'Составы комиссий, секретари и образовательные программы.'}</p><Link className="button primary" to={'/attestation/' + kind + '/commissions'}>Открыть комиссии <ArrowUpRight size={16}/></Link></section><Layers3 size={110} strokeWidth={.8}/></div>
    <div className="people-hub-grid two att-kind-cards">
      <Link className="module-card available" to={'/attestation/' + kind + '/commissions'}><Layers3 size={25}/><h2>Список комиссий</h2><p>Составы, направления подготовки и образовательные программы.</p><footer>Открыть комиссии <ArrowUpRight size={18}/></footer></Link>
      <Link className="module-card available" to={'/attestation/' + kind + '/documents'}><Printer size={25}/><h2>Формирование и печать</h2><p>{kind === 'ppa' ? 'Распоряжение, изменения и дополнения к нему. Заполнение титульных листов и печать.' : 'Служебные записки, распоряжения и титульные листы.'}</p><footer>Выбрать документ <ArrowUpRight size={18}/></footer></Link>
    </div>
    <Link className="hub-related" to="/data/people"><span>Справочники участников образовательного процесса</span><strong>Перейти к таблицам</strong><ArrowUpRight size={16}/></Link>
  </div>;
}
function CommissionTable({ kind, view }: { kind: AttestationKind; view: string }) {
  const server=useSpo();
  const [localRows, setRows] = useState(()=>server?.records ?? readAttestations());
  const rows=server?.records ?? localRows;
  const [params, setParams] = useSearchParams();
  const [edit, setEdit] = useState<AttestationRecord | null>(null);
  const [remove, setRemove] = useState<AttestationRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [school, setSchool] = useState('');
  const [newSchool, setNewSchool] = useState('');
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const { notify, user } = useStore();
  const c = useAttestationCatalog();
  const amendment = kind === 'ppa' && params.get('tab') === 'amendments';
  const scoped = rows.filter(r => r.kind === kind && r.amendment === amendment);
  function nextNumber(schoolId: string) {
    const value = Math.max(0, ...rows.filter(r => r.kind === kind && (kind !== 'ppa' || r.school === schoolId && r.amendment === amendment)).map(r => Number(r.number) || 0)) + 1;
    return kind === 'ppa' ? String(value) : String(value).padStart(3, '0');
  }
  function persist(next: AttestationRecord[]) { try { saveAttestations(next); setRows(next); return true; } catch { setError('Не удалось сохранить изменения в браузере'); return false; } }
  async function save(record: AttestationRecord): Promise<AttestationRecord | false> {
    if(kind!=='ppa' && user?.role!=='admin' && record.chairman !== (rows.find(r=>r.id===record.id)?.chairman ?? '25011'))throw new Error('Менять председателя может только администратор.');
    if(server) {const saved=await server.save(record);notify('Комиссия сохранена');return saved;}
    if (rows.some(r => r.id !== record.id && r.kind === kind && r.amendment === record.amendment && (kind !== 'ppa' || r.school === record.school) && Number(r.number) === Number(record.number))) return false;
    const next = rows.some(r => r.id === record.id) ? rows.map(r => r.id === record.id ? record : r) : [...rows, record];
    if (!persist(next)) return false;
    notify('Комиссия сохранена'); return record;
  }
  async function create() {
   try {
    if (!c.schools.some(s => s.id_school === newSchool) || !/^\d+$/.test(number.trim())) { setError('Выберите высшую школу и укажите номер цифрами'); return; }
    const record: AttestationRecord = { id: crypto.randomUUID(), kind, number: number.trim(), school: newSchool, amendment, chairman: kind === 'ppa' ? '' : '25011', secretary: '', members: [], directions: [], programs: [], disciplines: [] };
    const saved=await save(record);
    if (!saved) { setError('Не удалось сохранить комиссию. Проверьте уникальность номера.'); return; }
    setCreating(false); setEdit(saved);
    }catch(reason){setError((reason as Error).message);}
  }
  if (edit) return <AttestationEditor record={edit} onSave={save} onClose={() => setEdit(null)} />;
  return <div className="page-enter"><Link to={'/attestation/' + kind} className="text-button">{attestationTypes[kind].title} /</Link><div className="page-heading"><div><div className="heading-eyebrow"><span className="section-mini-icon"><Layers3 size={15}/></span> АТТЕСТАЦИОННЫЕ КОМИССИИ</div><PageTitle>{view === 'documents' ? 'Формирование и печать' : attestationTypes[kind].title}</PageTitle><p>{view === 'documents' ? kind === 'ppa' ? 'Распоряжение и дополнения/изменения к нему по всем высшим школам.' : 'Служебные записки по выбранной школе и распоряжения по всем школам.' : 'Состав, программы и документы — в одном месте.'}</p></div>{view !== 'documents' && <button className="button primary" onClick={() => { setNewSchool(''); setNumber(nextNumber('')); setError(''); setCreating(true); }}><Plus size={17}/> Создать комиссию</button>}</div>
    {view === 'documents' ? <>{kind !== 'ppa' && <label className="document-school">Высшая школа<AppSelect aria-label="Высшая школа" value={school} onChange={e => setSchool(e.target.value)}><option value="">Выберите высшую школу</option>{c.schools.map(s => <option key={s.id_school} value={s.id_school}>{s.name_school}</option>)}</AppSelect></label>}{kind!=='ppa' ? <SpoDocuments kind={kind} school={school}/> : <PpaDocuments/>}</> : <><div className="list-intro"><div className="list-intro-icon"><Layers3 size={23}/></div><div><strong>Формирование составов комиссий</strong><p>Откройте карточку, заполните сведения и сформируйте таблицу комиссий.</p></div></div>{kind === 'ppa' && <div className="att-tabs">{[['commissions','Основные составы'],['amendments','Изменения и дополнения']].map(([value,label]) => <button key={value} className={(amendment ? 'amendments' : 'commissions') === value ? 'active' : ''} onClick={() => setParams(value === 'amendments' ? {tab:value} : {})}>{label}</button>)}</div>}<AttestationList kind={kind} key={String(amendment)} rows={scoped} onOpen={setEdit} onRemove={r => {setError('');setRemove(r);}}/></>}
    {creating && <Modal title={'Новая комиссия · ' + attestationTypes[kind].title} subtitle="Укажите основные сведения. Состав заполняется в карточке комиссии." onClose={() => setCreating(false)} footer={<><button className="button secondary" onClick={() => setCreating(false)}>Отмена</button><button className="button primary" type="submit" form="new-attestation" disabled={server?.busy}>Создать комиссию <ArrowUpRight size={16}/></button></>}><form id="new-attestation" onSubmit={e => {e.preventDefault();create();}}><Field label="Номер комиссии" required><input aria-label="Номер комиссии" required value={number} onChange={e => setNumber(e.target.value)}/></Field><Field label="Высшая школа" required><AppSelect aria-label="Высшая школа" required value={newSchool} onChange={e => {setNewSchool(e.target.value);setNumber(nextNumber(e.target.value));}}><option value="">Выберите высшую школу</option>{c.schools.map(s => <option key={s.id_school} value={s.id_school}>{s.name_school}</option>)}</AppSelect></Field>{error && <p className="form-error" role="alert">{error}</p>}</form></Modal>}
    {remove && <Confirm title="Удалить комиссию?" confirmLabel="Удалить" danger onClose={() => setRemove(null)} onConfirm={async () => { if(server){try{await server.remove(remove);setRemove(null);notify('Комиссия удалена');}catch(reason){setError((reason as Error).message);}return;} if (!remove.special && persist(rows.filter(r => r.id !== remove.id))) {setRemove(null);notify('Комиссия удалена');} }}>Комиссия № {remove.number} и её состав будут удалены. {error}</Confirm>}
  </div>;
}
