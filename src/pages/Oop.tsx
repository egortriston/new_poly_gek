import { PageTitle } from '../components/PageTitle';
import { OopStatus } from '../components/OopStatus';
import { OopPrint } from '../components/OopPrint';
import { OopFormation } from '../components/OopFormation';
import { useEffect, useState } from 'react';
import { BookOpen, Printer, Database, ClipboardCheck, ArrowUpRight } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AppSelect } from '../components/AppSelect';
import { readCatalog } from '../data/catalog';

export const oopSections = [
  { id: 'formation', title: 'Перейти к формированию ООП', heading: 'Формирование ООП', description: 'Формирование сведений по выбранной образовательной программе.', icon: BookOpen, program: true },
  { id: 'print', title: 'Печать', heading: 'Печать ООП', description: 'Печатная форма выбранной образовательной программы.', icon: Printer, program: true },
  { id: 'data', title: 'Ввод исходных данных', heading: 'Ввод исходных данных', description: 'Сведения по направлениям, общие данные и сведения по образовательным программам.', icon: Database, program: false },
  { id: 'status', title: 'Проверка статуса ООП', heading: 'Проверка статуса ООП', description: 'Таблица состояния образовательных программ.', icon: ClipboardCheck, program: false },
];
export function Oop() {
  const { section } = useParams();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(params.get('program') ?? '');
  useEffect(() => setSelected(params.get('program') ?? ''), [params]);
  const programs = readCatalog().programs;
  const program = programs.find(p => p.id_mep === selected);
  const current = oopSections.find(s => s.id === section);
  const selection = <label className="document-school">Образовательная программа<AppSelect aria-label="Образовательная программа" value={program ? selected : ''} onChange={e => {setParams(e.target.value ? {program:e.target.value} : {});}}><option value="">Выберите образовательную программу</option>{programs.map(p => <option key={p.id_mep} value={p.id_mep}>{`${p.id_program} · ${p.name_program}`}</option>)}</AppSelect><small>Выбор используется для формирования и печати ООП.</small></label>;
  return <div className="page-enter hub-page oop-page">
    <Link className="text-button" to={current ? '/oop' + (program ? '?program=' + encodeURIComponent(selected) : '') : '/'}>{current ? 'Разработка и корректировка ООП' : 'Главная'} /</Link>
    <div className="hub-welcome"><PageTitle>{current?.heading ?? 'Разработка и корректировка ООП'}</PageTitle><p>{current?.description ?? 'Формирование образовательных программ, печать, исходные данные и проверка статуса.'}</p></div>
    {current?.program && selection}
    {!current ? <div className="oop-module-grid">{oopSections.map(s => {
      const contents = <><span className="module-icon"><s.icon size={25}/></span><h2>{s.title}</h2><p>{s.description}</p><footer>Открыть раздел<ArrowUpRight size={17}/></footer></>;
      return <Link key={s.id} className="module-card available" to={'/oop/' + s.id + (s.program && program ? '?program=' + encodeURIComponent(selected) : '')}>{contents}</Link>;
    })}</div> : <>
      {current.id === 'formation' && program ? <OopFormation key={program.id_mep} programId={program.id_mep}/> : current.id === 'print' && program ? <OopPrint key={program.id_mep} programId={program.id_mep}/> : current.id === 'status' ? <OopStatus/> : current.id === 'data' ? <div className="people-hub-grid">{['Исходные данные для формирования сведений по направлениям подготовки', 'Общие исходные данные всех образовательных программ', 'Исходные данные для формирования сведений по образовательным программам'].map((title, index) => <Link className="module-card available" key={title} to={["/oop/data/directions", "/oop/data/general", "/oop/data/programs"][index]}><span className="module-icon"><Database size={24}/></span><h2>{title}</h2><p>{index === 0 ? "Профессиональная деятельность, стандарты и матрицы компетенций." : index === 1 ? "Общие справочники и матрица универсальных компетенций." : "Матрица ПК ООП и формы обучения образовательных программ."}</p><footer>Открыть раздел<ArrowUpRight size={17}/></footer></Link>)}</div> : <section className="scope-note"><current.icon size={28}/><h2>{current.program ? program ? program.id_program + ' · ' + program.name_program : 'Выберите образовательную программу' : 'Таблица статусов ООП'}</h2><p>Структура раздела перенесена. {current.id === 'print' ? 'Подключение существующей печатной формы — следующий этап.' : current.id === 'formation' ? 'Перенос формы заполнения — следующий этап.' : 'Перенос таблицы статусов — следующий этап.'}</p></section>}
    </>}
  </div>;
}

