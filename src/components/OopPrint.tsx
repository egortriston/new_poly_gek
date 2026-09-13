import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileText, Printer } from "lucide-react";
import { api } from "../api";
import { Modal } from "./ui";

export function OopPrint({ programId }: { programId: string }) {
  const [preview, setPreview] = useState(false);
  return (
    <>
      <div className="print-actions">
        <section>
          <span className="module-icon">
            <FileText size={24} />
          </span>
          <div>
            <h2>Основная образовательная программа</h2>
            <p>
              Титульные листы, содержание, сведения об ООП, матрицы компетенций
              и приложения.
            </p>
            <div className="button-row">
              <button
                className="button primary"
                onClick={() => setPreview(true)}
              >
                <FileText size={16} />
                Предпросмотр ООП
              </button>
              <Link
                className="button secondary"
                to={"/oop/formation?program=" + encodeURIComponent(programId)}
              >
                Перейти к заполнению
              </Link>
            </div>
          </div>
        </section>
      </div>
      <p className="info-note">
        Печать использует сохранённые сведения выбранной программы.
      </p>
      {preview && (
        <OopPdfPreview
          programId={programId}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}

function OopPdfPreview({
  programId,
  onClose,
}: {
  programId: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl("");
    setError("");
    api<{ pdf: string }>(
      "/oop/print",
      { program: programId },
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(
          new Blob([Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0))], {
            type: "application/pdf",
          }),
        );
        setUrl(objectUrl);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [programId, attempt]);
  return (
    <Modal
      wide
      title="Основная образовательная программа"
      onClose={onClose}
      footer={
        <>
          <button className="button secondary" onClick={onClose}>
            Закрыть
          </button>
          {url && (
            <a
              className="button secondary"
              href={url}
              download={`oop-${programId}.pdf`}
            >
              <Download size={16} />
              Скачать PDF
            </a>
          )}
          <button
            className="button primary"
            disabled={!url}
            onClick={() => {
              try {
                frame.current?.contentWindow?.print();
              } catch {
                window.open(url, "_blank", "noopener");
              }
            }}
          >
            <Printer size={16} />
            Печать
          </button>
        </>
      }
    >
      {error ? (
        <div>
          <p className="form-error" role="alert">
            {error}
          </p>
          <button
            className="button secondary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Повторить
          </button>
        </div>
      ) : url ? (
        <iframe
          ref={frame}
          title="Печатная форма ООП"
          src={url}
          style={{ width: "100%", height: "70vh", border: 0 }}
        />
      ) : (
        <p role="status">Подготовка документа…</p>
      )}
    </Modal>
  );
}
