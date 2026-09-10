import requirements from '../data/oopRequirements.json';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Printer, FileText } from 'lucide-react';
import { Modal } from './ui';
import { readCatalog } from '../data/catalog';
import { oopTables, readOopDraft } from '../data/oopForm';
import template from '../data/oopTemplate.json';

export function OopPrint({programId}:{programId:string}) {
 const [preview,setPreview]=useState(false);
 const program=readCatalog().programs.find(p=>p.id_mep===programId)!;
 return <><div className="print-actions"><section><span className="module-icon"><FileText size={24}/></span><div><h2>Основная образовательная программа</h2><p>Титульный лист, общие положения, профессиональная деятельность, компетенции, ресурсное обеспечение, учебный план и календарный график.</p><div className="button-row"><button className="button primary" onClick={()=>setPreview(true)}><FileText size={16}/>Предпросмотр ООП</button><Link className="button secondary" to={'/oop/formation?program='+encodeURIComponent(programId)}>Перейти к заполнению</Link></div></div></section></div><p className="info-note">Печать использует сохранённые сведения выбранной программы.</p>{preview&&<Modal wide title={'ООП · '+program.id_program} subtitle="Предпросмотр на основе сохранённых сведений" onClose={()=>setPreview(false)} footer={<><span className="muted">Версия 1.0</span><button className="button primary" onClick={()=>window.print()}><Printer size={16}/>Печать / PDF</button></>}><div className="print-note">Незаполненные сведения отмечены прочерком. Для сохранения PDF выберите соответствующий принтер в диалоге печати.</div><style>{"@media print { @page { size: A4 portrait; margin: 15mm; } }"}</style><OopPaper programId={programId}/></Modal>}</>;
}
function OopPaper({programId}:{programId:string}) {
 const catalog=readCatalog();const program=catalog.programs.find(p=>p.id_mep===programId)!;const direction=catalog.directions.find(d=>d.id_direction===program.id_direction);const draft=readOopDraft(programId);
 const defaults:Record<string,string>={number_direction:direction?.number_direction??'',name_direction:direction?.name_direction??'',id_program:program.id_program,name_program:program.name_program,chief_program:program.chief_program,level_rp:direction?.id_level==='2'?'магистратуры':direction?.id_level==='3'?'специалитета':'бакалавриата',qualification:direction?.id_level==='2'?'магистр':direction?.id_level==='3'?'специалист':'бакалавр'};
 const v=(key:string)=>draft.values[key]||defaults[key]||'—';
 const date=(key:string)=>{const value=v(key);return /^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('.'):value;};
 const fill=(text:string)=>text.replace(/\{\{([^}]+)\}\}/g,(_,key)=>v(key));
 const prose=(items:string[])=>items.map((p,i)=><p key={i}>{fill(p)}</p>);
 const source=(prefix:string)=>Object.entries(template).find(([key])=>key.startsWith(prefix))?.[1]??[];
 const chapter=(title:string,content:ReactNode)=><section className="oop-print-chapter"><h2>{title}</h2>{content}</section>;
 const matrix=(key:string)=>{const schema=oopTables[key];const rows=draft.tables[key]??[];return <div className={'oop-print-matrix '+(['pk','oop'].includes(key)?'wide-matrix':'')}><h3>{schema.title}</h3>{rows.length?<table className="document-table"><thead><tr>{schema.columns.map(column=><th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id}>{schema.columns.map((_,i)=><td key={i}>{row.values[i]||'—'}</td>)}</tr>)}</tbody></table>:<p>Сведения не заполнены —</p>}</div>;};
 return <article className="document-paper oop-print-paper">
  <section className="oop-print-cover"><div className="oop-print-university"><strong>федеральное государственное автономное образовательное учреждение<br/>высшего образования<br/>«Санкт-Петербургский политехнический университет Петра Великого»</strong></div>
   <div className="oop-print-approvals"><div>УТВЕРЖДЕНА<br/>Решением Ученого совета СПбПУ<br/>от {date('date_approved')}<br/>(протокол № {v('protocol_approved')})</div><div>УТВЕРЖДАЮ<br/>Проректор по образовательной<br/>деятельности _______ Л.В. Панкова<br/>{date('prorector')}</div></div>
   <div className="oop-print-title"><h1>ОСНОВНАЯ ОБРАЗОВАТЕЛЬНАЯ ПРОГРАММА<br/>ВЫСШЕГО ОБРАЗОВАНИЯ</h1><p>по направлению подготовки (специальности)</p>{[[v('number_direction')+' '+v('name_direction'),'код и наименование направления подготовки (специальности)'],[v('id_program')+' '+v('name_program'),'направленность (профиль / специализация)'],[v('qualification'),'квалификация выпускника'],[draft.forms.join(', ')||'—','форма обучения']].map(([value,label])=><div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div>
   <div className="oop-print-signatures">{[['Руководитель образовательной программы по направлению подготовки '+v('number_direction'),v('chief_program')],['Директор ИПМЭиТ','В.Э. Щепинин'],['Руководитель ДООП','Н.Ю. Гращенко'],['Рецензент (работодатель)\n'+v('reviewer'),v('r_phio')]].map(([role,name])=><div key={role}><span>{role}</span><span>____________<small>подпись</small></span><span>{name}<small>инициалы, фамилия</small></span></div>)}</div>
   {(draft.values.date_considered||draft.values.protocol_considered)&&<p>Рассмотрена {date('date_considered')}, протокол № {v('protocol_considered')}</p>}<p className="oop-print-city">Санкт-Петербург — {v('year')}</p>
  </section>
  {chapter('1. ОБЩИЕ ПОЛОЖЕНИЯ',prose(direction?.id_level==='2'?template.generalMaster:template.general))}
  {chapter('2. НОРМАТИВНО-ПРАВОВАЯ БАЗА ДЛЯ РАЗРАБОТКИ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ',<>{prose(source('2.').filter(p=>!p.startsWith('Профессиональные стандарты')))}{matrix('standards')}</>)}
  {chapter('3. ЦЕЛИ, ЗАДАЧИ И НАПРАВЛЕННОСТЬ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ',<p>{v('comp')}</p>)}
  {chapter('4. СРОКИ ОСВОЕНИЯ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ',<>{prose(source('4.'))}{draft.forms.map(form=><p key={form}>{form} форма обучения: {v('period_'+({очная:'o','очно-заочная':'oz',заочная:'z'} as Record<string,string>)[form])}</p>)}</>)}
  {chapter('5. ТРУДОЕМКОСТЬ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ',prose(source('5.')))}
  {chapter('6. ТРЕБОВАНИЯ К УРОВНЮ ПОДГОТОВКИ, НЕОБХОДИМОМУ ДЛЯ ОСВОЕНИЯ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ',draft.values.requirements?<p>{v('requirements')}</p>:<>{prose(requirements)}</>)}
  {chapter('7. ХАРАКТЕРИСТИКА ПРОФЕССИОНАЛЬНОЙ ДЕЯТЕЛЬНОСТИ ВЫПУСКНИКА',<>{matrix('areas')}{matrix('types')}{matrix('tasks')}{matrix('objects')}</>)}
  {chapter('8. РЕЗУЛЬТАТЫ ОСВОЕНИЯ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ',<><p>В результате освоения программы у выпускника должны быть сформированы универсальные, общепрофессиональные и профессиональные компетенции.</p><h3>8.1. Универсальные компетенции</h3>{matrix('uk')}<h3>8.2. Общепрофессиональные компетенции</h3>{matrix('opk')}<h3>8.3. Профессиональные компетенции, устанавливаемые СУОС</h3>{matrix('pk')}{draft.display84&&<><h3>8.4. Профессиональные компетенции, устанавливаемые разработчиком ООП</h3>{matrix('oop')}</>}</>)}
  {chapter('9. ХАРАКТЕРИСТИКА РЕСУРСНОГО ОБЕСПЕЧЕНИЯ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ',<>{['9.1.','9.2.','9.3.','9.4.'].map(prefix=><section key={prefix}><h3>{Object.keys(template).find(k=>k.startsWith(prefix))}</h3>{prose(source(prefix))}</section>)}</>)}
  {(['plan','calendar'] as const).map(key=><div key={key}>{chapter(key==='plan'?'УЧЕБНЫЙ ПЛАН':'КАЛЕНДАРНЫЙ УЧЕБНЫЙ ГРАФИК',<>{prose(source(key==='plan'?'УЧЕБНЫЙ ПЛАН':'КАЛЕНДАРНЫЙ'))}{draft.forms.map(form=><p key={form}>{v(key+'_'+({очная:'o','очно-заочная':'oz',заочная:'z'} as Record<string,string>)[form])} — {form} форма обучения</p>)}</>)}</div>)}
  <div className="document-demo">Версия 1.0</div>
 </article>;
}
