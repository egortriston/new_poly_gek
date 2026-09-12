import { GekPdfPreview } from './GekPdfPreview';
import { useState } from 'react';
import { FileText, CheckCircle2, Info, ArrowUpRight } from 'lucide-react';
import { Modal } from './ui';
import { type Commission, completeness } from '../data/model';
import { ChairmanPrint } from './ChairmanPrint';
import { useServerData } from '../data/serverCatalog';
import type { Entry } from '../pages/PeopleTable';
export function DocumentPreview({rows,onClose,mode='table'}:{rows:Commission[];onClose:()=>void;mode?:'table'|'card'}) {
 return mode==='card' ? <CommissionChairmanPrint commission={rows[0]} onClose={onClose}/> : <GekPdfPreview kind="commissions" ids={rows.map(c=>c.id)} onClose={onClose}/>;
}
function CommissionChairmanPrint({commission,onClose}:{commission:Commission;onClose:()=>void}) {
 const category=commission.type==='complex'?'complex':'chairmen';
 const source=useServerData<{items:Entry[]}>(`/people/${category}/list?person=${encodeURIComponent(commission.chairmanId)}`);
 const entry=source.data?.items.find(item=>item.personId===commission.chairmanId);
 return entry ? <ChairmanPrint entry={entry} category={category} onClose={onClose}/> :
  <Modal title="Печать председателя" onClose={onClose}><p>{source.error || (source.data ? 'Карточка председателя не заполнена в исходных данных.' : 'Загрузка карточки…')}</p></Modal>;
}
export function DocumentCards({ commission, dirty, onSave }: { commission: Commission; dirty: boolean; onSave: () => void }) {
 const [preview, setPreview] = useState<'table' | 'card' | null>(null); const checks = completeness(commission);
 return <><div className="section-heading"><div><span className="eyebrow">ФОРМИРОВАНИЕ ДОКУМЕНТОВ</span><h2>Формирование и печать</h2><p>Проверьте заполнение и сформируйте документ из карточки.</p></div></div>{dirty && <div className="info-note"><Info size={18}/><p>Перед формированием документа сохраните изменения.</p><button className="text-button" onClick={onSave}>Сохранить</button></div>}<div className="document-cards">{[['table', 'Состав комиссии', 'Председатель, секретарь, участники и образовательные программы.'], ['card', 'Карточка председателя', 'Образование, степень, звание и профессиональная деятельность.']].map(([mode, title, copy]) => <button className="document-card" key={mode} disabled={dirty} onClick={() => setPreview(mode as 'table' | 'card')}><div className="document-thumbnail"><FileText size={28}/><div/><div/><div/></div><section><h3>{title}</h3><p>{copy}</p><span>Открыть предпросмотр <ArrowUpRight size={15}/></span></section></button>)}</div><div className="readiness-panel"><h3>Проверка заполнения</h3><p>Помогает найти пропуски перед проверкой и утверждением состава.</p>{checks.map((check, i) => <div className={check.done ? 'done' : ''} key={i}><CheckCircle2 size={17}/><span>{check.label}</span><small>{check.done ? 'Заполнено' : 'Нужно дополнить'}</small></div>)}</div>{preview && <DocumentPreview rows={[commission]} mode={preview} onClose={() => setPreview(null)}/>}</>;
}
