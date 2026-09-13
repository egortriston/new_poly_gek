import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Layers3,
  ListChecks,
  FileCheck,
  Table2,
  Plus,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { PageTitle } from "../components/PageTitle";
import { api } from "../api";
import { RemoteSelect } from "../components/RemoteSelect";
import { ProgressiveRows } from "../components/ProgressiveRows";
import { HorizontalTableScroll } from "../components/HorizontalTableScroll";
import { useDebounced, useProgressiveList } from "../data/useProgressiveList";
import { Confirm, Empty, Field, Modal } from "../components/ui";
import { oopTables } from "../data/oopForm";
import { useStore } from "../store";

const base = "/oop/data/general";
export const generalSections = [
  {
    id: "directions",
    title: "Направления подготовки",
    description: "Код, наименование направления и уровень обучения.",
    icon: GraduationCap,
    path: "/data/catalog/directions",
    columns: [],
  },
  {
    id: "programs",
    title: "Образовательные программы",
    description: "Программы направлений и сведения о руководителях ОП.",
    icon: BookOpen,
    path: "/data/catalog/programs",
    columns: [],
  },
  {
    id: "areas",
    title: "Наименования областей ПД",
    description: "Коды и наименования областей профессиональной деятельности.",
    icon: Layers3,
    columns: ["Код области ПД", "Область ПД"],
  },
  {
    id: "types",
    title: "Типы задач ПД",
    description: "Общий перечень типов задач профессиональной деятельности.",
    icon: ListChecks,
    columns: ["Наименование типа задачи ПД"],
  },
  {
    id: "standards",
    title: "Профессиональные стандарты",
    description: "Коды, названия стандартов и информация об утверждении.",
    icon: FileCheck,
    columns: [
      "Код проф. стандарта",
      "Название стандарта",
      "Информация об утверждении",
    ],
  },
  {
    id: "uk",
    title: "Матрица УК",
    description:
      "Универсальные компетенции и индикаторы достижения по уровням обучения.",
    icon: Table2,
    columns: oopTables.uk.columns,
  },
];
type Entry = {
  id: string;
  level: string;
  levelName: string;
  version: string;
  values: string[];
};

