import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBlocker } from "react-router-dom";
import { Check, List, Pencil, ChevronUp } from "lucide-react";
import { Field, Modal, Confirm } from "./ui";
import { OopFormationMatrix, type FormationRow } from "./OopFormationMatrix";
import { api } from "../api";
import { type CatalogRow } from "../data/catalog";
import { type OopDraft } from "../data/oopForm";
import template from "../data/oopTemplate.json";
import { useStore } from "../store";

const sections = [
  ["title", "Титульный лист"],
  ["general", "1. Общие положения"],
  ["legal", "2. Нормативно-правовая база"],
  ["purpose", "3. Цели, задачи и направленность"],
  ["duration", "4. Сроки освоения"],
  ["workload", "5. Трудоёмкость"],
  ["requirements", "6. Требования к уровню подготовки"],
  ["profession", "7. Профессиональная деятельность"],
  ["results", "8. Результаты освоения"],
  ["resources", "9. Ресурсное обеспечение"],
  ["plan", "Учебный план"],
  ["calendar", "Календарный учебный график"],
];
const formKeys: Record<string, string> = {
  очная: "o",
  "очно-заочная": "oz",
  заочная: "z",
};
type FormationData = {
  version: string;
  draft: OopDraft;
  program: CatalogRow;
  direction: CatalogRow;
  level: CatalogRow;
  signature: CatalogRow;
  options: Record<string, FormationRow[]>;
  educationForms: CatalogRow[];
};
export function OopFormation({ programId }: { programId: string }) {
  const [data, setData] = useState<FormationData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData(null);
    api<FormationData>(
      "/oop/formation?program=" + encodeURIComponent(programId),
      undefined,
      controller.signal,
    )
      .then(setData)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [programId, attempt]);
  if (error)
    return (
      <div className="scope-note">
        <p className="form-error" role="alert">
          {error}
        </p>
        <button
          className="button secondary"
          onClick={() => setAttempt((v) => v + 1)}
        >
          Повторить загрузку
        </button>
      </div>
    );
  if (!data) return <p role="status">Загрузка образовательной программы…</p>;
  return <FormationEditor initial={data} programId={programId} />;
}
function FormationEditor({
  initial,
  programId,
}: {
  initial: FormationData;
  programId: string;
}) {
  const [server, setServer] = useState(initial);
  const program = server.program,
    direction = server.direction;
  const [draft, setDraft] = useState(initial.draft);
  const baseline = useRef(JSON.stringify(initial.draft));
  const dirty = JSON.stringify(draft) !== baseline.current;
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<"direction" | "program" | null>(null);
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [statusChange, setStatusChange] = useState<string | null>(null);
  const { notify, user } = useStore();
  const readOnly = user?.role === "rop" && server.draft.status === "Утверждён";
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function value(key: string) {
    return draft.values[key] ?? "";
  }
  function update(key: string, v: string) {
    setDraft((d) => ({ ...d, values: { ...d.values, [key]: v } }));
  }
  async function persist(next: OopDraft = draft) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<FormationData>("/oop/formation", {
        id: programId,
        version: server.version,
        draft: next,
      });
      baseline.current = JSON.stringify(result.draft);
      setServer(result);
      setDraft(result.draft);
      notify("ООП сохранена");
      return true;
    } catch (reason) {
      setError((reason as Error).message);
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const defaults: Record<string, string> = {
    ...server.level,
    number_direction: direction?.number_direction ?? "—",
    name_direction: direction?.name_direction ?? "—",
    id_program: program.id_program,
    name_program: program.name_program,
    chief_program: program.chief_program,
    qualification: server.level.level_name ?? "",
    ...Object.fromEntries(
      server.educationForms.map((f) => [
        "period_" + formKeys[f.name_education_form],
        f.period_education ?? "",
      ]),
    ),
  };
  const resolved = (key: string) => value(key) || defaults[key] || "________";
  const fill = (text: string) =>
    text.replace(/\{\{([^}]+)\}\}/g, (_, key) => resolved(key));
  const paragraphs = (prefix: string) =>
    Object.entries(template).find(([key]) => key.startsWith(prefix))?.[1] ?? [];
  const prose = (items: string[]) =>
    items.map((p, i) => <p key={i}>{fill(p)}</p>);
  const input = (key: string, label: string, type = "text") => (
    <Field label={label}>
      <input
        aria-label={label}
        type={type === "date" ? "text" : type}
        value={value(key)}
        onChange={(e) => update(key, e.target.value)}
      />
    </Field>
  );
  const matrix = (kind: string) => {
    const derivedTypes = Array.from(
      new Set(
        (draft.tables.tasks ?? []).map((row) => row.values[0]).filter(Boolean),
      ),
    ).map((name, i) => ({ id: String(i), values: [name] }));
    return (
      <OopFormationMatrix
        kind={kind}
        rows={kind === "types" ? derivedTypes : (draft.tables[kind] ?? [])}
        options={server.options[kind]}
        readOnly={
          readOnly ||
          kind === "types" ||
          (["uk", "opk"].includes(kind) && user?.role !== "admin")
        }
        taskOptions={server.options.tasks}
        objectOptions={server.options.objects}
        onChange={(rows) =>
          setDraft((d) => ({ ...d, tables: { ...d.tables, [kind]: rows } }))
        }
      />
    );
  };
  const section = (id: string, title: string, children: ReactNode) => (
    <details className="oop-chapter" id={"oop-" + id} open>
      <summary>{title}</summary>
      <div className="oop-chapter-body">
        {children}
        <a className="oop-to-top" href="#oop-form-top">
          <ChevronUp size={14} />
          Вверх
        </a>
      </div>
    </details>
  );
  function openMeta(kind: "direction" | "program") {
    setMeta(
      Object.fromEntries(
        (kind === "direction"
          ? ["number_direction", "name_direction"]
          : ["id_program", "name_program", "chief_program"]
        ).map((k) => [k, value(k) || defaults[k] || ""]),
      ),
    );
    setEditing(kind);
  }
  return (
    <div className="oop-formation" id="oop-form-top">
      <div className="oop-savebar">
        <div>
          <strong>
            {program.id_program} · {program.name_program}
          </strong>
          <small>
            {dirty ? "Есть несохранённые изменения" : "Сохранённые сведения"} ·{" "}
            {draft.status}
          </small>
        </div>
        <button
          className="button primary"
          disabled={busy || readOnly}
          onClick={() => void persist()}
        >
          <Check size={16} />
          Сохранить
        </button>
      </div>

      {readOnly && (
        <p className="info-note">
          ООП утверждена. Для редактирования верните её в черновик.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="oop-form-layout">
        <aside className="oop-contents">
          <h3>
            <List size={17} />
            Содержание
          </h3>
          {sections.map(([id, title]) => (
            <a
              key={id}
              href={"#oop-" + id}
              onClick={() => {
                const node = document.getElementById("oop-" + id);
                if (node instanceof HTMLDetailsElement) node.open = true;
              }}
            >
              {title}
            </a>
          ))}
        </aside>
        <fieldset
          className="oop-chapters oop-editor-fields"
          disabled={busy || readOnly}
        >
          {section(
            "title",
            "ТИТУЛЬНЫЙ ЛИСТ",
            <>
              <div className="oop-title-sheet">
                <div className="oop-university">
                  <strong>
                    федеральное государственное автономное образовательное
                    учреждение
                    <br />
                    высшего образования
                    <br />
                    «Санкт-Петербургский политехнический университет Петра
                    Великого»
                  </strong>
                </div>
                <div className="oop-approval-grid">
                  <div>
                    <strong>УТВЕРЖДЕНА</strong>
                    <p>Решением Ученого совета СПбПУ</p>
                    {input("date_approved", "Дата утверждения", "date")}
                    {input("protocol_approved", "Номер протокола утверждения")}
                  </div>
                  <div>
                    <strong>УТВЕРЖДАЮ</strong>
                    <p>
                      Проректор по образовательной
                      <br />
                      деятельности _______{" "}
                      {server.signature.prorector_name || "Л.В. Панкова"}
                    </p>
                    {input("prorector", "Дата подписи проректора", "date")}
                  </div>
                </div>
                <div className="oop-title-center">
                  <h2>
                    ОСНОВНАЯ ОБРАЗОВАТЕЛЬНАЯ ПРОГРАММА
                    <br />
                    ВЫСШЕГО ОБРАЗОВАНИЯ
                  </h2>
                  <p>по направлению подготовки (специальности)</p>
                  {[
                    [
                      resolved("number_direction") +
                        " " +
                        resolved("name_direction"),
                      "код и наименование направления подготовки (специальности)",
                    ],
                    [
                      resolved("id_program") + " " + resolved("name_program"),
                      "направленность (профиль / специализация)",
                    ],
                    [resolved("qualification"), "квалификация выпускника"],
                    [draft.forms.join(", ") || "—", "форма обучения"],
                  ].map(([v, label]) => (
                    <div className="oop-title-line" key={label}>
                      <strong>{v}</strong>
                      <small>{label}</small>
                    </div>
                  ))}
                </div>
                <div className="oop-signatures">
                  {[
                    [
                      "Руководитель образовательной программы по направлению подготовки " +
                        resolved("number_direction"),
                      resolved("chief_program"),
                    ],
                    [
                      server.signature.chief_position || "Директор ИПМЭиТ",
                      server.signature.chief || "В.Э. Щепинин",
                    ],
                    ["Руководитель ДООП", "Н.Ю. Гращенко"],
                  ].map(([role, name]) => (
                    <div key={role}>
                      <span>{role}</span>
                      <span>
                        ____________<small>подпись</small>
                      </span>
                      <span>
                        {name}
                        <small>инициалы, фамилия</small>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="form-grid">
                  <Field label="Рецензент: должность, место работы">
                    <textarea
                      aria-label="Рецензент: должность, место работы"
                      rows={3}
                      value={value("reviewer")}
                      onChange={(e) => update("reviewer", e.target.value)}
                    />
                  </Field>
                  {input("r_phio", "Рецензент: инициалы, фамилия")}
                  {input("date_considered", "Дата рассмотрения", "date")}
                  {input("protocol_considered", "Номер протокола рассмотрения")}
                </div>
                <div className="oop-city">
                  Санкт-Петербург —{" "}
                  <input
                    aria-label="Год титульного листа"
                    placeholder="Год"
                    value={value("year")}
                    onChange={(e) => update("year", e.target.value)}
                  />
                </div>
              </div>
            </>,
          )}
          {section(
            "general",
            "1. ОБЩИЕ ПОЛОЖЕНИЯ",
            <>
              {prose(
                direction?.id_level === "2"
                  ? template.generalMaster
                  : template.general,
              )}
              <div className="button-row">
                <button
                  disabled={user?.role !== "admin"}
                  className="button secondary"
                  onClick={() => openMeta("direction")}
                >
                  <Pencil size={15} />
                  Редактировать информацию о направлении подготовки
                </button>
                <button
                  className="button secondary"
                  onClick={() => openMeta("program")}
                >
                  <Pencil size={15} />
                  Редактировать информацию об ООП
                </button>
              </div>
            </>,
          )}
          {section(
            "legal",
            "2. НОРМАТИВНО-ПРАВОВАЯ БАЗА ДЛЯ РАЗРАБОТКИ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ",
            <>
              {prose(
                paragraphs("2.").filter(
                  (p) => !p.startsWith("Профессиональные стандарты"),
                ),
              )}
              {matrix("standards")}
            </>,
          )}
          {section(
            "purpose",
            "3. ЦЕЛИ, ЗАДАЧИ И НАПРАВЛЕННОСТЬ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ",
            <Field label="Цели, задачи и направленность программы">
              <textarea
                aria-label="Цели, задачи и направленность программы"
                rows={10}
                value={value("comp")}
                onChange={(e) => update("comp", e.target.value)}
              />
            </Field>,
          )}
          {section(
            "duration",
            "4. СРОКИ ОСВОЕНИЯ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ",
            <>
              {prose(paragraphs("4."))}
              <fieldset className="oop-forms">
                <legend>
                  Выбор форм обучения для образовательной программы
                </legend>
                {server.educationForms
                  .map((item) => item.name_education_form)
                  .map((form) => (
                    <label key={form}>
                      <input
                        type="checkbox"
                        checked={draft.forms.includes(form)}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            forms: e.target.checked
                              ? [...d.forms, form]
                              : d.forms.filter((f) => f !== form),
                          }))
                        }
                      />
                      {form}
                    </label>
                  ))}
              </fieldset>
              <div className="form-grid">
                {draft.forms.map((form) => (
                  <div key={form}>
                    <Field label={"Срок освоения: " + form}>
                      <input
                        readOnly
                        value={
                          defaults["period_" + formKeys[form]] || "Не указан"
                        }
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </>,
          )}
          {section(
            "workload",
            "5. ТРУДОЕМКОСТЬ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ",
            <>
              {prose(paragraphs("5."))}
              <div className="form-grid">
                {[
                  ["z", "Объём программы, з.е."],
                  ["z_year", "Объём за учебный год, з.е."],
                  ["z_speed", "Объём при ускоренном обучении, з.е."],
                ].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input readOnly value={server.level[key] ?? ""} />
                  </Field>
                ))}
              </div>
            </>,
          )}
          {section(
            "requirements",
            "6. ТРЕБОВАНИЯ К УРОВНЮ ПОДГОТОВКИ, НЕОБХОДИМОМУ ДЛЯ ОСВОЕНИЯ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ",
            <>
              {value("requirements") ? (
                <p style={{ whiteSpace: "pre-line" }}>
                  {value("requirements")}
                </p>
              ) : (
                <>
                  <p>
                    К освоению образовательных программ допускаются лица,
                    имеющие образование соответствующего уровня, подтвержденное
                    документом о среднем общем образовании или документом о
                    среднем профессиональном образовании, или документом о
                    высшем образовании и о квалификации.
                  </p>
                  <p>
                    Прием проводится в соответствии с Правилами приема на
                    обучение по программам бакалавриата, программам
                    специалитета, программам магистратуры в федеральное
                    государственное автономное образовательное учреждение
                    высшего образования «Санкт-Петербургский политехнический
                    университет Петра Великого» (далее – Правила приема СПбПУ).
                  </p>
                  <p>
                    Установление перечня и программ вступительных испытаний,
                    шкал оценивания их результатов и минимального количества
                    баллов, подтверждающего успешное прохождение вступительных
                    испытаний, особые права при приеме на обучение по программам
                    бакалавриата, учет индивидуальных достижений поступающих при
                    приеме на обучение, прием документов, необходимых для
                    поступления, вступительные испытания, проводимые СПбПУ
                    самостоятельно, особенности проведения вступительных
                    испытаний для лиц с ограниченными возможностями здоровья и
                    инвалидов, формирование списков поступающих и зачисление на
                    обучение, особенности организации целевого приема,
                    особенности проведения приема иностранных граждан и лиц без
                    гражданства определяются Правилами приема СПбПУ.
                  </p>
                </>
              )}
              <button
                disabled={user?.role !== "admin"}
                className="button secondary"
                onClick={() => openMeta("direction")}
              >
                Редактировать информацию о направлении подготовки
              </button>
            </>,
          )}
          {section(
            "profession",
            "7. ХАРАКТЕРИСТИКА ПРОФЕССИОНАЛЬНОЙ ДЕЯТЕЛЬНОСТИ ВЫПУСКНИКА",
            <>
              <p>
                Области и сферы профессиональной деятельности, типы задач,
                задачи и объекты профессиональной деятельности выпускников.
              </p>
              {matrix("areas")}
              {matrix("types")}
              {matrix("tasks")}
              {matrix("objects")}
            </>,
          )}
          {section(
            "results",
            "8. РЕЗУЛЬТАТЫ ОСВОЕНИЯ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ",
            <>
              <p>
                В результате освоения программы у выпускника должны быть
                сформированы универсальные, общепрофессиональные и
                профессиональные компетенции.
              </p>
              <h3>
                8.1. Универсальные компетенции выпускников и индикаторы их
                достижения
              </h3>
              {matrix("uk")}
              <h3>
                8.2. Общепрофессиональные компетенции выпускников и индикаторы
                их достижения
              </h3>
              {matrix("opk")}
              <h3>8.3. Профессиональные компетенции, устанавливаемые СУОС</h3>
              {matrix("pk")}
              <h3>
                8.4. Профессиональные компетенции, устанавливаемые разработчиком
                ООП
              </h3>
              <label className="oop-toggle">
                <input
                  type="checkbox"
                  checked={draft.display84}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, display84: e.target.checked }))
                  }
                />
                Отобразить матрицу ПК ООП в ОХОП
              </label>
              {!draft.display84 && (
                <p className="info-note">
                  Матрица исключена из ОХОП. Сведения сохранены и доступны для
                  редактирования.
                </p>
              )}
              {matrix("oop")}
            </>,
          )}
          {section(
            "resources",
            "9. ХАРАКТЕРИСТИКА РЕСУРСНОГО ОБЕСПЕЧЕНИЯ ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ",
            <>
              {["9.1.", "9.2.", "9.3.", "9.4."].map((prefix) => (
                <div key={prefix}>
                  <h3>
                    {Object.keys(template).find((k) => k.startsWith(prefix))}
                  </h3>
                  {prose(paragraphs(prefix))}
                  {prefix === "9.2." && (
                    <div className="form-grid">
                      {[
                        ["num_prof", "Научная и профильная деятельность, %"],
                        ["num_org", "Представители организаций, %"],
                        ["num_sci", "Работники со степенью или званием, %"],
                      ].map(([key, label]) => (
                        <Field key={key} label={label}>
                          <input
                            aria-label={label}
                            type="number"
                            min="0"
                            max="100"
                            value={value(key)}
                            onChange={(e) => update(key, e.target.value)}
                          />
                        </Field>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>,
          )}
          {(["plan", "calendar"] as const).map((key) =>
            section(
              key,
              key === "plan" ? "УЧЕБНЫЙ ПЛАН" : "КАЛЕНДАРНЫЙ УЧЕБНЫЙ ГРАФИК",
              <>
                {prose(
                  paragraphs(key === "plan" ? "УЧЕБНЫЙ ПЛАН" : "КАЛЕНДАРНЫЙ"),
                )}
                {draft.forms.map((form) => (
                  <Field
                    key={form}
                    label={
                      (key === "plan"
                        ? "Учебный план"
                        : "Календарный учебный график") +
                      " — " +
                      form
                    }
                  >
                    <textarea
                      aria-label={
                        (key === "plan"
                          ? "Учебный план"
                          : "Календарный учебный график") +
                        " — " +
                        form
                      }
                      rows={3}
                      placeholder="Ссылка или сведения из репозитория образовательных программ"
                      value={value(key + "_" + formKeys[form])}
                      onChange={(e) =>
                        update(key + "_" + formKeys[form], e.target.value)
                      }
                    />
                  </Field>
                ))}
              </>,
            ),
          )}
        </fieldset>
      </div>
      <div className="oop-bottom-actions">
        <span>Статус: {draft.status}</span>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            setStatusChange(
              draft.status === "Утверждён" ? "Черновик" : "Утверждён",
            )
          }
        >
          {draft.status === "Утверждён"
            ? "Отправить ООП на доработку"
            : "Утвердить ООП"}
        </button>
        <button
          className="button primary"
          disabled={busy || readOnly}
          onClick={() => void persist()}
        >
          <Check size={16} />
          Сохранить
        </button>
      </div>
      {editing && (
        <Modal
          wide
          title={
            editing === "direction"
              ? "Информация о направлении подготовки"
              : "Информация об ООП"
          }
          onClose={() => setEditing(null)}
          footer={
            <>
              <button
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Отмена
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setDraft((d) => ({ ...d, values: { ...d.values, ...meta } }));
                  setEditing(null);
                }}
              >
                Применить
              </button>
            </>
          }
        >
          <p className="info-note">
            {editing === "direction"
              ? "Изменения направления будут видны во всех связанных образовательных программах."
              : "Изменения сохраняются в сведениях выбранной образовательной программы."}
          </p>
          <div className="form-grid">
            {Object.keys(meta).map((key) => (
              <Field
                key={key}
                label={
                  (
                    {
                      number_direction: "Код направления",
                      name_direction: "Название направления",
                      qualification: "Квалификация выпускника",
                      requirements: "Требования к уровню подготовки",
                      z: "Объём программы, з.е.",
                      z_year: "Объём за год, з.е.",
                      z_speed: "Ускоренное обучение, з.е.",
                      extend: "Увеличение срока для лиц с ОВЗ",
                      id_program: "Код программы",
                      name_program: "Название программы",
                      chief_program: "Руководитель программы",
                    } as Record<string, string>
                  )[key]
                }
              >
                <textarea
                  rows={key === "requirements" ? 8 : 2}
                  value={meta[key]}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, [key]: e.target.value }))
                  }
                />
              </Field>
            ))}
          </div>
        </Modal>
      )}
      {statusChange && (
        <Confirm
          title="Изменить статус ООП?"
          confirmLabel="Подтвердить"
          onClose={() => setStatusChange(null)}
          onConfirm={() => {
            void persist({ ...draft, status: statusChange }).then((saved) => {
              if (saved) setStatusChange(null);
            });
          }}
        >
          Статус «{statusChange}» и текущие сведения будут сохранены для
          выбранной программы.
        </Confirm>
      )}
      {blocker.state === "blocked" && (
        <Confirm
          title="Изменения ещё не сохранены"
          confirmLabel="Уйти без сохранения"
          onClose={() => blocker.reset()}
          onConfirm={() => blocker.proceed()}
        >
          Сохраните ООП перед переходом к другой программе или странице.
        </Confirm>
      )}
    </div>
  );
}
