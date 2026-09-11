import { PageTitle } from "../components/PageTitle";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpRight,
  Building2,
  BookOpen,
  GraduationCap,
  NotebookPen,
  RefreshCw,
} from "lucide-react";
import { AppSelect } from "../components/AppSelect";
import { Avatar, Empty, Field, Modal, Confirm } from "../components/ui";
import { useStore } from "../store";
import {
  catalogTitles,
  fields,
  primaryKeys,
  type CatalogKind,
  type CatalogRow,
  type CatalogField,
} from "../data/catalog";
const groups = {
  structure: {
    title: "Структура университета",
    description: "Высшие школы и сведения об их руководителях.",
    items: [
      [
        "schools",
        "Высшие школы",
        "Название, сокращение, директор и его должность.",
      ],
    ],
  },
  education: {
    title: "Образование",
    description:
      "Направления, программы и дисциплины в отдельных связанных справочниках.",
    items: [
      [
        "directions",
        "Направления подготовки",
        "Код направления и уровень образования.",
      ],
      [
        "programs",
        "Образовательные программы",
        "Несколько программ могут относиться к одному направлению.",
      ],
      [
        "disciplines",
        "Дисциплины",
        "Принадлежность высшей школе и уровню образования.",
      ],
    ],
  },
};
export function CatalogHub({ group }: { group: "structure" | "education" }) {
  const g = groups[group];
  return (
    <div className="page-enter hub-page">
      <Link className="text-button" to="/data">
        Исходные данные /
      </Link>
      <div className="hub-welcome">
        <span className="eyebrow">СПРАВОЧНИКИ</span>
        <PageTitle>{g.title}</PageTitle>
        <p>{g.description}</p>
      </div>
      <div className="people-hub-grid">
        {g.items.map(([key, title, description]) => (
          <Link
            key={key}
            className="module-card available"
            to={`/data/catalog/${key}`}
          >
            <span className="module-icon">
              {key === "schools" ? (
                <Building2 size={24} />
              ) : key === "directions" ? (
                <GraduationCap size={24} />
              ) : key === "programs" ? (
                <BookOpen size={24} />
              ) : (
                <NotebookPen size={24} />
              )}
            </span>
            <h2 style={{ marginTop: 22 }}>{title}</h2>
            <p>{description}</p>
            <footer>
              Открыть таблицу <ArrowUpRight size={17} />
            </footer>
          </Link>
        ))}
      </div>
    </div>
  );
}
export function CatalogTable() {
  const { kind } = useParams();
  return kind && kind in catalogTitles ? (
    <Table key={kind} kind={kind as CatalogKind} />
  ) : (
    <Empty title="Таблица не найдена" />
  );
}
import { api } from "../api";
import { useServerData, type ServerCatalog } from "../data/serverCatalog";

