import { useState } from "react";
import type { Person } from "../data/model";
import { Field, Modal } from "./ui";
import { AppSelect } from "./AppSelect";
import { displayPersonDate, savePersonDate } from "../data/personDate";
export function ExternalPersonEditor({
  person,
  onSave,
  onClose,
}: {
  person: Person;
  onSave: (person: Person) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    ...person,
    degree: person.degree === "—" ? "" : person.degree,
    rank: person.rank === "—" ? "" : person.rank,
    birthDate: displayPersonDate(person.birthDate),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={person.kind === 'external' ? 'Редактирование внешнего члена ГЭК' : 'Редактирование сведений председателя'}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <button
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="button primary"
            disabled={busy}
            type="submit"
            form="external-person-edit"
          >
            Сохранить
          </button>
        </>
      }
    >
      <form
        id="external-person-edit"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          if (!draft.name.trim()) {
            setError("Укажите ФИО");
            return;
          }
          setBusy(true);
          setError("");
          try {
            await onSave({
              ...draft,
              birthDate: savePersonDate(draft.birthDate),
              name: draft.name.trim(),
              initials: draft.name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((n) => n[0])
                .join(""),
            });
            onClose();
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {(
          [
            ["name", "ФИО"],
            ["organization", "Организация"],
            ["inn", "ИНН организации"],
            ["position", "Должность"],
            ["email", "Электронная почта"],
            ["phone", "Телефон"],
            ["birthDate", "Дата рождения"],
            ["academicTitle", "Академическое звание"],
            ["degree", "Учёная степень"],
            ["rank", "Учёное звание"],
          ] as const
        ).filter(([key]) => key !== 'inn' || person.kind === 'external').map(([key, label]) => (
          <Field key={key} label={label} required={key === "name"}>
            <input
              disabled={busy}
              aria-label={label}
              required={key === "name"}
              value={draft[key] ?? ""}
              type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
              pattern={key === "inn" ? "[0-9]{10}([0-9]{2})?" : key === "phone" ? "\\+7[0-9]{10}" : key === "birthDate" ? "[0-9]{2}\\.[0-9]{2}\\.[0-9]{4}" : undefined}
              placeholder={key === "birthDate" ? "ДД.ММ.ГГГГ" : key === "phone" ? "+7XXXXXXXXXX" : key === "organization" ? "Полное наименование организации по лицензии; допускается сокращение правовой формы" : key === "position" ? "Одна основная должность — точно по записи в трудовой книжке" : undefined}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </Field>
        ))}
        <Field label="Пол"><AppSelect aria-label="Пол" value={draft.gender ?? ""} onChange={(e) => setDraft({ ...draft, gender: e.target.value })}><option value="">Не указан</option><option value="male">Мужской</option><option value="female">Женский</option></AppSelect></Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