export function OopGeneralData() {
  const { table } = useParams();
  const section = generalSections.find(
    (item) => item.id === table && !item.path,
  );
  return (
    <div className="page-enter hub-page">
      <Link className="text-button" to={table ? base : "/oop/data"}>
        {table ? "Общие исходные данные" : "Ввод исходных данных"} /
      </Link>
      <div className="hub-welcome">
        <PageTitle>
          {section?.title ??
            "Общие исходные данные всех образовательных программ"}
        </PageTitle>
        <p>
          {section?.description ??
            "Направления, программы, профессиональные стандарты и универсальные компетенции."}
        </p>
      </div>
      {!table ? (
        <div className="people-hub-grid two">
          {generalSections.map((item) => (
            <Link
              className="module-card available"
              key={item.id}
              to={item.path ?? `${base}/${item.id}`}
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
        <GeneralTable key={table} section={section} />
      ) : (
        <Empty title="Таблица не найдена" />
      )}
    </div>
  );
}

function GeneralTable({
  section,
}: {
  section: (typeof generalSections)[number];
}) {
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  const [edit, setEdit] = useState<Entry | null>(null);
  const [fresh, setFresh] = useState(false);
  const [remove, setRemove] = useState<Entry | null>(null);
  const [error, setError] = useState("");
  const { notify } = useStore();
  const isMatrix = section.id === "uk";
  const query = params.get("q") ?? "";
  const level = params.get("level") ?? "";
  const settled = useDebounced(query);
  const endpoint = `/oop/general/${section.id}`;
  const path = `${endpoint}/list?${new URLSearchParams({ q: settled, level })}`;
  const list = useProgressiveList<Entry>(path, "id");
  const required = (index: number) =>
    isMatrix ? index === 1 : section.id === "types" ? index === 0 : index < 2;
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
  const startEdit = (row?: Entry) => {
    setError("");
    setFresh(!row);
    setEdit(
      row
        ? structuredClone(row)
        : {
            id: "",
            version: "",
            level,
            levelName: "",
            values: section.columns.map(() => ""),
          },
    );
  };
  const mutate = async (entry: Entry, deleting = false) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`${endpoint}/${deleting ? "delete" : "save"}`, entry);
      setEdit(null);
      setRemove(null);
      notify(deleting ? "Запись удалена" : "Запись сохранена");
      void list.reload().catch(() => {});
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Не удалось сохранить запись.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="oop-data-actions">
        <span className="muted">
          {isMatrix
            ? "Изменения применяются ко всем программам выбранного уровня обучения."
            : "Общий справочник для образовательных программ."}
        </span>
        <button className="button primary" onClick={() => startEdit()}>
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
              placeholder="Поиск по таблице"
              value={query}
              onChange={(e) => setFilter("q", e.target.value)}
            />
          </div>
          {isMatrix && (
            <RemoteSelect
              source="levels"
              aria-label="Фильтр уровня обучения"
              placeholder="Все уровни обучения"
              value={level}
              onChange={(e) => setFilter("level", e.target.value)}
            />
          )}
          <span className="muted">
            Записей: {list.ready ? list.total : "—"}
          </span>
        </div>
        <HorizontalTableScroll enabled={isMatrix}>
          <table
            className="people-table oop-general-table"
            style={isMatrix ? { minWidth: 1200 } : undefined}
          >
            <thead>
              <tr>
                {isMatrix && <th>Уровень обучения</th>}
                {section.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>Действия</th>
              </tr>
            </thead>
            <ProgressiveRows
              rows={list.items}
              rowKey={(row) => row.id}
              columns={section.columns.length + (isMatrix ? 2 : 1)}
              resetKey={path}
              hasMore={list.hasMore}
              loading={list.loading}
              error={list.error}
              onMore={() =>
                void (list.error ? list.retry() : list.more()).catch(() => {})
              }
              renderRow={(row) => (
                <tr>
                  {isMatrix && <td>{row.levelName || "—"}</td>}
                  {section.columns.map((column, index) => (
                    <td key={column}>{row.values[index] || "—"}</td>
                  ))}
                  <td>
                    <div className="button-row">
                      <button
                        className="icon-button"
                        aria-label={`Изменить запись ${row.values[0]}`}
                        onClick={() => startEdit(row)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Удалить запись ${row.values[0]}`}
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
              )}
            />
          </table>
        </HorizontalTableScroll>
        {list.ready && !list.loading && !list.error && !list.items.length && (
          <Empty title="Записи не найдены">
            {query || level ? (
              <>
                <p>Измените фильтры или добавьте запись.</p>
                <button
                  className="button secondary"
                  onClick={() => setParams({})}
                >
                  Сбросить фильтры
                </button>
              </>
            ) : (
              "Нажмите «Добавить», чтобы внести сведения в таблицу."
            )}
          </Empty>
        )}
      </div>

      {edit && (
        <Modal
          wide
          title={fresh ? "Новая запись" : "Редактирование записи"}
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
                form="general-data-edit"
              >
                Сохранить
              </button>
            </>
          }
        >
          <form
            id="general-data-edit"
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(edit);
            }}
          >
            {isMatrix && (
              <Field label="Уровень обучения" required>
                <RemoteSelect
                  source="levels"
                  required
                  disabled={busy}
                  aria-label="Уровень обучения"
                  value={edit.level}
                  onChange={(e) => setEdit({ ...edit, level: e.target.value })}
                />
              </Field>
            )}
            <div className="form-grid">
              {section.columns.map((column, index) => (
                <Field key={column} label={column} required={required(index)}>
                  <textarea
                    disabled={busy}
                    required={required(index)}
                    aria-label={column}
                    rows={4}
                    value={edit.values[index] ?? ""}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        values: edit.values.map((value, i) =>
                          i === index ? e.target.value : value,
                        ),
                      })
                    }
                  />
                </Field>
              ))}
            </div>
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
          onConfirm={() => void mutate(remove, true)}
        >
          <span>{remove.values[0]}</span>
          <br />
          <span>Используемые записи удалить нельзя.</span>
          {error && (
            <span className="form-error" role="alert">
              {error}
            </span>
          )}
        </Confirm>
      )}
    </>
  );
}
