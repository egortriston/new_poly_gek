import { PageTitle } from "./PageTitle";
import { AppSelect } from "./AppSelect";
import { useEffect, useState, type ReactNode } from "react";
import { useBlocker } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  BookOpen,
  Building2,
  Check,
  FileText,
  GraduationCap,
  Printer,
  Save,
  UserRound,
} from "lucide-react";
import type { Entry } from "../pages/PeopleTable";
import { type Person } from "../data/model";
import { Avatar, Confirm, Field, SectionHeading } from "./ui";
export function ChairmanCard({
  entry,
  person,
  complex,
  schools,
  directions,
  programs,
  onChange,
  onArchive,
  onPrint,
  onSave,
  onBack,
}: {
  entry: Entry;
  person: Person & { missing?: boolean };
  complex: boolean;
  schools: { id: string; name: string }[];
  directions: { id_direction: string; number_direction: string; name_direction: string }[];
  programs: { id_mep: string; id_program: string; name_program: string; id_direction: string }[];
  onChange: (entry: Entry) => void;
  onArchive: () => Promise<void>;
  onPrint: () => void;
  onSave: () => Promise<Entry>;
  onBack: () => void;
}) {
  const [baseline, setBaseline] = useState(() => JSON.stringify(entry));
  const dirty = baseline !== JSON.stringify(entry);
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
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await onSave();
      setBaseline(JSON.stringify(saved));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    if (busy || archiving) return;
    setArchiving(true);
    setError("");
    try {
      await onArchive();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setArchiving(false);
    }
  };
  const input = (key: string, label: string, placeholder = "") => (
    <Field key={key} label={label}>
      <input
        aria-label={label}
        value={entry.values[key] ?? ""}
        placeholder={placeholder}
        onChange={(e) =>
          !busy &&
          onChange({
            ...entry,
            values: { ...entry.values, [key]: e.target.value },
          })
        }
      />
    </Field>
  );
  const section = (
    title: string,
    description: string,
    icon: ReactNode,
    children: ReactNode,
  ) => (
    <section className="form-section">
      <header>
        <span>{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
  const extra =
    entry.sphere === "Образование"
      ? [
          ["publications", "Публикации по программе"],
          ["lectures", "Лекции по программе"],
        ]
      : [
          ["type_activity", "Вид деятельности"],
          ["career_activity", "Род профессиональной деятельности кандидата"],
          ["candidate_is", "Кандидат является"],
        ];
  const directionIds = entry.directionIds ?? [];
  const programIds = entry.programIds ?? [];
  const selectedPrograms = programs.filter((program) =>
    programIds.includes(program.id_mep),
  );
  const availablePrograms = programs.filter(
    (program) =>
      !directionIds.length || directionIds.includes(program.id_direction),
  );
  const toggleDirection = (id: string, checked: boolean) => {
    const next = checked
      ? [...directionIds, id].slice(0, 4)
      : directionIds.filter((value) => value !== id);
    onChange({
      ...entry,
      directionIds: next,
      programIds: programIds.filter((programId) => {
        const program = programs.find((item) => item.id_mep === programId);
        return !program || !next.length || next.includes(program.id_direction);
      }),
    });
  };
  const toggleProgram = (id: string, checked: boolean) => {
    onChange({
      ...entry,
      programIds: checked
        ? [...programIds, id]
        : programIds.filter((value) => value !== id),
    });
  };
  return (
    <div className="page-enter detail-page chairman-card">
      <div className="breadcrumb">
        <button onClick={onBack}>
          <ArrowLeft size={14} />{" "}
          {complex ? "Председатели комплексных ГЭК" : "Председатели ГЭК"}
        </button>
        <span>/ Карточка</span>
      </div>
      <div className="page-heading detail-heading">
        <div>
          <div className="heading-eyebrow">ИСХОДНЫЕ ДАННЫЕ · ЛЮДИ</div>
          <PageTitle>Карточка председателя</PageTitle>
          <p>
            {complex ? "Комплексная ГЭК" : "ГЭК по направлению"} ·{" "}
            {entry.sphere}
          </p>
        </div>
        <button
          className="button primary"
          disabled={!dirty || busy}
          onClick={save}
        >
          <Check size={17} /> Сохранить
        </button>
      </div>
      <div className="detail-grid">
        <div className="detail-primary">
          <SectionHeading
            eyebrow="СВЕДЕНИЯ О ПРЕДСЕДАТЕЛЕ"
            title="Профессиональная карточка"
            description="Образование, научная квалификация и профессиональная деятельность."
          />
          <div className="profile-person">
            <Avatar person={person} />
            <div>
              <h3>{person.name}</h3>
              <p>
                {person.position} · {person.organization}
              </p>
            </div>
            <span className="subtle-pill">{entry.sphere}</span>
          </div>
          <div className="profile-form">
            {person.missing && (
              <p className="form-error" role="alert">
                У этой карточки отсутствует связанный участник. Сведения
                сохранены, но перед редактированием нужно уточнить, кому
                принадлежит карточка.
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {section(
              complex ? "Высшие школы" : "Высшая школа",
              "Принадлежность карточки председателя",
              <Building2 size={19} />,
              complex ? (
                <div className="school-checks">
                  {schools.map((s) => (
                    <label key={s.id}>
                      <input
                        type="checkbox"
                        checked={entry.schoolIds.includes(s.id)}
                        onChange={(e) =>
                          onChange({
                            ...entry,
                            schoolIds: e.target.checked
                              ? [...entry.schoolIds, s.id]
                              : entry.schoolIds.filter((id) => id !== s.id),
                          })
                        }
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              ) : (
                <Field label="Высшая школа">
                  <AppSelect
                    aria-label="Высшая школа"
                    value={entry.schoolIds[0] ?? ""}
                    onChange={(e) =>
                      onChange({ ...entry, schoolIds: [e.target.value] })
                    }
                  >
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </AppSelect>
                </Field>
              ),
            )}
            {section(
              "Направления и ООП",
              "Сведения для согласования списка председателей",
              <BookOpen size={18} />,
              <>
                <Field label={`Направления подготовки (${directionIds.length} из 4)`}>
                  <div className="school-checks chairman-scope-checks">
                    {directions.map((direction) => (
                      <label key={direction.id_direction}>
                        <input
                          type="checkbox"
                          checked={directionIds.includes(direction.id_direction)}
                          disabled={
                            !directionIds.includes(direction.id_direction) &&
                            directionIds.length >= 4
                          }
                          onChange={(event) =>
                            toggleDirection(
                              direction.id_direction,
                              event.target.checked,
                            )
                          }
                        />
                        {direction.number_direction} {direction.name_direction}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label={`Код и наименование ООП (${programIds.length})`}>
                  <div className="school-checks chairman-scope-checks">
                    {availablePrograms.map((program) => (
                      <label key={program.id_mep}>
                        <input
                          type="checkbox"
                          checked={programIds.includes(program.id_mep)}
                          onChange={(event) =>
                            toggleProgram(program.id_mep, event.target.checked)
                          }
                        />
                        {program.id_program} {program.name_program}
                      </label>
                    ))}
                    {!availablePrograms.length && (
                      <p className="field-hint">
                        Выберите направление, чтобы увидеть образовательные
                        программы.
                      </p>
                    )}
                  </div>
                </Field>
              </>,
            )}
            {section(
              "Образование",
              "Сведения в соответствии с документом об образовании",
              <GraduationCap size={19} />,
              <>
                {input(
                  "university",
                  "Учебное заведение",
                  "Полное наименование университета",
                )}
                {input("education", "Наименование образования")}
                {input(
                  "qualification",
                  "Специальность и квалификация",
                  "В соответствии с дипломом",
                )}
              </>,
            )}
            {section(
              "Учёная степень",
              person.degree,
              <BookOpen size={18} />,
              <div className="form-grid three">
                {input("diplomaSeries", "Серия диплома о степени")}
                {input("diplomaNumber", "Номер диплома")}
                {input("diplomaDate", "Дата диплома")}
              </div>,
            )}
            {section(
              "Учёное звание",
              person.rank,
              <FileText size={18} />,
              <>
                <div className="form-grid">
                  {input("department", "Кафедра")}
                  {input("speciality", "Научная специальность")}
                </div>
                <div className="form-grid three">
                  {input("certificateSeries", "Серия аттестата")}
                  {input("certificateNumber", "Номер аттестата")}
                  {input("certificateDate", "Дата аттестата")}
                </div>
                {input("honoraryTitle", "Почётное звание", "При наличии")}
              </>,
            )}
            {section(
              entry.sphere === "Образование"
                ? "Научная и преподавательская деятельность"
                : "Профессиональная деятельность",
              `Поля для сферы «${entry.sphere}»`,
              <UserRound size={18} />,
              extra.map(([key, label]) => (
                <Field key={key} label={label}>
                  <textarea
                    aria-label={label}
                    rows={4}
                    value={entry.values[key] ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...entry,
                        values: { ...entry.values, [key]: e.target.value },
                      })
                    }
                  />
                </Field>
              )),
            )}
          </div>
        </div>
        <aside className="detail-aside">
          <div className="completion-card">
            <span className="eyebrow">О КАРТОЧКЕ</span>
            <h3>{entry.sphere}</h3>
            <p>
              {entry.sphere === "Образование"
                ? "Публикации и лекции по образовательной программе."
                : "Вид деятельности, профессиональные обязанности и сведения о кандидате."}
            </p>
          </div>
              <div className="detail-summary">
            <h3>Сведения из справочника</h3>
            <dl>
              <div>
                <dt>Председатель</dt>
                <dd>{person.name}</dd>
              </div>
              <div>
                <dt>Тип</dt>
                <dd>{complex ? "Комплексная ГЭК" : "ГЭК по направлению"}</dd>
              </div>
              <div>
                <dt>Место работы</dt>
                <dd>{person.organization}</dd>
              </div>
              <div>
                <dt>Направления</dt>
                <dd>{directionIds.length || "Не выбраны"}</dd>
              </div>
              <div>
                <dt>ООП</dt>
                <dd>{selectedPrograms.length || "Не выбраны"}</dd>
              </div>
            </dl>
          </div>
          <div className="detail-summary chairman-actions">
            <h3>Действия</h3>
            <div className="button-column">
              <button className="button secondary" onClick={onPrint}>
                <Printer size={15} /> Перейти к печати
              </button>
              <button
                className="button primary"
                disabled={busy || archiving || person.missing}
                onClick={archive}
              >
                <Archive size={15} />
                {archiving ? "Открытие папки…" : "Папка архива"}
              </button>
            </div>
          </div>
        </aside>
      </div>
      {dirty && (
        <div className="save-bar">
          <span>
            <span className="unsaved-dot" />
            Есть несохранённые изменения
          </span>
          <div>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => onChange(JSON.parse(baseline))}
            >
              Отменить изменения
            </button>
            <button className="button primary" disabled={busy} onClick={save}>
              <Save size={16} /> Сохранить изменения
            </button>
          </div>
        </div>
      )}
      {blocker.state === "blocked" && (
        <Confirm
          title="Изменения ещё не сохранены"
          confirmLabel="Уйти без сохранения"
          onClose={() => blocker.reset()}
          onConfirm={() => blocker.proceed()}
        >
          Можно остаться и сохранить карточку или уйти без сохранения изменений.
        </Confirm>
      )}
    </div>
  );
}
