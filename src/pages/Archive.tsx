import { PageTitle } from "../components/PageTitle";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Archive as ArchiveIcon,
  Folder,
  FolderPlus,
  FileText,
  Upload,
  Download,
  Pencil,
  Trash2,
  Search,
  ChevronRight,
  ArrowLeft,
  ArrowDownUp,
  X,
  Check,
} from "lucide-react";
import { Modal, Field, Confirm, Empty } from "../components/ui";
import { api } from "../api";
import { useDebounced, useProgressiveList } from "../data/useProgressiveList";
import { ProgressiveRows } from "../components/ProgressiveRows";
import type {
  ServerArchiveItem as ArchiveItem,
  ArchiveContext,
} from "../data/serverArchive";
import { useStore } from "../store";
const size = (n: number) =>
  n < 1024
    ? `${n} Б`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} КБ`
      : `${(n / 1048576).toFixed(1)} МБ`;
export function Archive() {
  const [params, setParams] = useSearchParams();
  const folder = params.get("folder") ?? "";
  const { notify } = useStore();
  const [context, setContext] = useState<ArchiveContext | null>(null),
    [failure, setFailure] = useState("");
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState<"name" | "date">("name");
  const [edit, setEdit] = useState<ArchiveItem | "new" | null>(null),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  const [deleting, setDeleting] = useState<ArchiveItem | null>(null),
    [uploads, setUploads] = useState<File[] | null>(null);
  const [busy, setBusy] = useState(false),
    [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const settled = useDebounced(query);
  const listPath =
    "/archive/list?" + new URLSearchParams({ folder, q: settled, sort });
  const source = useProgressiveList<ArchiveItem>(listPath, "id");
  useEffect(() => {
    const controller = new AbortController();
    setFailure("");
    setQuery("");
    api<ArchiveContext>(
      "/archive/context?" + new URLSearchParams({ folder }),
      undefined,
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) setContext(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setFailure(error.message);
      });
    return () => controller.abort();
  }, [folder]);
  const current = context?.folder === folder ? context.current : null;
  const parents = context?.folder === folder ? context.parents : [];
  const shown = source.items;
  const go = (id: string | null) => {
    if (!busy) setParams(id ? { folder: id } : {});
  };
  const refresh = async () => {
    setError("");
    setFailure("");
    await source.reload().catch(() => {});
    try {
      setContext(
        await api<ArchiveContext>(
          "/archive/context?" + new URLSearchParams({ folder }),
        ),
      );
    } catch (error) {
      setFailure((error as Error).message);
    }
  };
  const saveName = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(
        "/archive/" + (edit === "new" ? "mkdir" : "rename"),
        edit === "new"
          ? { folder, name: name.trim() }
          : {
              id: (edit as ArchiveItem).id,
              version: (edit as ArchiveItem).version,
              name: name.trim(),
            },
      );
      setEdit(null);
      notify(edit === "new" ? "Папка создана" : "Название изменено");
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async () => {
    if (!uploads || busy) return;
    if (uploads.some((file) => file.size > (context?.maxFileBytes ?? 0))) {
      setError(
        "Максимальный размер одного файла: " + size(context?.maxFileBytes ?? 0),
      );
      return;
    }
    setBusy(true);
    setError("");
    let completed = 0;
    try {
      for (const file of uploads) {
        const form = new FormData();
        form.set("folder", folder);
        form.set("file", file);
        await api("/archive/upload", form);
        completed++;
        setUploads(uploads.slice(completed));
      }
      setUploads(null);
      notify("Добавлено файлов: " + completed);
      await refresh();
    } catch (error) {
      setUploads(uploads.slice(completed));
      await source.reload().catch(() => {});
      setError(
        (completed
          ? "Сохранено файлов: " + completed + ". Остальные не загружены. "
          : "") + (error as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/archive/delete", {
        id: deleting.id,
        version: deleting.version,
      });
      setDeleting(null);
      notify("Удалено из архива");
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const download = async (item: ArchiveItem) => {
    try {
      const response = await fetch(
        "/api/v1/archive/download?id=" + encodeURIComponent(item.id),
        { credentials: "same-origin" },
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result?.error?.message ?? "Не удалось скачать файл.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = item.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      notify((error as Error).message);
    }
  };
  if (failure)
    return (
      <Empty
        title="Архив недоступен"
        action={
          <>
            <button className="button secondary" onClick={() => void refresh()}>
              Повторить
            </button>
            {folder && (
              <button className="button secondary" onClick={() => go(null)}>
                В корень архива
              </button>
            )}
          </>
        }
      >
        {failure}
      </Empty>
    );
  if (!context || context.folder !== folder)
    return (
      <div className="scope-note" role="status">
        Загрузка архива…
      </div>
    );
  return (
    <div className="page-enter hub-page archive-page">
      <div className="page-heading">
        <div>
          <div className="heading-eyebrow">
            <ArchiveIcon size={16} /> ДОКУМЕНТЫ И МАТЕРИАЛЫ
          </div>
          <PageTitle>Архив</PageTitle>
          <p>
            Сохраняйте документы по папкам и находите нужное без лишних
            переходов.
          </p>
        </div>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setEdit("new");
              setName("Новая папка");
              setError("");
            }}
          >
            <FolderPlus size={17} /> Создать папку
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={17} /> Добавить файлы
          </button>
        </div>
      </div>
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        multiple
        aria-label="Выбрать файлы для архива"
        onChange={(e) => {
          setUploads(Array.from(e.target.files ?? []));
          setError("");
          e.target.value = "";
        }}
      />
      <div className="archive-layout">
        <section
          className={`archive-workspace ${dragging ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length && !busy) {
              setUploads(files);
              setError("");
            }
          }}
        >
          <div className="archive-path">
            <button
              aria-label="На уровень выше"
              disabled={!folder}
              onClick={() => go(current?.parent ?? null)}
            >
              <ArrowLeft size={17} />
            </button>
            <nav aria-label="Путь в архиве">
              <button onClick={() => go(null)}>Все файлы</button>
              {parents.map((i) => (
                <span key={i.id}>
                  <ChevronRight size={14} />
                  <button
                    onClick={() => go(i.id)}
                    aria-current={i.id === folder ? "page" : undefined}
                  >
                    {i.name}
                  </button>
                </span>
              ))}
            </nav>
          </div>
          <div className="archive-toolbar">
            <div className="search-field">
              <Search size={17} />
              <input
                aria-label="Поиск в текущей папке"
                placeholder="Поиск в этой папке"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="icon-button"
                  aria-label="Очистить поиск"
                  onClick={() => setQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setSort(sort === "name" ? "date" : "name")}
            >
              <ArrowDownUp size={15} />
              {sort === "name" ? "По названию" : "Сначала новые"}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Обновить
            </button>
          </div>
          <div className="archive-table">
            <div className="archive-table-head">
              <span>Название</span>
              <span>Изменён</span>
              <span>Размер</span>
              <span />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <ProgressiveRows
                rows={shown}
                rowKey={(i) => i.id}
                columns={1}
                resetKey={listPath}
                hasMore={source.hasMore}
                loading={source.loading}
                error={source.error}
                onMore={() =>
                  void (
                    source.error
                      ? source.retry()
                      : source.ready
                        ? source.more()
                        : source.reload()
                  ).catch(() => {})
                }
                renderRow={(i) => (
                  <tr key={i.id}>
                    <td style={{ padding: 0 }}>
                      <article className="archive-row" key={i.id}>
                        <button
                          className="archive-item-name"
                          onClick={() =>
                            i.kind === "folder" ? go(i.id) : download(i)
                          }
                        >
                          <span className={`archive-file-icon ${i.kind}`}>
                            {i.kind === "folder" ? (
                              <Folder size={24} />
                            ) : (
                              <FileText size={23} />
                            )}
                          </span>
                          <span>
                            <strong>{i.name}</strong>
                            <small>
                              {i.kind === "folder"
                                ? "Папка"
                                : i.name.split(".").pop()?.toUpperCase() +
                                  " · файл"}
                            </small>
                          </span>
                        </button>
                        <span className="archive-date">
                          {new Date(i.updated).toLocaleDateString("ru-RU")}
                        </span>
                        <span className="archive-size">
                          {i.kind === "file" ? size(i.size) : "—"}
                        </span>
                        <div className="archive-row-actions">
                          {i.kind === "file" && (
                            <button
                              className="icon-button"
                              aria-label={`Скачать ${i.name}`}
                              title="Скачать"
                              onClick={() => download(i)}
                            >
                              <Download size={16} />
                            </button>
                          )}
                          <button
                            className="icon-button"
                            aria-label={`Переименовать ${i.name}`}
                            title="Переименовать"
                            onClick={() => {
                              setEdit(i);
                              setName(i.name);
                              setError("");
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button archive-delete"
                            aria-label={`Удалить ${i.name}`}
                            title="Удалить"
                            onClick={() => {
                              setDeleting(i);
                              setError("");
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </article>
                    </td>
                  </tr>
                )}
              />
            </table>
          </div>
          {!shown.length && !source.loading && !source.error && (
            <Empty
              title={query ? "Ничего не найдено" : "В этой папке пока пусто"}
            >
              {query
                ? "Попробуйте другое название."
                : "Добавьте файлы или создайте папку для документов."}
            </Empty>
          )}
          <button
            className="archive-drop"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={21} />
            <span>
              <strong>
                {dragging
                  ? "Отпустите файлы здесь"
                  : "Перетащите файлы в эту область"}
              </strong>
              <small>или нажмите, чтобы выбрать на компьютере</small>
            </span>
          </button>
          <footer className="archive-count">
            {source.ready ? `Всего объектов: ${source.total}` : "Загрузка…"}
            <span>{current?.name ?? "Корень архива"}</span>
          </footer>
        </section>
        <aside className="archive-aside">
          <span className="module-icon">
            <Folder size={25} />
          </span>
          <h2>Порядок в документах</h2>
          <p>
            Соберите материалы одной кампании или комиссии в отдельную папку.
          </p>
          <div className="archive-tip">
            <Check size={16} />
            <span>Файлы добавляются в открытую папку.</span>
          </div>
          <div className="archive-tip">
            <Check size={16} />
            <span>
              При совпадении имён добавляется номер — существующий файл
              сохраняется.
            </span>
          </div>
          <div className="archive-tip">
            <Check size={16} />
            <span>
              Папки можно открывать, переименовывать и удалять вместе с
              содержимым.
            </span>
          </div>
        </aside>
      </div>
      {edit && (
        <Modal
          title={edit === "new" ? "Новая папка" : "Переименовать"}
          subtitle={`Расположение: ${current?.name ?? "Все файлы"}`}
          onClose={() => {
            if (!busy) setEdit(null);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setEdit(null)}
              >
                Отмена
              </button>
              <button
                className="button primary"
                disabled={busy}
                form="archive-name"
                type="submit"
              >
                {busy
                  ? "Сохранение…"
                  : edit === "new"
                    ? "Создать папку"
                    : "Сохранить"}
              </button>
            </>
          }
        >
          <form
            id="archive-name"
            onSubmit={(e) => {
              e.preventDefault();
              void saveName();
            }}
          >
            <Field label="Название" error={error}>
              <input
                aria-label="Название"
                autoFocus
                disabled={busy}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                maxLength={180}
                required
              />
            </Field>
          </form>
        </Modal>
      )}
      {uploads && (
        <Modal
          title="Добавить файлы"
          subtitle={`В папку: ${current?.name ?? "Все файлы"}`}
          onClose={() => {
            if (!busy) setUploads(null);
          }}
          footer={
            <>
              <span className="muted">
                {uploads.length} файлов · до {size(context.maxFileBytes)} каждый
              </span>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setUploads(null)}
              >
                Отмена
              </button>
              <button
                className="button primary"
                disabled={busy || !uploads.length}
                onClick={() => void upload()}
              >
                {busy ? "Сохранение…" : "Добавить в архив"}
              </button>
            </>
          }
        >
          <div className="archive-upload-list">
            {uploads.map((f, i) => (
              <div key={i}>
                <FileText size={18} />
                <span>
                  {f.name}
                  <small>{size(f.size)}</small>
                </span>
                <button
                  className="icon-button"
                  aria-label={`Убрать файл ${f.name}`}
                  disabled={busy}
                  onClick={() =>
                    setUploads(uploads.filter((_, index) => index !== i))
                  }
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
      {deleting && (
        <Confirm
          title={`Удалить ${deleting.kind === "folder" ? "папку" : "файл"}?`}
          confirmLabel={busy ? "Удаление…" : "Удалить"}
          danger
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
          onConfirm={() => void remove()}
        >
          «{deleting.name}»
          {deleting.kind === "folder" ? " и всё содержимое" : ""} будут удалены
          из архива. {error}
        </Confirm>
      )}
    </div>
  );
}
