import {
  cloneElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type HTMLAttributes,
} from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import "./progressive.css";

export function ProgressiveRows<T>({
  rows,
  rowKey,
  columns,
  renderRow,
  resetKey,
  hasMore,
  loading,
  error,
  onMore,
}: {
  rows: T[];
  rowKey: (row: T) => string;
  columns: number;
  renderRow: (row: T) => ReactElement<HTMLAttributes<HTMLTableRowElement>>;
  resetKey: string;
  hasMore: boolean;
  loading: boolean;
  error: string;
  onMore: () => unknown;
}) {
  const body = useRef<HTMLTableSectionElement>(null);
  const [margin, setMargin] = useState(0);
  useLayoutEffect(() => {
    const update = () =>
      setMargin(
        (body.current?.getBoundingClientRect().top ?? 0) + window.scrollY,
      );
    update();
    const observer = new ResizeObserver(update);
    if (body.current?.closest(".people-table-shell"))
      observer.observe(body.current.closest(".people-table-shell")!);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  useEffect(() => {
    const top =
      (body.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top - 100) });
  }, [resetKey]);
  const virtual = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 100,
    overscan: 6,
    scrollMargin: margin,
    getItemKey: (index) => rowKey(rows[index]),
  });
  const visible = virtual.getVirtualItems();
  const last = visible.at(-1)?.index ?? -1;
  useEffect(() => {
    if (hasMore && !loading && !error && last >= rows.length - 8) onMore();
  }, [last, rows.length, hasMore, loading, error, onMore]);
  const before = (visible[0]?.start ?? margin) - margin;
  const after =
    virtual.getTotalSize() - ((visible.at(-1)?.end ?? margin) - margin);
  return (
    <tbody ref={body}>
      {before > 0 && (
        <tr aria-hidden="true">
          <td
            colSpan={columns}
            style={{ height: before, padding: 0, border: 0 }}
          />
        </tr>
      )}
      {visible.map((item) =>
        cloneElement(renderRow(rows[item.index]), {
          key: item.key,
          "data-index": item.index,
          ref: virtual.measureElement,
        } as HTMLAttributes<HTMLTableRowElement>),
      )}
      {after > 0 && (
        <tr aria-hidden="true">
          <td
            colSpan={columns}
            style={{ height: after, padding: 0, border: 0 }}
          />
        </tr>
      )}
      {(loading || error || hasMore) && (
        <tr>
          <td colSpan={columns} className="list-loading">
            {error ? (
              <>
                <span role="alert">{error}</span>
                <button className="text-button" onClick={() => onMore()}>
                  Повторить загрузку
                </button>
              </>
            ) : loading ? (
              <span role="status">Загрузка…</span>
            ) : (
              <button className="text-button" onClick={() => onMore()}>
                Показать ещё
              </button>
            )}
          </td>
        </tr>
      )}
    </tbody>
  );
}
