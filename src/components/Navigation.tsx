import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, House, Layers3, GraduationCap, Database, Archive, BookOpen } from 'lucide-react';
export function Navigation({ onNavigate }: { onNavigate: () => void }) {
 const { pathname } = useLocation(); const isGek = pathname.startsWith('/gek') || pathname.startsWith('/commissions'); const isData = pathname.startsWith('/data');
 const [open, setOpen] = useState({ gek: isGek, data: isData, people: pathname.includes('/people') });
 useEffect(() => { setOpen(o => ({ ...o, ...(isGek ? { gek: true } : {}), ...(isData ? { data: true } : {}), ...(pathname.includes('/people') ? { people: true } : {}) })); }, [pathname, isGek, isData]);
 const link = (to: string, text: string, end = true) => <NavLink to={to} end={end} onClick={onNavigate} className={({ isActive }) => `tree-link ${isActive ? 'active' : ''}`}>{text}</NavLink>;
 return <nav className="navigation-tree" aria-label="Основная навигация">
 <div className="tree-heading"><House size={17}/>{link('/','Главная')}</div>
 <div className="tree-heading"><BookOpen size={17}/>{link('/oop','Разработка ООП')}</div>
 <div className="tree-heading"><Layers3 size={17}/>{link('/attestation','Аттестационные комиссии')}</div>
 <div className="tree-heading"><GraduationCap size={17}/>{link('/gek','Комиссии ГЭК')}<button aria-label="Подразделы ГЭК" aria-expanded={open.gek} onClick={() => setOpen(o => ({...o,gek:!o.gek}))}><ChevronDown size={14}/></button></div>
 {open.gek && <div className="tree-branch">{link('/commissions','Список комиссий',false)}{link('/gek/documents','Формирование и печать')}</div>}
 <div className="tree-heading"><Database size={17}/>{link('/data','Исходные данные')}<button aria-label="Подразделы исходных данных" aria-expanded={open.data} onClick={() => setOpen(o => ({...o,data:!o.data}))}><ChevronDown size={14}/></button></div>
 {open.data && <div className="tree-branch"><div className="tree-heading">{link('/data/people','Люди')}<button aria-label="Таблицы людей" aria-expanded={open.people} onClick={() => setOpen(o => ({...o,people:!o.people}))}><ChevronDown size={14}/></button></div>{open.people && <div className="tree-branch">{link('/data/people/external','Внешние члены ГЭК')}{link('/data/people/chairmen','Председатели ГЭК')}{link('/data/people/complex','Председатели комплексных ГЭК')}</div>}</div>}
 <div className="tree-heading"><Archive size={17}/>{link('/archive','Архив')}</div>
 </nav>;
}
