import { useState } from "react";
import type { Person } from "../data/model";

import { Field, Modal } from "./ui";
import { RemoteSelect } from "./RemoteSelect";
import { AppSelect } from "./AppSelect";
import type { Entry } from "../pages/PeopleTable";
export function AddPersonEntry({
  category,
  schools,
  onAdd,
  onClose,
}: {
  category: string;
  schools: { id: string; name: string }[];
  onAdd: (entry: Entry) => Promise<void>;
  onClose: () => void;
}) {
  const external = category === "external";
  const [personId, setPersonId] = useState("");
  const [sphere, setSphere] = useState("");
  const [school, setSchool] = useState("");
  const [values, setValues] = useState({
    name: "",
    organization: "",
    position: "",
    degree: "",
    rank: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    let person: Person | undefined;
    if (external) {
      if (!values.name.trim()) {
        setError("Укажите ФИО");
        return;
      }
      person = {
        id: "",
        name: values.name.trim(),
        organization: values.organization.trim(),
        position: values.position.trim(),
        degree: values.degree.trim() || "—",
        rank: values.rank.trim() || "—",
        kind: "external",
        color: "sage",
        initials: values.name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((n) => n[0])
          .join(""),
      };
    } else {
      if (!personId || !sphere || (category === "chairmen" && !school)) {
        setError(
          "Выберите человека, сферу деятельности и высшую школу, если она требуется.",
        );
        return;
      }
    }
    const row: Entry = {
      id: "",
      personId: external ? person!.id : personId,
      person: person!,
      sphere: (sphere || "Бизнес") as Entry["sphere"],
      schoolIds: school ? [school] : [],
      values: {},
    };
    setBusy(true);
    setError("");
    try {
      await onAdd(row);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={
        external
          ? "Добавить внешнего члена ГЭК"
          : category === "complex"
            ? "Добавить председателя комплексной ГЭК"
            : "Добавить председателя ГЭК"
      }
      subtitle={
        external
          ? "Сведения об участнике из внешней организации"
          : "После добавления откроется профессиональная карточка"
      }
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
            form="add-person-entry"
            type="submit"
          >
            {external ? "Добавить" : "Добавить и заполнить"}
          </button>
        </>
      }
    >
      <form
        id="add-person-entry"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {external ? (
          Object.entries({
            name: "ФИО",
            organization: "Организация",
            position: "Должность",
            degree: "Учёная степень",
            rank: "Учёное звание",
          }).map(([key, label]) => (
            <Field key={key} label={label} required={key === "name"}>
              <input
                disabled={busy}
                aria-label={label}
                required={key === "name"}
                value={values[key as keyof typeof values]}
                onChange={(e) => {
                  setValues({ ...values, [key]: e.target.value });
                  setError("");
                }}
              />
            </Field>
          ))
        ) : (
          <>
            <Field label="Председатель" required>
              <RemoteSelect
                source="chairmancandidates"
                disabled={busy}
                aria-label="Председатель"
                required
                value={personId}
                onChange={(e) => {
                  setPersonId(e.target.value);
                  setError("");
                }}
                placeholder="Выберите человека"
              />
            </Field>
            <p className="field-hint">
              Человек не может одновременно быть в карточках председателей ГЭК
              и председателей комплексных ГЭК.
            </p>
            <Field label="Сфера деятельности" required>
              <AppSelect
                disabled={busy}
                aria-label="Сфера деятельности"
                required
                value={sphere}
                onChange={(e) => {
                  setSphere(e.target.value);
                  setError("");
                }}
              >
                <option value="">Выберите сферу</option>
                <option>Образование</option>
                <option>Бизнес</option>
              </AppSelect>
            </Field>
            {category === "chairmen" ? (
              <Field label="Высшая школа" required>
                <AppSelect
                  disabled={busy}
                  aria-label="Высшая школа"
                  required
                  value={school}
                  onChange={(e) => {
                    setSchool(e.target.value);
                    setError("");
                  }}
                >
                  <option value="">Выберите высшую школу</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </AppSelect>
              </Field>
            ) : (
              <p className="field-hint">
                Высшие школы можно выбрать следующим шагом в карточке
                комплексной ГЭК.
              </p>
            )}
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
