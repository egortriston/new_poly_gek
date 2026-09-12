import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { api } from '../api';
import { useStore } from '../store';
import { Field, Modal } from './ui';

type Cover = { id: string | null; school: string; version: string; num_add: string; cover_date_add: string; cover_year: string };

export function SpoDocuments({ school, kind='spo' }: { school: string; kind?:'spo'|'ac' }) {
  const { year, notify } = useStore();
  const [target, setTarget] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cover, setCover] = useState<Cover | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current++; }, []);
  async function open(targetSchool: string) {
    const request = ++requestId.current;
    setTarget(targetSchool); setCover(null); setError('');
    try {
      const data = await api<Cover>(`/${kind}/cover?school=` + encodeURIComponent(targetSchool));
      if (request === requestId.current) setCover({ ...data, cover_year: `${year}/${Number(year) + 1}` });
    } catch (reason) { if (request === requestId.current) setError((reason as Error).message); }
  }
  async function save() {
    if (!cover || busy) return;
    setBusy(true); setError('');
    try { await api(`/${kind}/cover`, cover); setTarget(null); notify('Титульный лист сохранён'); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <div className="print-actions att-print-actions">{[true, false].map(memo => {
      const label = memo ? 'служебной записки с комиссиями выбранной школы' : 'распоряжения для аттестационных комиссий';
      return <section className="att-document" key={String(memo)}><span className="module-icon"><FileText size={23}/></span><div>
        <h2>{memo ? 'Служебная записка с комиссиями выбранной школы' : 'Распоряжение для аттестационных комиссий'}</h2>
        <p>{memo ? 'Комиссии выбранной высшей школы.' : 'Комиссии всех высших школ.'}</p>
        <div className="button-row"><button className="button secondary" disabled={memo && !school} onClick={() => void open(memo ? school : '')}>Заполнить титульный лист {label}</button>
          <button className="button secondary" disabled={memo && !school} onClick={() => setPreview(memo ? school : '')}><Printer size={15}/>Печать {label}</button></div>
      </div></section>;
    })}</div>
    {target !== null && <Modal wide title={target ? 'Титульный лист служебной записки' : 'Титульный лист распоряжения'} onClose={() => { requestId.current++; setTarget(null); }} footer={<>
      <button className="button secondary" disabled={busy} onClick={() => setTarget(null)}>Отмена</button><button className="button primary" disabled={!cover || busy} form="spo-cover" type="submit">Сохранить</button></>}>
      {cover ? <form id="spo-cover" onSubmit={event => { event.preventDefault(); void save(); }}><div className="form-grid">
        <Field label="Дата документа" required><input required type="date" value={cover.cover_date_add} onChange={e => setCover({ ...cover, cover_date_add: e.target.value })}/></Field>
        <Field label="Номер документа" required><input required value={cover.num_add} onChange={e => setCover({ ...cover, num_add: e.target.value })}/></Field>
        <Field label="Учебный год" required><input readOnly value={cover.cover_year}/></Field>
      </div><p className="info-note">Редактируются реквизиты документа. Унифицированный текст сохранён.</p></form> : !error && <p>Загрузка титульного листа…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>}
    {preview !== null && <SpoPdfPreview kind={kind} school={preview} onClose={() => setPreview(null)}/>}
  </>;
}

export function SpoPdfPreview({ school = '', ids = [], tableOnly = false, onClose, kind='spo', amendment=false }: { amendment?:boolean; kind?:'spo'|'ac'|'ppa'; school?: string; ids?: string[]; tableOnly?: boolean; onClose: () => void }) {
  const { year } = useStore();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const selection = JSON.stringify(ids);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setUrl(''); setError('');
    api<{ pdf: string }>(`/${kind}/print`, { school, amendment, ids: JSON.parse(selection), tableOnly, academicYear: `${year}/${Number(year) + 1}` }, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], { type: 'application/pdf' }));
        setUrl(objectUrl);
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [kind, school, selection, tableOnly, year, amendment]);
  return <Modal wide title={tableOnly ? `Составы комиссий ${kind==='ppa'?'ППА':kind==='ac'?'АК':'СПО'}` : school ? `Служебная записка · ${kind==='ppa'?'ППА':kind==='ac'?'АК':'СПО'}` : `Распоряжение · ${kind==='ppa'?'ППА':kind==='ac'?'АК':'СПО'}`} onClose={onClose} footer={<>
    <button className="button secondary" onClick={onClose}>Закрыть</button>
    {url && <a className="button secondary" href={url} download={`${kind}.pdf`}><Download size={16}/>Скачать PDF</a>}
    <button className="button primary" disabled={!url} onClick={() => { try { frame.current?.contentWindow?.print(); } catch { window.open(url, '_blank', 'noopener'); } }}><Printer size={16}/>Печать</button>
  </>}>{error ? <p className="form-error" role="alert">{error}</p> : url ? <iframe ref={frame} title="Печатный документ комиссии" src={url} style={{ width: '100%', height: '70vh', border: 0 }}/> : <p role="status">Подготовка документа…</p>}</Modal>;
}
