import { PageTitle } from "../components/PageTitle";
import { ExternalPersonEditor } from "../components/ExternalPersonEditor";
import { AddPersonEntry } from "../components/AddPersonEntry";
import { api } from "../api";
import { useServerData, type ServerCatalog } from "../data/serverCatalog";
import type { Person } from "../data/model";
import { AppSelect } from "../components/AppSelect";
import { ChairmanCard } from "../components/ChairmanCard";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Search, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

import { Avatar, Empty, Confirm } from "../components/ui";
import { useStore } from "../store";
export type Entry = {
  person?: Person;
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
  const { notify } = useStore();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [query, setQuery] = useState("");
  const [sphere, setSphere] = useState("");
  const [entry, setEntry] = useState<Entry | null>(null);

  const source = useServerData<{
    people: (Person & { missing?: boolean })[];
    entries: Record<string, Entry[]>;
  }>("/people");
  const catalog = useServerData<ServerCatalog>("/catalog");
  const [busy, setBusy] = useState(false);
  const all = source.data?.entries ?? {};
  const people = source.data?.people ?? [];
  const schools = (catalog.data?.schools ?? []).map((s) => ({
    id: s.id_school,
    name: s.name_school,
  }));
  const schoolName = (id: string) =>
    schools.find((s) => s.id === id)?.name ?? "—";
  const reload = async () => {
    await Promise.all([source.reload(), catalog.reload()]);
  };
  const add = async (row: Entry) => {
    const result = await api<{ id: string }>("/people/" + category + "/save", {
      ...row,
      id: null,
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
    const personId = params.get("person"),
      card = params.get("card");
    const found = (source.data?.entries[category] ?? []).find((e) =>
      card ? e.id === card : personId ? e.personId === personId : false,
    );
    setEntry(found ? structuredClone(found) : null);
  }, [category, params, source.data]);
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
  const rows = (all[category] ?? []).filter((e) => {
    const p = people.find((p) => p.id === e.personId);
    return (
      p &&
      (!sphere || e.sphere === sphere) &&
      `${p.name} ${p.organization}`
        .toLocaleLowerCase("ru")
        .includes(query.toLocaleLowerCase("ru"))
    );
  });
  const person = people.find((p) => p.id === entry?.personId);

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
    const next = await source.reload();
    const saved = next.entries[category].find((row) => row.id === entry.id);
    if (!saved)
      throw new Error("Обновите таблицу: сохранённая карточка не найдена.");
    notify("Карточка сохранена");
    return saved;
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
  if (!source.data || !catalog.data)
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
      <ChairmanCard
        key={entry.id}
        entry={entry}
        person={person}
        complex={category === "complex"}
        schools={schools}
        onChange={setEntry}
        onSave={save}
        onBack={() => setParams({})}
      />
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
        <p>
          {external
            ? "Сведения о представителях внешних организаций."
            : "Карточки по сферам «Образование» и «Бизнес» с разным составом полей."}
        </p>
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
          <span className="muted">{rows.length} записей</span>
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
          <table className="people-table">
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
            <tbody>
              {rows.map((e) => {
                const p = people.find((p) => p.id === e.personId)!;
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
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty title="Ничего не найдено">
            Измените поиск или сферу деятельности.
          </Empty>
        )}
      </div>
      {adding && (
        <AddPersonEntry
          category={category}
          people={people.filter((person) => !person.missing)}
          schools={schools}
          entries={[...all.chairmen, ...all.complex]}
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
          «{people.find((p) => p.id === deleting.personId)?.name}».{" "}
          {deleteError || "Связанные с комиссиями записи удалить нельзя."}
        </Confirm>
      )}
    </div>
  );
}
