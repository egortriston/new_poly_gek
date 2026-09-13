import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function HorizontalTableScroll({children,enabled}:{children:ReactNode;enabled:boolean}) {
  const content=useRef<HTMLDivElement>(null);
  const [overflow,setOverflow]=useState(false);
  const [position,setPosition]=useState(0);
  useLayoutEffect(()=>{
    const element=content.current;
    if(!element)return;
    const update=()=>{
      const max=element.scrollWidth-element.clientWidth;
      setOverflow(max>1);
      setPosition(max>0?element.scrollLeft/max*1000:0);
    };
    const observer=new ResizeObserver(update);
    observer.observe(element);
    if(element.firstElementChild)observer.observe(element.firstElementChild);
    update();return ()=>observer.disconnect();
  },[]);
  const move=(value:number)=>{
    const element=content.current;
    if(element){element.scrollLeft=Math.max(0,Math.min(1000,value))/1000*(element.scrollWidth-element.clientWidth);setPosition(value);}
  };
  return <>
    {enabled&&overflow&&<div className="matrix-scroll-control">
      <button type="button" className="matrix-scroll-arrow" aria-label="Прокрутить таблицу влево" disabled={position<=1} onClick={()=>move(Math.max(0,position-150))}><ChevronLeft size={16}/></button>
      <input type="range" className="matrix-scroll-slider" min={0} max={1000} step={1} value={position} aria-label="Горизонтальная прокрутка таблицы" aria-valuetext={Math.round(position/10)+'%'} onChange={event=>move(Number(event.target.value))}/>
      <button type="button" className="matrix-scroll-arrow" aria-label="Прокрутить таблицу вправо" disabled={position>=999} onClick={()=>move(Math.min(1000,position+150))}><ChevronRight size={16}/></button>
    </div>}
    <div ref={content} className={`people-table-scroll${enabled?' matrix-scroll-content':''}`} tabIndex={enabled?0:undefined} aria-label={enabled?'Таблица — прокрутка влево и вправо':undefined} onScroll={event=>{const element=event.currentTarget;const max=element.scrollWidth-element.clientWidth;setPosition(max>0?element.scrollLeft/max*1000:0);}}>{children}</div>
  </>;
}
