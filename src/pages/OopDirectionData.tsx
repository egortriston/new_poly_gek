import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Layers3,
  ListChecks,
  BriefcaseBusiness,
  Boxes,
  Link2,
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

const base = "/oop/data/directions";
export const directionSections = [
  {
    id: "areas",
    title: "Сферы в областях ПД",
    description:
      "Области профессиональной деятельности и сферы работы выпускников.",
    icon: Layers3,
    columns: ["Область ПД", "Сфера"],
  },
  {
    id: "tasks",
    title: "Задачи ПД",
    description:
      "Типы задач и задачи профессиональной деятельности по направлениям.",
    icon: BriefcaseBusiness,
    columns: ["Тип задачи ПД", "Задача профессиональной деятельности"],
  },
  {
    id: "objects",
    title: "Объекты ПД",
    description:
      "Объекты и области знания, связанные с типами задач профессиональной деятельности.",
    icon: Boxes,
    columns: ["Тип задачи ПД", "Объект или область знания"],
  },
  {
    id: "standards",
    title: "Связь проф. стандартов и НП",
    description:
      "Профессиональные стандарты, относящиеся к направлению подготовки.",
    icon: Link2,
    columns: ["Профессиональный стандарт"],
  },
  {
    id: "pk",
    title: "Матрица ПК СУОС",
    description:
      "Профессиональные компетенции и индикаторы достижения для раздела 8.3 ООП.",
    icon: Table2,
    columns: [
      "Задача ПД",
      "Объект или область знания",
      "Категория ПК",
      "Код и наименование ПК",
      "Индикаторы достижения",
      "Основание",
    ],
  },
  {
    id: "opk",
    title: "Матрица ОПК",
    description: "Общепрофессиональные компетенции и индикаторы их достижения.",
    icon: GraduationCap,
    columns: oopTables.opk.columns,
  },
];
type Entry = {
  id: string;
  directionId: string;
  directionName: string;
  labels: string[];
  version: string;
  values: string[];
};

export function OopDirectionData() {
  const { table } = useParams();
  const section = directionSections.find((item) => item.id === table);
  return (
    <div className="page-enter hub-page">
      <Link className="text-button" to={table ? base : "/oop/data"}>
        {table ? "Исходные данные по направлениям" : "Ввод исходных данных"} /
      </Link>
      <div className="hub-welcome">
        <PageTitle>
          {section?.title ??
            "Исходные данные для формирования сведений по направлениям подготовки"}
        </PageTitle>
        <p>
          {section?.description ??
            "Сферы, задачи, объекты профессиональной деятельности и матрицы компетенций."}
        </p>
      </div>
      {!table ? (
        <div className="people-hub-grid two">
          {directionSections.map((item) => (
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
        <DirectionTable key={table} section={section} />
      ) : (
        <Empty title="Таблица не найдена" />
      )}
    </div>
  );
}

function DirectionTable({
  section,
}: {
  section: (typeof directionSections)[number];
}) {
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  const [edit, setEdit] = useState<Entry | null>(null);
  const [fresh, setFresh] = useState(false);
  const [remove, setRemove] = useState<Entry | null>(null);
  const [error, setError] = useState("");
  const { notify } = useStore();
  const isMatrix = section.id === "pk" || section.id === "opk";
  const referenceIndexes =
    section.id === "opk" ? [] : section.id === "pk" ? [0, 1] : [0];
  const query = params.get("q") ?? "";
  const direction = params.get("direction") ?? "";
  const settled = useDebounced(query);
  const endpoint = `/oop/directions/${section.id}`;
  const path = `${endpoint}/list?${new URLSearchParams({ q: settled, direction })}`;
  const list = useProgressiveList<Entry>(path, "id");
  const required = (index: number) =>
    section.id === "pk"
      ? index === 3
      : section.id === "opk"
        ? index === 1
        : true;
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
            directionId: direction,
            directionName: "",
            labels: [],
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
            ? "Сведения используются при формировании ООП выбранного направления."
            : "Сведения по направлениям подготовки."}
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
          {
            <RemoteSelect
              source="directions"
              aria-label="Фильтр направления подготовки"
              placeholder="Все направления"
              value={direction}
              onChange={(e) => setFilter("direction", e.target.value)}
            />
          }
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
                <th>Направление подготовки</th>
                {section.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>Действия</th>
              </tr>
            </thead>
            <ProgressiveRows
              rows={list.items}
              rowKey={(row) => row.id}
              columns={section.columns.length + 2}
              resetKey={path}
              hasMore={list.hasMore}
              loading={list.loading}
              error={list.error}
              onMore={() =>
                void (list.error ? list.retry() : list.more()).catch(() => {})
              }
              renderRow={(row) => (
                <tr>
                  <td>{row.directionName || "Не указано"}</td>
                  {section.columns.map((column, index) => (
                    <td key={column}>{row.labels[index] || "—"}</td>
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
            {query || direction ? (
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
            {
              <Field label="Направление подготовки" required>
                <RemoteSelect
                  source="directions"
                  required
                  disabled={busy}
                  aria-label="Направление подготовки"
                  value={edit.directionId}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      directionId: e.target.value,
                      values:
                        section.id === "pk"
                          ? edit.values.map((value, i) => (i < 2 ? "" : value))
                          : edit.values,
                    })
                  }
                />
              </Field>
            }
            <div className="form-grid">
              {section.columns.map((column, index) => (
                <Field key={column} label={column} required={required(index)}>
                  {referenceIndexes.includes(index) ? (
                    <RemoteSelect
                      source="directions"
                      key={`${index}-${edit.directionId}`}
                      endpoint={`${endpoint}/options/${index}?direction=${encodeURIComponent(edit.directionId)}`}
                      aria-label={column}
                      required={required(index)}
                      disabled={busy || !edit.directionId}
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
                  ) : (
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
                  )}
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
