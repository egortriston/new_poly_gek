import { PageTitle } from "../components/PageTitle";
import { ExternalPersonEditor } from "../components/ExternalPersonEditor";
import { AddPersonEntry } from "../components/AddPersonEntry";
import { api } from "../api";
import { useServerData } from "../data/serverCatalog";
import {
  useProgressiveList,
  useDebounced,
  type ListPage,
} from "../data/useProgressiveList";
import { ProgressiveRows } from "../components/ProgressiveRows";
import type { Person } from "../data/model";
import { AppSelect } from "../components/AppSelect";
import { ChairmanCard } from "../components/ChairmanCard";
import { ChairmanPrint } from "../components/ChairmanPrint";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Search, Plus, Pencil, Trash2, RefreshCw, Printer, Archive } from "lucide-react";

import { Avatar, Empty, Confirm } from "../components/ui";
import { useStore } from "../store";
export type Entry = {
  person?: Person & { missing?: boolean };
  version?: string;
  id: string;
  personId: string;
  sphere: "Образование" | "Бизнес";
  schoolIds: string[];
  values: Record<string, string>;
};
const titles: Record<string, string> = {
  external: "Внешние члены ГЭК",
  chairmen: "Председатели ГЭК",
  complex: "Председатели комплексных ГЭК",
};
export function PeopleTable() {
  const { category = "external" } = useParams();
  const [params, setParams] = useSearchParams();
  const { notify, year } = useStore();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [query, setQuery] = useState("");
  const [sphere, setSphere] = useState("");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [printing, setPrinting] = useState<Entry | null>(null);

  const settled = useDebounced(query);
  const listPath =
    "/people/" +
    category +
    "/list?" +
    new URLSearchParams({ q: settled, sphere });
  const source = useProgressiveList<Entry>(listPath, "id");
  const catalog = useServerData<{
    schools: { id_school: string; name_school: string }[];
  }>("/catalog/context");
  const [busy, setBusy] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const schools = (catalog.data?.schools ?? []).map((s) => ({
    id: s.id_school,
    name: s.name_school,
  }));
  const schoolName = (id: string) =>
    schools.find((s) => s.id === id)?.name ?? "—";
  const reload = async () => {
    setDeleteError("");
    await source.reload().catch(() => {});
    await catalog.reload();
  };
  const add = async (row: Entry) => {
    const result = await api<{ id: string }>("/people/" + category + "/save", {
      ...row,
      id: null,
      academicYear: year+'/'+(Number(year)+1),
    });
    setAdding(false);
    setQuery("");
    setSphere("");
    notify("Запись добавлена");
    try {
      await source.reload();
    } catch (error) {
      setDeleteError(
        "Запись добавлена, но таблицу не удалось обновить. " +
          (error as Error).message,
      );
    }
    setParams({ card: result.id });
  };

  useEffect(() => {
    setEntry(null);
    const id = params.get("card"),
      person = params.get("person");
    if (!id && !person) return;
    const controller = new AbortController();
    api<ListPage<Entry>>(
      "/people/" +
        category +
        "/list?" +
        new URLSearchParams(id ? { id } : { person: person! }),
      undefined,
      controller.signal,
    )
      .then((page) => {
        if (!controller.signal.aborted) {
          setEntry(page.items[0] ?? null);
          if (!page.items.length) setDeleteError("Карточка не найдена.");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setDeleteError(error.message);
      });
    return () => controller.abort();
  }, [category, params]);
  useEffect(() => {
    setQuery("");
    setSphere("");
    setAdding(false);
    setDeleting(null);
    setDeleteError("");
  }, [category]);
  if (!titles[category])
    return (
      <Empty
        title="Таблица не найдена"
        action={<Link to="/data/people">К таблицам людей</Link>}
      />
    );
  const external = category === "external";
  const rows = source.items;
  const person = entry?.person;
  const savePerson = async (updated: Person) => {
    if (!entry) return;
    await api("/people/external/save", {
      id: entry.id,
      version: entry.version,
      person: updated,
    });
    notify("Изменения сохранены");
    try {
      await source.reload();
    } catch (error) {
      setDeleteError("Изменения сохранены. " + (error as Error).message);
    }
  };
  const save = async (): Promise<Entry> => {
    if (!entry) throw new Error("Карточка не найдена");
    await api("/people/" + category + "/save", entry);
    // Read the fresh version before allowing the next edit.
    const next = await api<ListPage<Entry>>(
      "/people/" + category + "/list?id=" + encodeURIComponent(entry.id),
    );
    const saved = next.items[0];
    if (!saved)
      throw new Error("Обновите таблицу: сохранённая карточка не найдена.");
    setEntry(saved);
    void source.reload().catch(() => {});
    notify("Карточка сохранена");
    return saved;
  };
  const archiveEntry = async (selected: Entry | null = entry) => {
    if (!selected) throw new Error("Карточка не найдена");
    const result = await api<{ folder: string }>("/people/" + category + "/archive", {
      id: selected.id,
      version: selected.version,
      academicYear: year + "/" + (Number(year) + 1),
    });
    notify("Папка архива готова");
    navigate("/archive?folder=" + encodeURIComponent(result.folder));
  };
  const deleteEntry = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    setDeleteError("");
    try {
      await api("/people/" + category + "/delete", {
        id: deleting.id,
        version: deleting.version,
      });
      setDeleting(null);
      notify("Запись удалена");
      await source.reload();
    } catch (error) {
      setDeleteError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!catalog.data)
    return (
      <Empty
        title={source.error || catalog.error || "Загрузка справочников…"}
        action={
          source.error || catalog.error ? (
            <button
              className="button secondary"
              onClick={() =>
                reload().catch((error) => setDeleteError(error.message))
              }
            >
              Повторить
            </button>
          ) : undefined
        }
      >
        {deleteError}
      </Empty>
    );
  if (entry && person && !external)
    return (
      <>
      <ChairmanCard
        key={entry.id}
        entry={entry}
        person={person}
        complex={category === "complex"}
        schools={schools}
        onChange={setEntry}
        onArchive={() => archiveEntry()}
        onPrint={() => setPrinting(entry)}
        onSave={save}
        onBack={() => setParams({})}
      />
      {printing && <ChairmanPrint entry={printing} category={category} onClose={() => setPrinting(null)} />}
      </>
    );
  return (
    <div className="page-enter hub-page">
      <Link to="/data/people" className="text-button">
        Исходные данные / Люди /
      </Link>
      <div className="hub-welcome">
        <span className="eyebrow">ТАБЛИЦА · ЛЮДИ</span>
        <div className="people-title-actions">
          <PageTitle>{titles[category]}</PageTitle>
          <button className="button primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Добавить
          </button>
        </div>
        {external && <p>Сведения о представителях внешних организаций.</p>}
      </div>
      {params.get("person") && !entry && (
        <p className="info-note">
          Для выбранного человека ещё нет карточки в этой таблице. Ниже доступны
          существующие записи.
        </p>
      )}
      {deleteError && !deleting && (
        <p className="form-error" role="alert">
          {deleteError}
        </p>
      )}
      <div className="people-table-shell">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Поиск людей"
              placeholder="Фамилия или организация"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {!external && (
            <AppSelect
              aria-label="Сфера деятельности"
              value={sphere}
              onChange={(e) => setSphere(e.target.value)}
            >
              <option value="">Все сферы деятельности</option>
              <option>Образование</option>
              <option>Бизнес</option>
            </AppSelect>
          )}

          {source.ready && (
            <span className="muted">Всего записей: {source.total}</span>
          )}

          <button
            className="icon-button"
            aria-label="Обновить таблицу"
            title="Обновить таблицу"
            disabled={busy}
            onClick={() =>
              reload().catch((error) => setDeleteError(error.message))
            }
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="people-table-scroll">
          <table className={`people-table progressive-table${external ? "" : " chairman-table"}`}>
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Организация и должность</th>
                {!external && (
                  <>
                    <th>Высшая школа</th>
                    <th>Сфера</th>
                  </>
                )}
                <th>Действия</th>
              </tr>
            </thead>
            <ProgressiveRows
              rows={rows}
              rowKey={(row) => row.id}
              columns={external ? 3 : 5}
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
              renderRow={(e) => {
                const p = e.person!;
                return (
                  <tr key={e.id}>
                    <td>
                      <div className="people-cell">
                        <Avatar person={p} />
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td>
                      {p.organization}
                      <small>{p.position}</small>
                    </td>
                    {!external && (
                      <>
                        <td>{e.schoolIds.map(schoolName).join("; ")}</td>
                        <td>
                          <span className="sphere-tag">{e.sphere}</span>
                        </td>
                      </>
                    )}
                    <td>
                      <div className="button-row">
                        {!external && (
                          <>
                            <button
                              className="icon-button"
                              title="Печать"
                              aria-label={`Печать — ${p.name}`}
                              onClick={() => setPrinting(e)}
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              className="icon-button"
                              title="Архив"
                              aria-label={`Архив — ${p.name}`}
                              disabled={archivingId !== null || p.missing}
                              onClick={async () => {
                                setArchivingId(e.id);
                                setDeleteError("");
                                try {
                                  await archiveEntry(e);
                                } catch (error) {
                                  setDeleteError((error as Error).message);
                                } finally {
                                  setArchivingId(null);
                                }
                              }}
                            >
                              {archivingId === e.id ? <RefreshCw size={15} /> : <Archive size={15} />}
                            </button>
                          </>
                        )}
                        <button
                          className="icon-button"
                          title="Изменить"
                          aria-label={`Изменить ${p.name}`}
                          onClick={() => setParams({ card: e.id })}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button"
                          title="Удалить"
                          aria-label={`Удалить ${p.name}`}
                          onClick={() => {
                            setDeleting(e);
                            setDeleteError("");
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }}
            />
          </table>
        </div>
        {!rows.length && !source.loading && !source.error && (
          <Empty title="Ничего не найдено">
            Измените поиск или сферу деятельности.
          </Empty>
        )}
      </div>
      {printing && <ChairmanPrint entry={printing} category={category} onClose={() => setPrinting(null)} />}
      {adding && (
        <AddPersonEntry
          category={category}
          schools={schools}
          onAdd={add}
          onClose={() => setAdding(false)}
        />
      )}
      {entry && person && external && (
        <ExternalPersonEditor
          key={entry.id}
          person={person}
          onSave={savePerson}
          onClose={() => setParams({})}
        />
      )}
      {deleting && (
        <Confirm
          title="Удалить запись?"
          confirmLabel={busy ? "Удаление…" : "Удалить"}
          danger
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
          onConfirm={deleteEntry}
        >
          «{deleting.person?.name}».{" "}
          {deleteError || "Связанные с комиссиями записи удалить нельзя."}
        </Confirm>
      )}
    </div>
  );
}
