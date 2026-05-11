"use client";

import { imageHref } from "@/lib/client/api";
import type { ImageRef } from "@/lib/types";

type Props = {
  image: ImageRef | null;
  label?: string;
  busy?: boolean;
};

export function Canvas({ image, label, busy }: Props) {
  return (
    <div className="relative flex h-full w-full min-h-0 flex-col">
      <div className="flex items-center justify-between pb-3 text-xs uppercase tracking-[0.2em] text-ink-mute">
        <span>{label ?? "Canvas"}</span>
        {busy ? <Spinner /> : <span className="opacity-0">·</span>}
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-edge bg-paper-high shadow-[0_12px_36px_-20px_rgba(74,55,40,0.25)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageHref(image.id)}
            alt="Current render"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-cream-deep" />
            {!busy ? (
              <div className="relative text-xs uppercase tracking-[0.18em] text-ink-mute">
                Awaiting brief
              </div>
            ) : null}
          </>
        )}
        {busy ? <div className="shimmer-overlay" /> : null}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-sienna"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="18 50"
      />
    </svg>
  );
}