function Table({ kind }: { kind: CatalogKind }) {
  const source = useServerData<ServerCatalog>("/catalog");
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<CatalogRow | null>(null);
  const [fresh, setFresh] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<CatalogRow | null>(null);
  const { notify } = useStore();
  const data = source.data;
  const pk = primaryKeys[kind];
  const formFields: CatalogField[] =
    kind === "teachers"
      ? [
          { key: "id_teacher", label: "Табельный номер", required: true },
          ...fields[kind],
        ]
      : fields[kind];
  const columns = formFields.filter(
    (f) => !["rp", "dp", "scient_position", "staff_position"].includes(f.key),
  );
  const filterKey =
    kind === "programs"
      ? "id_direction"
      : kind === "teachers" || kind === "disciplines"
        ? "id_school"
        : kind === "directions"
          ? "id_level"
          : "";
  const filterRef =
    kind === "programs"
      ? "directions"
      : kind === "directions"
        ? "levels"
        : "schools";
  const filter = params.get(filterKey) ?? "";
  const options = (ref: string) =>
    !data
      ? []
      : ref === "levels"
        ? data.levels.map((l) => ({ value: l.id, label: l.name }))
        : ref === "schools"
          ? data.schools.map((s) => ({
              value: s.id_school,
              label: s.name_school,
            }))
          : data.directions.map((d) => ({
              value: d.id_direction,
              label: d.number_direction + " · " + d.name_direction,
            }));
  const refName = (ref: string, id: string) =>
    options(ref).find((o) => o.value === id)?.label ?? "—";
  const rows = (data?.[kind] ?? []).filter(
    (r) =>
      (!params.get("search") || r[pk] === params.get("search")) &&
      (!filter || r[filterKey] === filter) &&
      columns
        .map((f) => (f.ref ? refName(f.ref, r[f.key]) : r[f.key]))
        .join(" ")
        .toLocaleLowerCase("ru")
        .includes(query.toLocaleLowerCase("ru")),
  );
  const refresh = async () => {
    try {
      await source.reload();
    } catch (error) {
      setError((error as Error).message);
    }
  };
  const save = async () => {
    if (!edit || busy) return;
    setError("");
    for (const field of formFields) {
      if (field.required && !edit[field.key]?.trim()) {
        setError("Заполните поле «" + field.label + "»");
        return;
      }
    }
    setBusy(true);
    try {
      await api("/catalog/" + kind + "/save", {
        ...edit,
        id: fresh ? null : edit[pk],
      });
      setEdit(null);
      notify("Запись сохранена");
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const deleteRow = async () => {
    if (!remove || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/catalog/" + kind + "/delete", {
        id: remove[pk],
        version: remove.version,
      });
      setRemove(null);
      notify("Запись удалена");
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const back =
    kind === "teachers"
      ? "/data/people"
      : kind === "schools"
        ? "/data/structure"
        : "/data/education";
  const description = {
    programs:
      "У каждой программы одно направление. У направления может быть несколько программ.",
    directions: "Откройте программы направления через счётчик в строке.",
    disciplines: "Дисциплина относится к высшей школе и уровню образования.",
    schools:
      "Сведения о высшей школе и директоре, включая исполняющего обязанности.",
    teachers:
      "Табельный номер, школа, должность, учёная степень и звание преподавателя.",
  }[kind];
  return (
    <div className="page-enter hub-page">
      <Link className="text-button" to={back}>
        Исходные данные /{" "}
        {kind === "teachers"
          ? "Люди"
          : kind === "schools"
            ? "Структура университета"
            : "Образование"}{" "}
        /
      </Link>
      <div className="page-heading catalog-heading">
        <div>
          <div className="heading-eyebrow">СПРАВОЧНИК</div>
          <PageTitle>{catalogTitles[kind]}</PageTitle>
          <p>{description}</p>
        </div>
        <button
          className="button primary"
          disabled={!data}
          onClick={() => {
            setFresh(true);
            setError("");
            setEdit(
              Object.fromEntries(
                formFields.map((f) => [
                  f.key,
                  f.key === filterKey ? filter : "",
                ]),
              ),
            );
          }}
        >
          <Plus size={16} /> Добавить
        </button>
      </div>
      {!data ? (
        <Empty
          title={source.error || "Загрузка справочника…"}
          action={
            source.error ? (
              <button className="button secondary" onClick={refresh}>
                Повторить
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {error && !edit && !remove && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="people-table-shell">
            <div className="table-toolbar">
              <div className="search-field">
                <Search size={17} />
                <input
                  aria-label="Поиск в таблице"
                  placeholder="Поиск по справочнику"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {filterKey && (
                <AppSelect
                  aria-label="Фильтр справочника"
                  value={filter}
                  onChange={(e) =>
                    setParams(
                      e.target.value ? { [filterKey]: e.target.value } : {},
                    )
                  }
                >
                  <option value="">
                    {filterRef === "directions"
                      ? "Все направления"
                      : filterRef === "schools"
                        ? "Все высшие школы"
                        : "Все уровни"}
                  </option>
                  {options(filterRef).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </AppSelect>
              )}
              <span className="muted">Записей: {rows.length}</span>
              <button
                className="icon-button"
                aria-label="Обновить таблицу"
                title="Обновить таблицу"
                disabled={busy}
                onClick={refresh}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div className="people-table-scroll">
              <table className="people-table catalog-table">
                <thead>
                  <tr>
                    {columns.map((f) => (
                      <th key={f.key}>{f.label}</th>
                    ))}
                    {kind === "directions" && <th>Программы</th>}
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row[pk]}>
                      {columns.map((f) => (
                        <td key={f.key}>
                          {kind === "teachers" && f.key === "name_teacher" ? (
                            <div className="people-cell">
                              <Avatar
                                person={{
                                  color: "sage",
                                  initials: row.name_teacher
                                    .trim()
                                    .split(/\s+/)
                                    .slice(0, 2)
                                    .map((part) => part[0])
                                    .join(""),
                                }}
                              />
                              <strong>{row.name_teacher || "—"}</strong>
                            </div>
                          ) : f.ref === "directions" ? (
                            <Link
                              className="text-button"
                              to={
                                "/data/catalog/directions?search=" +
                                encodeURIComponent(row.id_direction)
                              }
                            >
                              {refName(f.ref, row[f.key])}
                            </Link>
                          ) : f.ref ? (
                            refName(f.ref, row[f.key])
                          ) : (
                            row[f.key] || "—"
                          )}
                        </td>
                      ))}
                      {kind === "directions" && (
                        <td>
                          <Link
                            className="text-button"
                            to={
                              "/data/catalog/programs?id_direction=" +
                              encodeURIComponent(row.id_direction)
                            }
                          >
                            {
                              data.programs.filter(
                                (p) => p.id_direction === row.id_direction,
                              ).length
                            }{" "}
                            программ <ArrowUpRight size={14} />
                          </Link>
                        </td>
                      )}
                      <td>
                        <div className="button-row">
                          <button
                            className="icon-button"
                            aria-label={"Изменить " + row[columns[0].key]}
                            onClick={() => {
                              setFresh(false);
                              setError("");
                              setEdit({ ...row });
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={"Удалить " + row[columns[0].key]}
                            onClick={() => {
                              setError("");
                              setRemove(row);
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <Empty title="Записи не найдены">
                Измените фильтр или добавьте запись.
              </Empty>
            )}
          </div>
        </>
      )}
      {edit && (
        <Modal
          wide
          title={
            fresh ? "Новая запись" : "Редактирование · " + catalogTitles[kind]
          }
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
                type="submit"
                form="catalog-edit"
              >
                {busy ? "Сохранение…" : "Сохранить"}
              </button>
            </>
          }
        >
          <form
            id="catalog-edit"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset
              disabled={busy}
              style={{ border: 0, padding: 0, margin: 0 }}
            >
              <div className="form-grid">
                {formFields.map((f) => (
                  <Field key={f.key} label={f.label} required={f.required}>
                    {f.ref ? (
                      <AppSelect
                        aria-label={f.label}
                        value={edit[f.key] ?? ""}
                        required={f.required}
                        onChange={(e) =>
                          setEdit({ ...edit, [f.key]: e.target.value })
                        }
                      >
                        <option value="">Выберите значение</option>
                        {options(f.ref).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </AppSelect>
                    ) : (
                      <input
                        aria-label={f.label}
                        value={edit[f.key] ?? ""}
                        readOnly={!fresh && f.key === "id_teacher"}
                        required={f.required}
                        onChange={(e) =>
                          setEdit({ ...edit, [f.key]: e.target.value })
                        }
                      />
                    )}
                  </Field>
                ))}
              </div>
            </fieldset>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="Удалить запись?"
          confirmLabel={busy ? "Удаление…" : "Удалить"}
          danger
          onClose={() => {
            if (!busy) setRemove(null);
          }}
          onConfirm={deleteRow}
        >
          {remove[columns[0].key]}.{" "}
          {error || "Действие удалит запись из справочника."}
        </Confirm>
      )}
    </div>
  );
}
