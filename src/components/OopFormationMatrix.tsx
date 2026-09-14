import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AppSelect } from "./AppSelect";
import { Field, Modal } from "./ui";
import { oopTables, type OopRow } from "../data/oopForm";
import { makeClientId } from "../utils/id";
import { clone } from "../data/model";

export type FormationRow = OopRow & {
  shared?: boolean;
  missing?: boolean;
  task?: string;
  object?: string;
};
export function OopFormationMatrix({
  kind,
  rows,
  options,
  onChange,
  readOnly = false,
  taskOptions = [],
  objectOptions = [],
}: {
  kind: string;
  rows: FormationRow[];
  options?: FormationRow[];
  onChange: (rows: FormationRow[]) => void;
  readOnly?: boolean;
  taskOptions?: FormationRow[];
  objectOptions?: FormationRow[];
}) {
  const schema = oopTables[kind];
  const [selection, setSelection] = useState("");
  const [edit, setEdit] = useState<FormationRow | null>(null);
  const [expanded, setExpanded] = useState(false);
  const linked = options !== undefined;
  const available =
    options?.filter((option) => !rows.some((row) => row.id === option.id)) ??
    [];
  const visible = expanded ? rows : rows.slice(0, 20);
  return (
    <div className="oop-matrix">
      <div className="oop-matrix-heading">
        <h3>
          {schema.title} <span className="muted">{rows.length}</span>
        </h3>
        {!readOnly && !linked && (
          <button
            type="button"
            className="button small secondary"
            onClick={() =>
              setEdit({
                id: makeClientId("new-"),
                values: schema.columns.map(() => ""),
                task: "",
                object: "",
              })
            }
          >
            <Plus size={15} />
            Добавить
          </button>
        )}
      </div>
      {!readOnly && linked && (
        <div className="table-toolbar">
          <AppSelect
            aria-label={"Выбор: " + schema.title}
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
          >
            <option value="">Выберите запись</option>
            {available.map((row) => (
              <option key={row.id} value={row.id}>
                {row.values.filter(Boolean).join(" · ")}
              </option>
            ))}
          </AppSelect>
          <button
            type="button"
            className="button secondary"
            disabled={!selection}
            onClick={() => {
              const item = available.find((row) => row.id === selection);
              if (item) onChange([...rows, item]);
              setSelection("");
            }}
          >
            <Plus size={15} />
            Добавить
          </button>
        </div>
      )}
      <div className="people-table-shell">
        <div className="people-table-scroll">
          <table className="people-table">
            <thead>
              <tr>
                {schema.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                {!readOnly && <th>Действия</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  {schema.columns.map((column, i) => (
                    <td key={column} style={{ whiteSpace: "pre-line" }}>
                      {row.values[i] || "—"}
                      {i === 0 && row.shared && (
                        <small className="muted"> Общая компетенция</small>
                      )}
                    </td>
                  ))}
                  {!readOnly && (
                    <td>
                      {!row.shared && (
                        <div className="button-row">
                          {!linked && (
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={"Изменить запись " + row.values[0]}
                              onClick={() => setEdit(clone(row))}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={"Убрать запись " + row.values[0]}
                            onClick={() =>
                              onChange(
                                rows.filter((item) => item.id !== row.id),
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="oop-empty">Сведения не заполнены.</p>}
        {rows.length > 20 && (
          <button
            type="button"
            className="text-button"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Свернуть" : "Показать все записи"}
          </button>
        )}
      </div>
      {edit && (
        <Modal
          wide
          title={schema.title}
          onClose={() => setEdit(null)}
          footer={
            <>
              <button
                className="button secondary"
                onClick={() => setEdit(null)}
              >
                Отмена
              </button>
              <button
                className="button primary"
                disabled={!edit.values.some((value) => value.trim())}
                onClick={() => {
                  onChange(
                    rows.some((row) => row.id === edit.id)
                      ? rows.map((row) => (row.id === edit.id ? edit : row))
                      : [...rows, edit],
                  );
                  setEdit(null);
                }}
              >
                Применить
              </button>
            </>
          }
        >
          {["uk", "opk"].includes(kind) && (
            <p className="info-note">
              Изменения этой матрицы относятся ко всем программам
              соответствующего уровня или направления.
            </p>
          )}
          <div className="form-grid">
            {kind === "oop" && (
              <>
                <Field label="Задача профессиональной деятельности">
                  <AppSelect
                    aria-label="Задача профессиональной деятельности"
                    value={edit.task ?? ""}
                    onChange={(e) => {
                      const row = taskOptions.find(
                        (r) => r.id === e.target.value,
                      );
                      setEdit({
                        ...edit,
                        task: e.target.value,
                        values: edit.values.map((v, i) =>
                          i === 0
                            ? (row?.values[0] ?? "")
                            : i === 1
                              ? (row?.values[1] ?? "")
                              : v,
                        ),
                      });
                    }}
                  >
                    <option value="">Не выбрана</option>
                    {taskOptions.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.values.join(" · ")}
                      </option>
                    ))}
                  </AppSelect>
                </Field>
                <Field label="Объект профессиональной деятельности">
                  <AppSelect
                    aria-label="Объект профессиональной деятельности"
                    value={edit.object ?? ""}
                    onChange={(e) => {
                      const row = objectOptions.find(
                        (r) => r.id === e.target.value,
                      );
                      setEdit({
                        ...edit,
                        object: e.target.value,
                        values: edit.values.map((v, i) =>
                          i === 2 ? (row?.values[1] ?? "") : v,
                        ),
                      });
                    }}
                  >
                    <option value="">Не выбран</option>
                    {objectOptions.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.values.join(" · ")}
                      </option>
                    ))}
                  </AppSelect>
                </Field>
              </>
            )}
            {schema.columns.map((column, i) =>
              kind === "oop" && i < 3 ? null : (
                <Field key={column} label={column}>
                  <textarea
                    aria-label={column}
                    rows={4}
                    value={edit.values[i] ?? ""}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        values: edit.values.map((v, j) =>
                          i === j ? e.target.value : v,
                        ),
                      })
                    }
                  />
                </Field>
              ),
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
