"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function DropZone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!ACCEPT.split(",").includes(file.type)) return;
      onFile(file);
    },
    [onFile],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={`group relative flex w-full max-w-xl cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-10 py-16 text-center transition ${
        dragging
          ? "border-amber-400/70 bg-amber-400/5"
          : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500 hover:bg-zinc-900/60"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
      <div className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">
        Drop product image
      </div>
      <div className="text-xs text-zinc-500">
        JPEG, PNG, WEBP, GIF — up to 8 MB
      </div>
      <div className="mt-2 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 group-hover:border-zinc-500">
        or click to select
      </div>
    </label>
  );
}
