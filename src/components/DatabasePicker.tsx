import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { AppSelect } from "./AppSelect";
import { Modal } from "./ui";

export function DatabasePicker() {
  const { databases } = useStore();
  const [target, setTarget] = useState("");
  const [stale, setStale] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const changed = () => setStale(true);
    window.addEventListener("database-changed", changed);
    return () => window.removeEventListener("database-changed", changed);
  }, []);
  return (
    <>
      <div className="database-picker">
        <AppSelect
          aria-label="База данных и учебный период"
          value={databases?.selectedId ?? ""}
          onChange={(e) => setTarget(e.target.value)}
        >
          {databases?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {`${item.name} ${item.academicYear}`}
            </option>
          ))}
        </AppSelect>
      </div>
      {target && target !== databases?.selectedId && (
        <Modal
          title="Переключить базу данных?"
          onClose={() => setTarget("")}
          footer={
            <>
              <button
                className="button secondary"
                onClick={() => setTarget("")}
              >
                Отмена
              </button>
              <button
                className="button primary"
                onClick={() => {
                  const id = target;
                  setTarget("");
                  navigate("/database-switch/" + id);
                }}
              >
                Переключить
              </button>
            </>
          }
        >
          <p>
            Будет открыта база «
            {databases?.items.find((item) => item.id === target)?.name}».
            Сохраните изменения в текущей форме перед переключением.
          </p>
        </Modal>
      )}
      {stale && (
        <Modal
          title="База переключена в другой вкладке"
          onClose={() => {}}
          footer={
            <button
              className="button primary"
              onClick={() => window.location.assign("/")}
            >
              Открыть выбранную базу
            </button>
          }
        >
          <p>
            Сохранение из этой вкладки остановлено, чтобы данные не попали в
            другую базу. При переходе несохранённые изменения будут потеряны.
          </p>
        </Modal>
      )}
    </>
  );
}
