import { HorizontalTableScroll } from '../components/HorizontalTableScroll';
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Table2,
  GraduationCap,
  Plus,
  Search,
  Pencil,
  Trash2,
} from "lucide-react";
import { PageTitle } from "../components/PageTitle";
import { AppSelect } from "../components/AppSelect";
import { Confirm, Empty, Field, Modal } from "../components/ui";
import { api } from "../api";
import { RemoteSelect } from "../components/RemoteSelect";
import { ProgressiveRows } from "../components/ProgressiveRows";
import { useDebounced, useProgressiveList } from "../data/useProgressiveList";
import { oopTables } from "../data/oopForm";
import { useStore } from "../store";

const base = "/oop/data/programs";

const sections = [
  {
    id: "matrix",
    title: "Матрица ПК ООП",
    description:
      "Профессиональные компетенции, индикаторы достижения и основания по образовательным программам.",
    icon: Table2,
  },
  {
    id: "forms",
    title: "Выбор форм обучения для образовательной программы",
    description:
      "Связь образовательных программ с очной, очно-заочной и заочной формами обучения.",
    icon: GraduationCap,
  },
];
type Entry = {
  programId: string;
  id: string;
  values: string[];
  code: string;
  name: string;
  version: string;
  task: string;
  object: string;
  form: string;
};
type Context = {
  options: Record<string, { id: string; values: string[] }[]>;
  educationForms: { id_ef: string; name_education_form: string }[];
  draft: { status: string };
};

export function OopProgramData() {
  const { table } = useParams();
  const section = sections.find((item) => item.id === table);
  return (
    <div className="page-enter hub-page">
      <Link className="text-button" to={table ? base : "/oop/data"}>
        {table
          ? "Сведения по образовательным программам"
          : "Ввод исходных данных"}{" "}
        /
      </Link>
      <div className="hub-welcome">
        <PageTitle>
          {section?.title ??
            "Исходные данные для формирования сведений по образовательным программам"}
        </PageTitle>
        <p>
          {section?.description ??
            "Матрица профессиональных компетенций и формы обучения."}
        </p>
      </div>
      {!table ? (
        <div className="people-hub-grid two">
          {sections.map((item) => (
            <Link
              className="module-card available"
              key={item.id}
              to={`${base}/${item.id}`}
            >
              <span className="module-icon">
                <item.icon size={24} />
              </span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <footer>
                Открыть таблицу
                <ArrowUpRight size={17} />
              </footer>
            </Link>
          ))}
        </div>
      ) : section ? (
        <ProgramTable key={table} kind={section.id} />
      ) : (
        <Empty title="Таблица не найдена" />
      )}
    </div>
  );
}

