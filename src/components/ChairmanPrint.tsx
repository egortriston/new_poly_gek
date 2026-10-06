import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { api } from "../api";
import type { Entry } from "../pages/PeopleTable";
import { Modal } from "./ui";
import { useStore } from "../store";
import { printYearOptions } from "./PrintYears";
import { AppSelect } from "./AppSelect";

export function ChairmanPrint({ entry, category, onClose }: {
  entry: Entry;
  category: string;
  onClose: () => void;
}) {
  const { year } = useStore();
  const defaultYear = Number(year) + 1;
  const [documentYear, setDocumentYear] = useState(String(defaultYear));
  useEffect(() => setDocumentYear(String(defaultYear)), [defaultYear]);
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setPdfUrl("");
    setError("");
    setLoaded(false);
    const controller = new AbortController();
    let objectUrl = "";
    api<{ pdf: string }>(`/people/${category}/print?` + new URLSearchParams({ id: entry.id, academicYear: `${year}/${defaultYear}`, titleYear: documentYear, signatureYear: documentYear }), undefined, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        const bytes = Uint8Array.from(atob(result.pdf), character => character.charCodeAt(0));
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        setPdfUrl(objectUrl);
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [category, entry.id, year, defaultYear, documentYear]);

  return <Modal title="Обоснование кандидатуры председателя ГЭК" subtitle={entry.person?.name}
    wide onClose={onClose} footer={<>
      <button className="button secondary" onClick={onClose}>Закрыть</button>
      {pdfUrl && <a className="button secondary" href={pdfUrl} download="Обоснование председателя ГЭК.pdf">Скачать PDF</a>}
      <button className="button primary" disabled={!loaded || !pdfUrl} onClick={() => {
        try {
          frame.current?.contentWindow?.focus();
          frame.current?.contentWindow?.print();
        } catch {
          window.open(pdfUrl, "_blank", "noopener,noreferrer");
        }
      }}><Printer size={16} />Печать</button>
    </>}>
    <label className="chairman-print-year">Год документа
      <AppSelect value={documentYear} onChange={event => setDocumentYear(event.target.value)}>
        {printYearOptions(defaultYear).map(option => <option key={option} value={option}>{option}</option>)}
      </AppSelect>
      <small>Указывается в заголовке и подписи.</small>
    </label>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!pdfUrl && !error && <p className="muted" role="status">Подготовка печатной формы…</p>}
    {pdfUrl && <iframe ref={frame} title="Печатная форма председателя ГЭК" className="chairman-print-frame"
      src={pdfUrl} onLoad={() => setLoaded(true)} />}
  </Modal>;
}
