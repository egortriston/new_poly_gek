import { useStore } from '../store';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown, Layers3, GraduationCap, Database, Server, Archive, BookOpen } from 'lucide-react';
const NAV_STORAGE_KEY = 'polytech-navigation-open-v1';
function savedNavigation(): Record<string, boolean> {
 try { const value=JSON.parse(localStorage.getItem(NAV_STORAGE_KEY) || '{}'); return value && typeof value==='object' && !Array.isArray(value) ? value : {}; }
 catch { return {}; }
}
export function Navigation({ onNavigate }: { onNavigate: () => void }) {
 const { user } = useStore();
 const [open, setOpen] = useState(() => { const saved=savedNavigation(); return { oop:saved.oop??true, attestation:saved.attestation??true, gek:saved.gek??true, data:saved.data??true, people:saved.people??true, structure:saved.structure??true, education:saved.education??true }; });
 const [oopDataOpen,setOopDataOpen]=useState(() => savedNavigation().oopData??true);
 const [attOpen, setAttOpen] = useState<Record<string, boolean>>(() => { const saved=savedNavigation(); return {spo:saved.spo??true, ac:saved.ac??true, ppa:saved.ppa??true}; });
 useEffect(() => { try { localStorage.setItem(NAV_STORAGE_KEY,JSON.stringify({...open,oopData:oopDataOpen,...attOpen})); } catch { /* Storage may be disabled; navigation still works. */ } }, [open,oopDataOpen,attOpen]);
 const link = (to: string, text: string, end = true) => <NavLink to={to} end={end} onClick={onNavigate} className={({ isActive }) => `tree-link ${isActive ? 'active' : ''}`}>{text}</NavLink>;
 return <nav className="navigation-tree" aria-label="Основная навигация">
 
 <div className="tree-heading"><BookOpen size={17}/>{link('/oop','Разработка ООП')}<button aria-label="Подразделы ООП" aria-expanded={open.oop} onClick={() => setOpen(o => ({...o,oop:!o.oop}))}><ChevronDown size={14}/></button></div>
 {open.oop && <div className="tree-branch">{link('/oop/formation','Формирование ООП')}{link('/oop/print','Печать')}<div className="tree-heading">{link('/oop/data','Ввод исходных данных')}<button aria-label="Подразделы исходных данных ООП" aria-expanded={oopDataOpen} onClick={()=>setOopDataOpen(v=>!v)}><ChevronDown size={14}/></button></div>{oopDataOpen&&<div className="tree-branch">{link('/oop/data/programs','Исходные для ООП',false)}{user?.role==='admin'&&<>{link('/oop/data/directions','Исходные для направлений',false)}{link('/oop/data/general','Общие',false)}</>}</div>}{user?.role==='admin'&&link('/oop/status','Проверка статуса ООП')}</div>}
 <div className="tree-heading"><Layers3 size={17}/>{link('/attestation','Аттестационные комиссии')}<button aria-label="Подразделы аттестационных комиссий" aria-expanded={open.attestation} onClick={() => setOpen(o => ({...o,attestation:!o.attestation}))}><ChevronDown size={14}/></button></div>
 {open.attestation && <div className="tree-branch">{[['spo','Комиссии СПО'],['ac','Аттестационные комиссии'],['ppa','Комиссии ППА']].map(([kind,title]) => <div key={kind}><div className="tree-heading">{link('/attestation/' + kind,title)}<button aria-label={'Подразделы: ' + title} aria-expanded={!!attOpen[kind]} onClick={() => setAttOpen(o => ({...o,[kind]:!o[kind]}))}><ChevronDown size={14}/></button></div>{attOpen[kind] && <div className="tree-branch">{link('/attestation/' + kind + '/commissions','Список комиссий')}{link('/attestation/' + kind + '/documents','Формирование и печать')}</div>}</div>)}</div>}
 <div className="tree-heading"><GraduationCap size={17}/>{link('/gek','Комиссии ГЭК')}<button aria-label="Подразделы ГЭК" aria-expanded={open.gek} onClick={() => setOpen(o => ({...o,gek:!o.gek}))}><ChevronDown size={14}/></button></div>
 {open.gek && <div className="tree-branch">{link('/commissions','Формирование комиссий',false)}{link('/gek/documents','Печать документов ГЭК')}</div>}
 <div className="tree-heading"><Database size={17}/>{link('/data','Исходные данные')}<button aria-label="Подразделы исходных данных" aria-expanded={open.data} onClick={() => setOpen(o => ({...o,data:!o.data}))}><ChevronDown size={14}/></button></div>
 {open.data && <div className="tree-branch"><div className="tree-heading">{link('/data/people','Участники ГЭК')}<button aria-label="Таблицы участников ГЭК" aria-expanded={open.people} onClick={() => setOpen(o => ({...o,people:!o.people}))}><ChevronDown size={14}/></button></div>{open.people && <div className="tree-branch">{link('/data/people/external','Внешние члены ГЭК')}{link('/data/people/chairmen','Председатели ГЭК')}{link('/data/people/complex','Председатели комплексных ГЭК')}</div>}<div className="tree-heading">{link('/data/structure','Структура института')}<button aria-label="Таблицы структуры" aria-expanded={open.structure} onClick={()=>setOpen(o=>({...o,structure:!o.structure}))}><ChevronDown size={14}/></button></div>{open.structure&&<div className="tree-branch">{link('/data/catalog/schools','Высшие школы')}{link('/data/catalog/teachers','Преподаватели')}</div>}<div className="tree-heading">{link('/data/education','Учебные справочники')}<button aria-label="Учебные справочники" aria-expanded={open.education} onClick={()=>setOpen(o=>({...o,education:!o.education}))}><ChevronDown size={14}/></button></div>{open.education&&<div className="tree-branch">{user?.role==='admin' && <>{link('/data/catalog/directions','Направления подготовки')}{link('/data/catalog/programs','Образовательные программы')}</>}{link('/data/catalog/disciplines','Дисциплины')}</div>}</div>}
 <div className="tree-heading"><Archive size={17}/>{link('/archive','Архив')}</div>
 {user?.role==='admin'&&<div className="tree-heading"><Server size={17}/>{link('/databases','Управление базами')}</div>}</nav>;
}
