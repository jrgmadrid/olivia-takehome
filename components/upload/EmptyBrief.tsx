"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

type Props = {
  busy: boolean;
  onSubmit: (file: File, prompt: string) => void;
};

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const PLACEHOLDERS = [
  "Make it feel like a Wes Anderson movie poster but for a skincare brand…",
  "Something moody and cinematic — think A24 horror but it's a perfume ad…",
  "Show the sneakers on a kid skating through downtown Tokyo at golden hour…",
  "I want a Y2K flip-phone catalog energy with too many lens flares…",
  "Give me a quiet still life of the candle on a rainy Sunday morning…",
];

function useTypewriter(lines: string[], active: boolean): string {
  const [index, setIndex] = useState(() =>
    lines.length > 0 ? Math.floor(Math.random() * lines.length) : 0,
  );
  const [text, setText] = useState("");

  useEffect(() => {
    if (!active || lines.length === 0) return;
    const target = lines[index];
    let cancelled = false;
    let handle: ReturnType<typeof setTimeout> | undefined;
    let current = "";

    const typeIn = () => {
      if (cancelled) return;
      if (current.length < target.length) {
        current = target.slice(0, current.length + 1);
        setText(current);
        handle = setTimeout(typeIn, 35);
        return;
      }
      handle = setTimeout(typeOut, 1500);
    };

    const typeOut = () => {
      if (cancelled) return;
      if (current.length === 0) {
        handle = setTimeout(() => {
          if (!cancelled) setIndex((i) => (i + 1) % lines.length);
        }, 400);
        return;
      }
      current = current.slice(0, -1);
      setText(current);
      handle = setTimeout(typeOut, 23);
    };

    setText("");
    typeIn();

    return () => {
      cancelled = true;
      if (handle) clearTimeout(handle);
    };
  }, [active, index, lines]);

  return text;
}

export function EmptyBrief({ busy, onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const typewriter = useTypewriter(PLACEHOLDERS, prompt === "" && !busy);

  useEffect(() => {
    if (!file) {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = useCallback((next: File | null) => {
    if (!next || !ACCEPT.includes(next.type)) return;
    setFile(next);
  }, []);

  const submit = () => {
    if (!file || busy) return;
    onSubmit(file, prompt.trim());
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!busy) setDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragging(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!busy) accept(e.dataTransfer.files[0] ?? null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full max-w-2xl rounded-3xl border-2 bg-paper-high p-3.5 shadow-[0_16px_48px_-24px_rgba(74,55,40,0.25)] transition ${
        dragging ? "border-sienna" : "border-edge focus-within:border-sienna/60"
      } ${busy ? "opacity-90" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT.join(",")}
        className="sr-only"
        onChange={(e) => accept(e.target.files?.[0] ?? null)}
        disabled={busy}
      />

      {file && previewUrl ? (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-edge bg-paper px-2.5 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={file.name}
            className="h-10 w-10 shrink-0 rounded-md object-cover"
          />
          <div className="flex flex-1 items-baseline gap-2 truncate text-sm">
            <span className="truncate text-ink">{file.name}</span>
            <span className="shrink-0 text-xs text-ink-mute">
              {(file.size / 1024).toFixed(0)} KB
            </span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setFile(null)}
            className="rounded-full px-2 text-base leading-none text-ink-soft transition hover:text-sienna"
            aria-label="Remove file"
          >
            ×
          </button>
        </div>
      ) : null}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
        placeholder={typewriter}
        disabled={busy}
        className="w-full resize-none bg-transparent px-1.5 py-1 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-mute disabled:opacity-50"
      />

      <div className="mt-1 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full border border-edge bg-paper-high px-3 py-1.5 text-xs text-ink-soft transition hover:border-sienna hover:text-sienna disabled:opacity-50"
        >
          <PaperclipIcon />
          {file ? "Change image" : "Attach product image"}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!file || busy}
          className="rounded-full bg-sienna px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-paper-high shadow-[0_6px_18px_-8px_rgba(168,75,37,0.55)] transition hover:bg-sienna-dark disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
        >
          Begin
        </button>
      </div>

      {dragging ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl border-2 border-dashed border-sienna bg-sienna-soft/30 backdrop-blur-[1px]">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-sienna-dark">
            Drop it right here
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.8L9.41 17.34a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
