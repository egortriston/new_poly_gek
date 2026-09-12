import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useGek } from '../data/gek';
import { AppSelect } from '../components/AppSelect';
import { PageTitle } from '../components/PageTitle';
import { GekPdfPreview, type GekDocumentKind } from '../components/GekPdfPreview';

export function GekDocuments() {
  const {commissions,schools,numberingStart,updateNumbering,year}=useGek();
 const [start,setStart]=useState(String(numberingStart));
 const [numberError,setNumberError]=useState('');
 const [saving,setSaving]=useState(false);
 const printing=useRef(false);
 useEffect(()=>setStart(String(numberingStart)),[numberingStart,year]);
  const [school,setSchool]=useState('');
  const [preview,setPreview]=useState<{kind:GekDocumentKind;school:string}|null>(null);
  async function openPrint(kind:GekDocumentKind, selectedSchool:string) {
    if(printing.current)return;
    const value=Number(start);
    if(!start.trim() || !Number.isInteger(value) || value<1 || value>9999) {
      setNumberError('Введите первый номер ГЭК от 1 до 9999.');
      return;
    }
    printing.current=true;setSaving(true);setNumberError('');
    try {
      if(value!==numberingStart)await updateNumbering(value);
      setPreview({kind,school:selectedSchool});
    }catch(reason){setNumberError((reason as Error).message);}
    finally{printing.current=false;setSaving(false);}
  }
  const hasSelected=commissions.some(c=>c.school===school);
  const documents: {kind:GekDocumentKind;title:string;description:string}[]=[
    {kind:'commissions',title:'Составы ГЭК',description:'Председатели, члены комиссий и образовательные программы.'},
    {kind:'chairmen',title:'Состав председателей ГЭК',description:'Председатели и направления подготовки.'},
    {kind:'secretaries',title:'Секретари ГЭК',description:'Секретари с указанием комиссий и высших школ.'},
  ];
  return <div className="page-enter hub-page">
    <Link className="text-button" to="/gek">Формирование ГЭК /</Link>
    <div className="hub-welcome"><span className="eyebrow">ДОКУМЕНТЫ</span><PageTitle>Формирование и печать</PageTitle><p>Выберите документ и состав высших школ для печати.</p></div>
    <div className="gek-print-settings">
      <label className="gek-numbering">Начать нумерацию ГЭК с<input aria-label="Начать нумерацию ГЭК с" aria-invalid={!!numberError} aria-describedby={numberError?'gek-numbering-error':undefined} disabled={saving} type="number" min="1" max="9999" value={start} onChange={e=>{setStart(e.target.value);setNumberError('');}}/></label>
      <label className="document-school">Высшая школа<AppSelect disabled={saving} value={school} onChange={e=>setSchool(e.target.value)}><option value="">Выберите высшую школу</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</AppSelect></label>
      {numberError && <p id="gek-numbering-error" role="alert" className="form-error">{numberError}</p>}
    </div>
    <div className="print-actions">{documents.map(doc=><section key={doc.kind}>
      <span className="module-icon"><Printer size={23}/></span><div><h2>{doc.title}</h2><p>{doc.description}</p>
      <div className="button-row"><button className="button primary" disabled={saving || !school || (doc.kind!=='chairmen'&&!hasSelected)} onClick={()=>void openPrint(doc.kind,school)}>По выбранной школе</button>
      <button className="button secondary" disabled={saving || (doc.kind!=='chairmen'&&!commissions.length)} onClick={()=>void openPrint(doc.kind,'')}>По всем школам</button></div></div>
    </section>)}</div>
    {preview && <GekPdfPreview {...preview} onClose={()=>setPreview(null)}/>}
  </div>;
}
