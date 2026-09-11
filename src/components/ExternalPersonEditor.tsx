import { useState } from "react";
import type { Person } from "../data/model";
import { Field, Modal } from "./ui";
export function ExternalPersonEditor({
  person,
  onSave,
  onClose,
}: {
  person: Person;
  onSave: (person: Person) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({ ...person });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Редактирование внешнего члена ГЭК"
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
            ["position", "Должность"],
            ["degree", "Учёная степень"],
            ["rank", "Учёное звание"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label} required={key === "name"}>
            <input
              disabled={busy}
              aria-label={label}
              required={key === "name"}
              value={draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </Field>
        ))}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
