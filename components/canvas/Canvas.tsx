"use client";

import { imageHref } from "@/lib/client/api";
import type { ImageRef } from "@/lib/types";

type Props = {
  image: ImageRef | null;
  label?: string;
  busy?: boolean;
  busyLabel?: string;
};

export function Canvas({ image, label, busy, busyLabel }: Props) {
  return (
    <div className="relative flex h-full w-full min-h-0 flex-col">
      <div className="flex items-center justify-between pb-3 text-xs uppercase tracking-[0.2em] text-ink-mute">
        <span>{label ?? "Canvas"}</span>
        {busy ? (
          <span className="shimmer-text text-sm font-medium normal-case tracking-normal">
            {busyLabel ?? "working"}
          </span>
        ) : (
          <span className="opacity-0">·</span>
        )}
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
          <div className="text-sm text-ink-mute">No render yet</div>
        )}
        {busy ? <div className="shimmer-overlay" /> : null}
      </div>
    </div>
  );
}
