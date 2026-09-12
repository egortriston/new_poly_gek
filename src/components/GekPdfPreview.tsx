import { useEffect, useRef, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { api } from '../api';
import { useStore } from '../store';
import { Modal } from './ui';

export type GekDocumentKind = 'commissions' | 'secretaries' | 'chairmen';
export function GekPdfPreview({kind,school='',ids=[],onClose}:{kind:GekDocumentKind;school?:string;ids?:string[];onClose:()=>void}) {
  const {year}=useStore();
  const [url,setUrl]=useState('');
  const [error,setError]=useState('');
  const frame=useRef<HTMLIFrameElement>(null);
  const selection=JSON.stringify(ids);
  const title={commissions:'Состав государственных экзаменационных комиссий',secretaries:'Секретари ГЭК',chairmen:'Состав председателей ГЭК'}[kind];
  useEffect(()=>{
    const controller=new AbortController();
    let objectUrl='';
    setUrl('');setError('');
    api<{pdf:string}>('/gek/print',{kind,school,ids:JSON.parse(selection),academicYear:`${year}/${Number(year)+1}`},controller.signal)
      .then(result=>{
        if(controller.signal.aborted)return;
        objectUrl=URL.createObjectURL(new Blob([Uint8Array.from(atob(result.pdf),c=>c.charCodeAt(0))],{type:'application/pdf'}));
        setUrl(objectUrl);
      }).catch(reason=>{if(!controller.signal.aborted)setError(reason.message);});
    return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[kind,school,selection,year]);
  return <Modal title={title} subtitle="Предпросмотр сохранённых сведений" wide onClose={onClose} footer={<>
    <button className="button secondary" onClick={onClose}>Закрыть</button>
    {url && <a className="button secondary" download={`${title}.pdf`} href={url}><Download size={16}/>Скачать PDF</a>}
    <button className="button primary" disabled={!url} onClick={()=>{
      try {frame.current?.contentWindow?.print();} catch {window.open(url,'_blank','noopener,noreferrer');}
    }}><Printer size={16}/>Печать</button>
  </>}>
    {error ? <p className="form-error" role="alert">{error}</p> : !url ? <p role="status">Подготовка документа…</p> :
      <iframe className="chairman-print-frame" title={title} ref={frame} src={url}/>}
  </Modal>;
}
