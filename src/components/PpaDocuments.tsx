import { useRef, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { api } from '../api';
import { useStore } from '../store';
import { AppSelect } from './AppSelect';
import { useAttestationCatalog } from '../data/spo';
import { Field, Modal } from './ui';
import { SpoPdfPreview } from './SpoDocuments';

type Cover = { school:string; amendment:boolean; version:string; num:string; cover_date:string; num_add:string; cover_date_add:string; cover_year:string; opt:string; dir:string };
type PrintMode = { school: string; amendment: boolean; title: string };
const documents = [
  { title: 'Распоряжение для комиссий ППА', amendment: false, schoolOnly: false },
  { title: 'Дополнения/изменения к распоряжению для комиссий ППА', amendment: true, schoolOnly: false },
  { title: 'Служебная записка для комиссий ППА', amendment: false, schoolOnly: true },
  { title: 'Служебная записка о дополнениях/изменениях для комиссий ППА', amendment: true, schoolOnly: true },
];
export function PpaDocuments() {
  const {year,notify}=useStore();
  const catalog=useAttestationCatalog();
  const [school,setSchool]=useState('');
  const [editing,setEditing]=useState<PrintMode|null>(null);
  const [preview,setPreview]=useState<PrintMode|null>(null);
  const [cover,setCover]=useState<Cover|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const request=useRef(0);
  async function open(mode:PrintMode) {
    const id=++request.current;setEditing(mode);setCover(null);setError('');
    try {
      const data=await api<Cover>(`/ppa/cover?amendment=${mode.amendment}&school=${encodeURIComponent(mode.school)}`);
      if(id===request.current)setCover({...data,cover_year:`${year}/${Number(year)+1}`});
    }catch(reason){if(id===request.current)setError((reason as Error).message);}
  }
  async function save() {
    if(!cover || busy)return;
    setBusy(true);setError('');
    try{await api('/ppa/cover',cover);setEditing(null);notify('Титульный лист сохранён');}
    catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  const fields: [keyof Cover,string][] = editing?.amendment && editing.school ? [['cover_date_add','Дата документа'],['num_add','Номер документа'],['opt','Изменения / дополнения']] : editing?.amendment ? [
    ['cover_date_add','Дата документа'],['num_add','Номер документа'],['cover_date','Дата исходного распоряжения'],
    ['num','Номер исходного распоряжения'],['opt','Изменения / дополнения'],['dir','Основание'],
  ] : [['cover_date','Дата документа'],['num','Номер документа']];
  return <>
    <label className="document-school">Высшая школа для служебных записок<AppSelect aria-label="Высшая школа для печати ППА" value={school} onChange={e=>setSchool(e.target.value)}><option value="">Все высшие школы</option>{catalog.schools.map(item=><option key={item.id_school} value={item.id_school}>{item.name_school}</option>)}</AppSelect></label>
    <div className="print-actions att-print-actions">{documents.map(document=>{
      const mode: PrintMode = { school: document.schoolOnly ? school : '', amendment: document.amendment, title: document.title };
      const disabled = document.schoolOnly && !school;
      return <section className="att-document" key={document.title}><span className="module-icon"><FileText size={23}/></span><div>
        <h2>{document.title}</h2>
        <p>{document.schoolOnly ? 'Комиссии выбранной высшей школы.' : 'Комиссии всех высших школ.'}</p>
        <div className="button-row"><button className="button secondary" disabled={disabled} onClick={()=>void open(mode)}>Заполнить титульный лист</button>
          <button className="button secondary" disabled={disabled} onClick={()=>setPreview(mode)}><Printer size={15}/>Печать</button></div>
        {disabled && <small className="muted">Выберите высшую школу для подготовки служебной записки.</small>}
      </div></section>;
    })}</div>
    {editing!==null && <Modal wide title={`Титульный лист — ${editing.title}`} onClose={()=>{request.current++;setEditing(null);}} footer={<>
      <button className="button secondary" disabled={busy} onClick={()=>{request.current++;setEditing(null);}}>Отмена</button>
      <button className="button primary" disabled={!cover||busy} form="ppa-cover" type="submit">Сохранить</button></>}>
      {cover ? <form id="ppa-cover" onSubmit={e=>{e.preventDefault();void save();}}><div className="form-grid">
        {fields.map(([key,label])=><Field key={key} label={label} required><input required aria-label={label} type={key.includes('date')?'date':'text'} value={String(cover[key])} onChange={e=>setCover({...cover,[key]:e.target.value})}/></Field>)}
        <Field label="Учебный год"><input readOnly value={cover.cover_year}/></Field>
      </div><p className="info-note">Редактируются реквизиты. Текст унифицированного шаблона сохранён.</p></form> : !error && <p>Загрузка титульного листа…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>}
    {preview!==null && <SpoPdfPreview kind="ppa" school={preview.school} amendment={preview.amendment} onClose={()=>setPreview(null)}/>}
  </>;
}
