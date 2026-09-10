import { AttestationPaper } from './AttestationPaper';
import { useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { Field, Modal } from './ui';
import { useStore } from '../store';
import { readCatalog } from '../data/catalog';
import { attestationTypes, fixedChairman, type AttestationKind, type AttestationRecord } from '../data/attestation';

type Cover = Record<string, string>;
export function AttestationDocuments({ kind, school, rows }: { kind: AttestationKind; school: string; rows: AttestationRecord[] }) {
  const { year, notify } = useStore();
  const [action, setAction] = useState<{ amendment: boolean; memo: boolean; preview: boolean } | null>(null);
  const [cover, setCover] = useState<Cover>({});
  const [error, setError] = useState('');
  const c = readCatalog();
  const key = (amendment: boolean, memo: boolean) => `polytech-att-cover-${kind}-${memo ? school : 'all'}-${amendment}`;
  function open(amendment: boolean, memo: boolean, preview: boolean) {
    let saved: Cover = {};
    try { saved = JSON.parse(localStorage.getItem(key(amendment, memo)) ?? '{}'); } catch { /* Empty cover is editable. */ }
    setCover({ cover_year: `${year}/${Number(year) + 1}`, ...saved }); setError(''); setAction({ amendment, memo, preview });
  }
  const title = (amendment: boolean, memo: boolean) => memo
    ? amendment ? 'Служебная записка о внесении дополнений/изменений в распоряжение' : 'Служебная записка с комиссиями выбранной школы'
    : amendment ? 'Дополнения/изменения к распоряжению' : 'Распоряжение для аттестационных комиссий';
  const documentName = (amendment: boolean, memo: boolean) => memo
    ? amendment ? 'служебной записки о внесении дополнений/изменений' : 'служебной записки для выбранной школы'
    : amendment ? 'дополнения/изменения к распоряжению' : 'распоряжения для аттестационных комиссий';
  const printLabel = (amendment: boolean, memo: boolean) => 'Печать ' + (memo && !amendment ? 'служебной записки с комиссиями выбранной школы' : documentName(amendment, memo));
  const dateKey = kind === 'ppa' && !action?.amendment ? 'cover_date' : 'cover_date_add';
  const numberKey = kind === 'ppa' && !action?.amendment ? 'num' : 'num_add';
  const fields = [[dateKey, 'Дата документа'], [numberKey, 'Номер документа'], ['cover_year', 'Учебный год'], ...(action?.amendment ? [['cover_date', 'Дата исходного распоряжения'], ['num', 'Номер исходного распоряжения'], ['opt', 'Изменения / дополнения'], ...(!action.memo ? [['dir', 'Основание']] : [])] : [])];
  const selected = action ? rows.filter(r => r.kind === kind && r.amendment === action.amendment && (!action.memo || r.school === school)) : [];
  return <>
    <div className="print-actions att-print-actions">{[false, ...(kind === 'ppa' ? [true] : [])].flatMap(amendment => (kind === 'ppa' ? [false] : [true, false]).map(memo => <section className="att-document" key={`${amendment}-${memo}`}><span className="module-icon"><FileText size={23} /></span><div><h2>{title(amendment, memo)}</h2><p>{memo ? 'Комиссии выбранной высшей школы.' : 'Комиссии всех высших школ.'} {amendment ? 'Используется список «Изменения и дополнения».' : 'Используется основной список комиссий.'}</p><div className="button-row"><button className="button secondary" disabled={memo && (!school || school === 'institute')} onClick={() => open(amendment, memo, false)}>Заполнить титульный лист {documentName(amendment, memo)}</button><button className="button secondary" disabled={memo && (!school || school === 'institute')} onClick={() => open(amendment, memo, true)}><Printer size={15} />{printLabel(amendment, memo)}</button></div></div></section>))}</div>
    <p className="info-note">Кнопки печати открывают макет документа для проверки, затем «Печать / PDF» вызывает диалог печати. </p>
    {action && <Modal wide subtitle="Предпросмотр на основе сохранённых сведений" title={title(action.amendment, action.memo)} onClose={() => setAction(null)} footer={<><button className="button secondary" onClick={() => setAction(null)}>Закрыть</button>{action.preview ? <button className="button primary" onClick={() => window.print()}>Печать / PDF</button> : <button className="button primary" onClick={() => { try { localStorage.setItem(key(action.amendment, action.memo), JSON.stringify(cover)); notify('Титульный лист сохранён'); setAction(null); } catch { setError('Не удалось сохранить данные в браузере'); } }}>Сохранить</button>}</>}>
      {action.preview ? <AttestationPaper kind={kind} school={school} rows={selected} cover={cover} memo={action.memo} amendment={action.amendment}/> : <><div className="form-grid">{fields.map(([key, label]) => <Field key={key} label={label}><input aria-label={label} type={key.includes('date') ? 'date' : 'text'} value={cover[key] ?? ''} onChange={e => setCover({ ...cover, [key]: e.target.value })} /></Field>)}</div><p className="info-note">Редактируются только реквизиты. Текст унифицированного шаблона не изменяется.</p>{error && <p role="alert" className="form-error">{error}</p>}</>}
    </Modal>}
  </>;
}