function ProgramTable({ kind }: { kind: string }) {
  const matrix = kind === "matrix";
  const columns = matrix ? oopTables.oop.columns : ["Форма обучения"];
  const [params, setParams] = useSearchParams();
  const filter = params.get("program") ?? "",
    query = params.get("q") ?? "";
  const search = useDebounced(query);
  const path = `/oop/program-data/${kind}/list?program=${encodeURIComponent(filter)}&q=${encodeURIComponent(search)}`;
  const list = useProgressiveList<Entry>(path, "id");
  const [edit, setEdit] = useState<Entry | null>(null),
    [remove, setRemove] = useState<Entry | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const { notify, user } = useStore();
  useEffect(() => {
    setContext(null);
    setError("");
    if (!edit?.programId) return;
    const controller = new AbortController();
    api<Context>(
      "/oop/formation?program=" + encodeURIComponent(edit.programId),
      undefined,
      controller.signal,
    )
      .then(setContext)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [edit?.programId]);
  const setFilter = (key: string, value: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const startEdit = (row: Entry | null) => {
    setError("");
    setEdit(
      row
        ? structuredClone(row)
        : {
            id: "",
            programId: filter,
            values: columns.map(() => ""),
            code: "",
            name: "",
            version: "",
            task: "",
            object: "",
            form: "",
          },
    );
  };
  async function persist(entry: Entry, deleting = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api(
        `/oop/program-data/${kind}/${deleting ? "delete" : "save"}`,
        entry,
      );
      setEdit(null);
      setRemove(null);
      notify(deleting ? "Запись удалена" : "Запись сохранена");
      await list.reload().catch(() => {});
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const locked = user?.role === "rop" && context?.draft.status === "Утверждён";
  return (
    <div>
      <div className="oop-data-actions">
        <span className="muted">
          {matrix
            ? "Профессиональные компетенции разработчика ООП"
            : "Одна программа может иметь несколько форм обучения"}
        </span>
        <button className="button primary" onClick={() => startEdit(null)}>
          <Plus size={16} />
          Добавить
        </button>
      </div>
      <div className="people-table-shell">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Поиск в таблице"
              placeholder="Код, программа или сведения"
              value={query}
              onChange={(e) => setFilter("q", e.target.value)}
            />
          </div>
          <RemoteSelect
            source="programs"
            aria-label="Фильтр образовательной программы"
            placeholder="Все программы"
            value={filter}
            onChange={(e) => setFilter("program", e.target.value)}
          />
          <span className="muted">Записей: {list.total}</span>
        </div>
        <HorizontalTableScroll enabled={matrix}>
          <table
            className={`people-table oop-data-table ${matrix ? "matrix" : ""}`}
          >
            <thead>
              <tr>
                <th>Код ООП</th>
                <th>Название ООП</th>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>Действия</th>
              </tr>
            </thead>
            <ProgressiveRows
              rows={list.items}
              rowKey={(row) => row.id}
              columns={columns.length + 3}
              resetKey={path}
              hasMore={list.hasMore}
              loading={list.loading}
              error={list.error}
              onMore={() =>
                void (list.error ? list.retry() : list.more()).catch(() => {})
              }
              renderRow={(row) => (
                <tr>
                  <td>{row.code || "—"}</td>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  {row.values.map((value, i) => (
                    <td key={i} style={{ whiteSpace: "pre-line" }}>
                      {value || "—"}
                    </td>
                  ))}
                  <td>
                    {row.programId ? (
                      <div className="button-row">
                        <button
                          className="icon-button"
                          aria-label={`Изменить запись ${row.code}`}
                          onClick={() => startEdit(row)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Удалить запись ${row.code}`}
                          onClick={() => {
                            setError("");
                            setRemove(row);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ) : (
                      <span className="muted">Общая компетенция</span>
                    )}
                  </td>
                </tr>
              )}
            />
          </table>
        </HorizontalTableScroll>
        {list.ready && !list.loading && !list.error && !list.items.length && (
          <Empty title="Записи не найдены">
            <p>Измените условия поиска или добавьте запись.</p>
            <button className="button secondary" onClick={() => setParams({})}>
              Сбросить фильтры
            </button>
          </Empty>
        )}
      </div>
      <p className="hub-footnote">
        Изменения используются в формировании ООП.{" "}
        {matrix
          ? "Отображение матрицы в ОХОП настраивается в разделе 8.4 формы ООП."
          : "Удаление формы обучения сохраняет ранее введённые ссылки на учебный план и график."}
      </p>
      {edit && (
        <Modal
          wide
          title={edit.id ? "Редактирование записи" : "Новая запись"}
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
                type="submit"
                form="oop-data-edit"
                className="button primary"
                disabled={busy || !context || locked}
              >
                Сохранить
              </button>
            </>
          }
        >
          <form
            id="oop-data-edit"
            onSubmit={(e) => {
              e.preventDefault();
              void persist(edit);
            }}
          >
            <Field label="Образовательная программа" required>
              <RemoteSelect
                source="programs"
                aria-label="Образовательная программа"
                required
                value={edit.programId}
                disabled={!!edit.id || busy}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    programId: e.target.value,
                    task: "",
                    object: "",
                    form: "",
                    values: columns.map(() => ""),
                  })
                }
              />
            </Field>
            {edit.programId && !context && !error && (
              <p role="status">Загрузка сведений программы…</p>
            )}
            {locked && (
              <p className="info-note">
                ООП утверждена. Для редактирования верните её в черновик в форме
                ООП.
              </p>
            )}
            {context && (
              <fieldset disabled={busy || locked} className="oop-editor-fields">
                {matrix ? (
                  <div className="form-grid">
                    {(["task", "object"] as const).map((key) => {
                      const options =
                        context.options[key === "task" ? "tasks" : "objects"];
                      const label =
                        key === "task"
                          ? "Задача профессиональной деятельности"
                          : "Объект профессиональной деятельности";
                      return (
                        <Field key={key} label={label}>
                          <RemoteSelect
                            source=""
                            placeholder="Не выбран"
                            localOptions={options.map(row=>({value:row.id,label:row.values.join(" · ")}))}
                            aria-label={label}
                            value={edit[key]}
                            onChange={(e) => {
                              const selected = options.find(
                                (row) => row.id === e.target.value,
                              );
                              setEdit({
                                ...edit,
                                [key]: e.target.value,
                                values: edit.values.map((v, i) =>
                                  key === "task" && i < 2
                                    ? (selected?.values[i] ?? "")
                                    : key === "object" && i === 2
                                      ? (selected?.values[1] ?? "")
                                      : v,
                                ),
                              });
                            }}
                          />
                        </Field>
                      );
                    })}
                    {columns.slice(3).map((column, index) => (
                      <Field key={column} label={column}>
                        <textarea
                          aria-label={column}
                          rows={4}
                          value={edit.values[index + 3] ?? ""}
                          onChange={(e) =>
                            setEdit({
                              ...edit,
                              values: edit.values.map((v, i) =>
                                i === index + 3 ? e.target.value : v,
                              ),
                            })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                ) : (
                  <Field label="Форма обучения" required>
                    <AppSelect
                      aria-label="Форма обучения"
                      value={edit.form}
                      onChange={(e) =>
                        setEdit({ ...edit, form: e.target.value })
                      }
                    >
                      <option value="">Выберите форму обучения</option>
                      {context.educationForms.map((form) => (
                        <option key={form.id_ef} value={form.id_ef}>
                          {form.name_education_form}
                        </option>
                      ))}
                    </AppSelect>
                  </Field>
                )}
              </fieldset>
            )}
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
          onConfirm={() => void persist(remove, true)}
        >
          {remove.code} · {remove.name}.{" "}
          {matrix
            ? "Запись будет удалена из матрицы ПК ООП."
            : `Форма обучения «${remove.values[0]}» будет исключена из программы.`}
          {error && <span role="alert"> {error}</span>}
        </Confirm>
      )}
    </div>
  );
}
export function OopDataGroup({ kind }: { kind: "directions" | "general" }) {
  return (
    <div className="page-enter hub-page">
      <Link className="text-button" to="/oop/data">
        Ввод исходных данных /
      </Link>
      <div className="hub-welcome">
        <PageTitle>
          {kind === "directions"
            ? "Исходные данные для направлений подготовки"
            : "Общие исходные данные"}
        </PageTitle>
      </div>
      <section className="scope-note">
        <h2>Раздел в подготовке</h2>
        <p>Таблицы этого блока ещё не перенесены из предыдущей системы.</p>
      </section>
    </div>
  );
}
