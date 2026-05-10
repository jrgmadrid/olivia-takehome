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
    <div className="relative flex h-full w-full flex-col">
      <div className="flex items-center justify-between pb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
        <span>{label ?? "Canvas"}</span>
        {busy ? <BusyIndicator /> : <span className="opacity-0">·</span>}
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageHref(image.id)}
            alt="Current render"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-sm text-zinc-600">No render yet</div>
        )}
        {busy ? <ShimmerOverlay /> : null}
      </div>
    </div>
  );
}

function BusyIndicator() {
  return (
    <span className="flex items-center gap-2 text-amber-300/90">
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
      </span>
      working
    </span>
  );
}

function ShimmerOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-[shimmer_2.4s_ease-in-out_infinite]" />
  );
}
