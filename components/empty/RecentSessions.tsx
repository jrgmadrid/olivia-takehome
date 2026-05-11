"use client";

import { useEffect, useState } from "react";
import { imageHref, listSessions } from "@/lib/client/api";
import type { SessionSummary } from "@/lib/types";

type Props = {
  onPick: (sessionId: string) => void;
  refreshKey?: number;
};

export function RecentSessions({ onPick, refreshKey }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSessions(8)
      .then((result) => {
        if (!cancelled) setSessions(result);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="w-full max-w-3xl pt-10">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
          Recent work
        </span>
        <span className="text-xs text-ink-mute">{sessions.length} session{sessions.length === 1 ? "" : "s"}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  onPick,
}: {
  session: SessionSummary;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(session.id)}
      className="group flex w-52 shrink-0 flex-col overflow-hidden rounded-2xl border border-edge bg-paper-high text-left shadow-[0_8px_24px_-18px_rgba(74,55,40,0.25)] transition hover:border-sienna hover:shadow-[0_12px_28px_-16px_rgba(168,75,37,0.4)]"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-cream-deep">
        {session.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageHref(session.thumbnail.id)}
            alt={session.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-mute">
            no preview
          </div>
        )}
      </div>
      <div className="space-y-1 px-3 py-2.5">
        <div className="line-clamp-2 text-sm font-medium text-ink">{session.title}</div>
        <div className="flex items-center justify-between text-[11px] text-ink-mute">
          <span>{relativeTime(session.updatedAt)}</span>
          <span>
            {session.versionCount} {session.versionCount === 1 ? "render" : "renders"}
          </span>
        </div>
      </div>
    </button>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  const days = Math.floor(diff / day);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
