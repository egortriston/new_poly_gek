import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Database, Plus, Star, RefreshCw } from "lucide-react";
import { api } from "../api";
import { useStore } from "../store";
import { PageTitle } from "../components/PageTitle";
import { AppSelect } from "../components/AppSelect";
import { Field, Modal } from "../components/ui";

type Entry = {
  id: string;
  name: string;
  database: string;
  academicYear: string;
  status: "ready" | "copying" | "failed";
  phase?: string;
  sourceId?: string;
};
type Registry = { defaultId: string; databases: Entry[] };
export function Databases() {
  const { databases: session, notify, refreshDatabases } = useStore();
  const [data, setData] = useState<Registry | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    database: string;
    period: string;
    sourceId: string;
    makeDefault: boolean;
  } | null>(null);
  const reload = async () => {
    try {
      setData(await api<Registry>("/databases"));
      await refreshDatabases();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void reload();
  }, []);
  const copying = data?.databases.some((row) => row.status === "copying");
  useEffect(() => {
    if (!copying) return;
    const timer = setInterval(() => void reload(), 3000);
    return () => clearInterval(timer);
  }, [copying]);
  const makeDefault = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      setData(await api<Registry>("/databases/default", { id }));
      notify("База по умолчанию изменена");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    if (!form || busy) return;
    setBusy(true);
    setFormError("");
    try {
      await api("/databases/create", form);
      setForm(null);
      notify("Создание копии запущено");
      await reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-enter hub-page">
      <div className="hub-welcome">
        <PageTitle>Управление базами</PageTitle>
        <p>Базы учебных периодов и создание копий.</p>
      </div>
      <div className="database-guide">
        <Database size={22} />
        <p>
          База по умолчанию открывается при входе. Выбор в текущей сессии
          сохраняется до выхода. Архив общий для всех баз.
        </p>
      </div>
      <div className="oop-data-actions">
        <span className="muted">
          {data ? `Баз: ${data.databases.length}` : "Загрузка…"}
        </span>
        <button
          className="button primary"
          disabled={!data || copying || busy}
          onClick={() => {
            setFormError("");
            setForm({
              name: "",
              database: "",
              period: "",
              sourceId: session?.selectedId ?? data!.defaultId,
              makeDefault: false,
            });
          }}
        >
          <Plus size={16} />
          Создать базу
        </button>
      </div>
      {error && (
        <div className="scope-note" role="alert">
          {error}
          <button className="button secondary" onClick={() => void reload()}>
            <RefreshCw size={16} />
            Повторить
          </button>
        </div>
      )}
      <div className="people-table-shell">
        <div className="people-table-scroll">
          <table className="people-table database-table">
            <thead>
              <tr>
                <th>База данных</th>
                <th>Учебный период</th>
                <th>Состояние</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {data?.databases.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <span className="database-technical">{row.database}</span>
                    {row.id === session?.selectedId && (
                      <span className="database-current">
                        Открыта в этой сессии
                      </span>
                    )}
                  </td>
                  <td>{row.academicYear}</td>
                  <td>
                    <span
                      className={`badge ${row.status === "ready" ? "ready" : "draft"}`}
                    >
                      <span />
                      {row.status === "ready"
                        ? "Доступна"
                        : row.status === "copying"
                          ? "Создаётся"
                          : "Ошибка создания"}
                    </span>
                    {row.phase && row.status !== "ready" && (
                      <span className="database-technical">{row.phase}</span>
                    )}
                  </td>
                  <td>
                    {row.id === data.defaultId ? (
                      <span className="database-default">
                        <Star size={15} fill="currentColor" />
                        По умолчанию
                      </span>
                    ) : row.status === "ready" ? (
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => void makeDefault(row.id)}
                      >
                        <Star size={15} />Сделать по умолчанию
                      </button>
                    ) : (
                      <span className="muted">Недоступна для выбора</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {form && (
        <Modal
          title="Создать базу на основе копии"
          wide
          onClose={() => {
            if (!busy) setForm(null);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setForm(null)}
              >
                Отмена
              </button>
              <button
                className="button primary"
                type="submit"
                form="database-create"
                disabled={busy}
              >
                {busy ? "Запуск…" : "Создать копию"}
              </button>
            </>
          }
        >
          <form
            id="database-create"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <fieldset className="database-fields" disabled={busy}>
              <div className="form-grid">
                <Field label="Название" required>
                  <input
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Например, Образовательный процесс 2027/2028"
                  />
                </Field>
                <Field
                  label="Имя базы PostgreSQL"
                  required
                  hint="Латинские строчные буквы, цифры и подчёркивание."
                >
                  <input
                    required
                    pattern="[a-z][a-z0-9_]{0,62}"
                    maxLength={63}
                    value={form.database}
                    onChange={(e) =>
                      setForm({ ...form, database: e.target.value })
                    }
                    placeholder="polytech_2027_2028"
                  />
                </Field>
                <Field label="Учебный период" required>
                  <AppSelect
                    aria-label="Учебный период"
                    required
                    value={form.period}
                    onChange={(e) =>
                      setForm({ ...form, period: e.target.value })
                    }
                  >
                    <option value="">Выберите учебный период</option>
                    {Array.from(
                      new Set([
                        ...Array.from({ length: 12 }, (_, i) => {
                          const year = new Date().getFullYear() - 2 + i;
                          return `${year}/${year + 1}`;
                        }),
                        ...(data?.databases.map((row) => row.academicYear) ??
                          []),
                      ]),
                    )
                      .sort()
                      .map((period) => (
                        <option key={period} value={period}>
                          {period}
                        </option>
                      ))}
                  </AppSelect>
                </Field>
                <Field label="Создать на основе" required>
                  <AppSelect
                    aria-label="Исходная база"
                    value={form.sourceId}
                    onChange={(e) =>
                      setForm({ ...form, sourceId: e.target.value })
                    }
                  >
                    {data?.databases
                      .filter((row) => row.status === "ready")
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {`${row.name} ${row.academicYear}`}
                        </option>
                      ))}
                  </AppSelect>
                </Field>
              </div>
              <label className="database-checkbox">
                <input
                  type="checkbox"
                  checked={form.makeDefault}
                  onChange={(e) =>
                    setForm({ ...form, makeDefault: e.target.checked })
                  }
                />
                Использовать по умолчанию после создания
              </label>
            </fieldset>
            <p className="muted">
              Все данные исходной базы будут скопированы. Комиссии и статусы
              автоматически не очищаются.
            </p>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}

export function DatabaseSwitch() {
  const { id = "" } = useParams();
  const { switchDatabase, databases } = useStore();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (databases?.selectedId === id) {
      navigate("/", { replace: true });
      return;
    }
    void switchDatabase(id)
      .then(() => navigate("/", { replace: true }))
      .catch((e) => setError(e.message));
  }, [id, databases, switchDatabase, navigate]);
  return (
    <section className="scope-note">
      <h1>{error ? "Не удалось переключить базу" : "Переключение базы…"}</h1>
      {error && (
        <>
          <p role="alert">{error}</p>
          <button
            className="button secondary"
            onClick={() => navigate("/", { replace: true })}
          >
            На главную
          </button>
        </>
      )}
    </section>
  );
}
