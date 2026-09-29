import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { matchesSearch } from "../utils/search";

export function SchoolMultiSelect({ schools, value, onChange, disabled = false, required = false }: {
  schools: { id: string; name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 300 });
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const filtered = schools.filter(s => matchesSearch(s.name, query));
  const selected = value.map(key => schools.find(s => s.id === key)).filter(s => s !== undefined);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const toggle = (key: string) => {
    if (!disabled) onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key]);
  };
  useEffect(() => {
    if (!open) return;
    const rect = trigger.current!.getBoundingClientRect();
    const width = Math.min(rect.width, window.innerWidth - 24);
    setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: window.innerHeight - rect.bottom >= 220 ? rect.bottom + 6 : Math.max(12, rect.top - 330), width });
    const frame = requestAnimationFrame(() => input.current?.focus());
    const outside = (e: PointerEvent) => {
      if (!popup.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false);
    };
    const reposition = (e: Event) => {
      if (!popup.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
    };
  }, [open]);
  return <div className="school-multiselect">
    <button ref={trigger} type="button" className="app-select" aria-label="Высшие школы" aria-required={required} aria-haspopup="listbox" aria-controls={open ? id : undefined} aria-expanded={open} disabled={disabled} onClick={() => {setOpen(!open);setQuery("");setActive(0);}}>
      <span className="app-select-label">{selected.length ? `Выбрано: ${selected.length}` : "Выберите высшие школы"}</span><ChevronDown className="app-select-arrow" size={15}/>
    </button>
    {selected.length > 0 && <div className="school-selection">{selected.map(s => <div className="school-selection-item" key={s.id}>
      <span>{s.name}</span><button type="button" className="icon-button" aria-label={`Убрать ${s.name}`} disabled={disabled} onClick={() => toggle(s.id)}><X size={14}/></button>
    </div>)}</div>}
    {open && createPortal(<div ref={popup} className="app-select-menu school-multiselect-menu" style={{position:"fixed",...position,zIndex:1000,maxHeight:Math.max(140,window.innerHeight-position.top-12)}}>
      <div className="app-select-search"><input ref={input} role="combobox" aria-label="Поиск высших школ" aria-controls={id} aria-expanded="true" aria-autocomplete="list" aria-activedescendant={filtered[active] ? `${id}-${active}` : undefined} placeholder="Введите название школы…" value={query} onChange={e => {setQuery(e.target.value);setActive(0);}} onKeyDown={e => {
        if(e.key === "Escape") {e.preventDefault();e.stopPropagation();close();}
        if(e.key === "Tab") setOpen(false);
        if(e.key === "Enter") {e.preventDefault();if(filtered[active])toggle(filtered[active].id);}
        if(e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();const next=Math.max(0,Math.min(filtered.length-1,active+(e.key === "ArrowDown"?1:-1)));setActive(next);
          document.getElementById(`${id}-${next}`)?.scrollIntoView({block:"nearest"});
        }
      }}/></div>
      <div id={id} role="listbox" aria-label="Высшие школы" aria-multiselectable="true" className="school-multiselect-list">
        {filtered.map((s,index) => <div key={s.id} id={`${id}-${index}`} role="option" aria-selected={value.includes(s.id)} className={`app-select-option school-multiselect-option ${index===active?'is-active':''}`} onPointerMove={() => setActive(index)} onMouseDown={e => e.preventDefault()} onClick={() => toggle(s.id)}>
          <span className="school-option-check" aria-hidden="true">{value.includes(s.id) && <Check size={13}/>}</span><span>{s.name}</span>
        </div>)}
        {!filtered.length && <div className="app-select-empty">Школы не найдены</div>}
      </div>
      <div className="school-multiselect-footer"><span>Можно выбрать несколько школ</span><button type="button" className="text-button" onClick={close}>Готово</button></div>
    </div>,trigger.current?.closest("dialog") ?? document.body)}
  </div>;
}
