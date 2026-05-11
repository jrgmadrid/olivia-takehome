"use client";

import { imageHref } from "@/lib/client/api";
import type { ImageVersion } from "@/lib/types";

type Props = {
  versions: ImageVersion[];
  currentVersionId: string | null;
  onSelect?: (id: string) => void;
};

export function VersionRail({ versions, currentVersionId, onSelect }: Props) {
  if (versions.length === 0) return null;

  return (
    <div className="flex w-full gap-2 overflow-x-auto pt-3">
      {versions.map((version, idx) => {
        const isCurrent = version.id === currentVersionId;
        return (
          <button
            key={version.id}
            type="button"
            onClick={() => onSelect?.(version.id)}
            className={`group relative flex h-16 w-16 shrink-0 overflow-hidden rounded-md border transition ${
              isCurrent
                ? "border-sienna ring-2 ring-sienna/30"
                : "border-edge hover:border-sienna/60"
            }`}
            title={version.prompt}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageHref(version.image.id)}
              alt={`Version ${idx + 1}`}
              className="h-full w-full object-cover"
            />
            <span
              className={`absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center font-mono text-[10px] ${
                isCurrent ? "bg-sienna text-paper-high" : "bg-ink/70 text-cream"
              }`}
            >
              v{idx + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
