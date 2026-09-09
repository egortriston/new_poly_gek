import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { findSections, type SectionDestination } from '../data/sectionSearch';

export function SectionSearch({ onNavigate }: { onNavigate: () => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const navigate = useNavigate();
  const results = findSections(query);

  function choose(item: SectionDestination) {
    setOpen(false);
    setQuery('');
    navigate(item.path);
    onNavigate();
  }

  return (
    <div className="section-search" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <div className="section-search-field">
        <Search size={16} aria-hidden="true" />
        <input
          aria-label="Поиск по разделам"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined}
          placeholder="Найти раздел…"
          value={query}
          onFocus={() => { setOpen(true); setActive(0); }}
          onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
          onKeyDown={event => {
            if (event.key === 'Escape') { setOpen(false); return; }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + Math.max(results.length, 1)) % Math.max(results.length, 1));
            }
            if (event.key === 'Enter' && open && results[active]) {
              event.preventDefault();
              choose(results[active]);
            }
          }}
        />
        {query && <button type="button" aria-label="Очистить поиск" onClick={() => { setQuery(''); setActive(0); }}><X size={14} /></button>}
      </div>
      {open && <div className="section-search-popup">
        <p className="section-search-caption">{query.trim() ? 'Переход к разделу' : 'Быстрый переход'}</p>
        <div id={id} role="listbox" aria-label="Разделы">
          {results.map((item, index) => (
            <button key={item.path} id={`${id}-${index}`} type="button" role="option"
              aria-selected={active === index} className="section-search-result"
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setActive(index)} onClick={() => choose(item)}>
              <span><strong>{item.title}</strong><small>{item.group}</small></span><ArrowUpRight size={14} />
            </button>
          ))}
        </div>
        {!results.length && <p className="section-search-empty" role="status">Раздел не найден. Попробуйте «сотрудники», «печать» или «файлы».</p>}
        <div className="section-search-hint">{query.trim() ? '↑ ↓ выбор · Enter переход · Esc закрыть' : 'Например: директор, сотрудники, печать'}</div>
      </div>}
    </div>
  );
}
