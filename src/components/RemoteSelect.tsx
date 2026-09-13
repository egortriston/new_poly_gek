import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, ChevronDown } from "lucide-react";
import { api } from "../api";
import {
  useDebounced,
  useProgressiveList,
  type ListPage,
} from "../data/useProgressiveList";
type Option = { value: string; label: string };

export function RemoteSelect({
  source,
  endpoint,
  localOptions,
  value,
  onChange,
  placeholder = "Выберите значение",
  required = false,
  disabled = false,
  "aria-label": label,
}: {
  source: string;
  endpoint?: string;
  localOptions?: Option[];
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label": string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const settled = useDebounced(query);
  const [selected, setSelected] = useState<Option | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null),
    scroller = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [position, setPosition] = useState({ left: 0, top: 0, width: 300 });
  const optionPath = endpoint ?? "/options/" + source;
  const optionQuery = (key: string, text: string) =>
    optionPath +
    (optionPath.includes("?") ? "&" : "?") +
    key +
    "=" +
    encodeURIComponent(text);
  const list = useProgressiveList<Option>(
    optionQuery("q", settled),
    "value",
    open && !localOptions,
  );
  const available = localOptions
    ? localOptions.filter((option) =>
        option.label
          .toLocaleLowerCase("ru")
          .includes(settled.trim().toLocaleLowerCase("ru")),
      )
    : list.items;
  const options = required
    ? available
    : [{ value: "", label: placeholder }, ...available];
  const virtual = useVirtualizer({
    count: options.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 56,
    overscan: 5,
    getItemKey: (index) => options[index].value,
  });
  const items = virtual.getVirtualItems();
  const last = items.at(-1)?.index ?? -1;
  useEffect(() => {
    if (
      open &&
      list.hasMore &&
      !list.loading &&
      !list.error &&
      last >= options.length - 5
    )
      void list.more().catch(() => {});
  }, [
    open,
    last,
    options.length,
    list.hasMore,
    list.loading,
    list.error,
    list.more,
  ]);
  useEffect(() => {
    if (localOptions) {
      setSelected(
        localOptions.find((option) => option.value === value) ??
          (value
            ? { value, label: "Ранее выбранная запись (ID " + value + ")" }
            : null),
      );
      return;
    }
    if (!value) {
      setSelected(null);
      return;
    }
    const controller = new AbortController();
    setSelectionError("");
    api<ListPage<Option>>(
      optionQuery("id", value),
      undefined,
      controller.signal,
    )
      .then((page) => {
        if (!controller.signal.aborted)
          setSelected(page.items[0] ?? { value, label: "Значение не найдено" });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setSelectionError("Не удалось загрузить выбранное значение");
      });
    return () => controller.abort();
  }, [source, endpoint, value, localOptions]);
  useEffect(() => {
    if (!open) return;
    const rect = trigger.current!.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 24);
    setPosition({
      left: Math.min(rect.left, window.innerWidth - width - 12),
      top:
        rect.bottom + 330 < window.innerHeight
          ? rect.bottom + 6
          : Math.max(8, rect.top - 330),
      width,
    });
    const timer = setTimeout(() => input.current?.focus(), 0);
    const outside = (event: PointerEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const resize = () => setOpen(false);
    const scroll = (event: Event) => {
      if (event.target === document) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", scroll);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", scroll);
    };
  }, [open]);
  useEffect(() => {
    setActive(0);
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [settled]);
  const choose = (option: Option) => {
    setSelected(option);
    setOpen(false);
    setQuery("");
    onChange({
      target: { value: option.value },
      currentTarget: { value: option.value },
    } as ChangeEvent<HTMLSelectElement>);
    trigger.current?.focus();
  };
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="app-select"
        role="combobox"
        aria-label={label}
        aria-required={required}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          setQuery("");
          setOpen(!open);
        }}
      >
        <span className="app-select-label">
          {value
            ? selected?.value === value
              ? selected.label
              : selectionError || "Загрузка…"
            : placeholder}
        </span>
        <ChevronDown size={15} />
      </button>
      {open &&
        createPortal(
          <div
            ref={popup}
            className="app-select-menu remote-select-menu"
            style={{ position: "fixed", ...position, zIndex: 1000 }}
          >
            <div className="app-select-search">
              <input
                ref={input}
                role="combobox"
                aria-label="Поиск вариантов"
                aria-expanded="true"
                aria-controls={id}
                aria-autocomplete="list"
                aria-activedescendant={
                  options[active] ? id + "-" + active : undefined
                }
                value={query}
                placeholder="Введите для поиска…"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(false);
                    trigger.current?.focus();
                  }
                  if (e.key === "Tab") setOpen(false);
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const next = Math.max(
                      0,
                      Math.min(
                        options.length - 1,
                        active + (e.key === "ArrowDown" ? 1 : -1),
                      ),
                    );
                    setActive(next);
                    virtual.scrollToIndex(next);
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (options[active]) choose(options[active]);
                  }
                }}
              />
            </div>
            <div
              ref={scroller}
              id={id}
              role="listbox"
              aria-label={label}
              style={{
                height: Math.min(240, Math.max(56, options.length * 56)),
                overflowY: "auto",
              }}
            >
              <div
                style={{ height: virtual.getTotalSize(), position: "relative" }}
              >
                {items.map((item) => (
                  <div
                    key={item.key}
                    id={id + "-" + item.index}
                    role="option"
                    aria-selected={value === options[item.index].value}
                    data-index={item.index}
                    ref={virtual.measureElement}
                    className={
                      "app-select-option remote-option" +
                      (active === item.index ? " is-active" : "")
                    }
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: "translateY(" + item.start + "px)",
                    }}
                    onPointerMove={(event) => {
                      if (event.movementX || event.movementY)
                        setActive(item.index);
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(options[item.index])}
                  >
                    {options[item.index].label}
                    {value === options[item.index].value && <Check size={14} />}
                  </div>
                ))}
              </div>
            </div>
            {list.loading ? (
              <div className="app-select-empty" role="status">
                Загрузка…
              </div>
            ) : list.error ? (
              <div className="app-select-empty">
                <span role="alert">{list.error}</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void list.retry().catch(() => {})}
                >
                  Повторить загрузку
                </button>
              </div>
            ) : !available.length ? (
              <div className="app-select-empty">Варианты не найдены</div>
            ) : null}
          </div>,
          trigger.current?.closest("dialog") ?? document.body,
        )}
    </>
  );
}
