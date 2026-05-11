"use client";

import { useCallback, useEffect, useState } from "react";
import {
  analyzeSession,
  beginSession,
  generateScene,
  loadSession,
  refineScene,
  selectVersion,
  transcriptHref,
} from "@/lib/client/api";
import { currentVersion, STATUS_LABELS, useStore } from "@/lib/client/store";
import { Canvas } from "@/components/canvas/Canvas";
import { VersionRail } from "@/components/canvas/VersionRail";
import { AgentTranscript } from "@/components/chat/AgentTranscript";
import { PromptBar } from "@/components/chat/PromptBar";
import { EmptyBrief } from "@/components/upload/EmptyBrief";
import { RecentSessions } from "@/components/empty/RecentSessions";
import type { SuggestedScene } from "@/lib/types";

const HEADLINES = [
  "What are we making?",
  "What's the brief?",
  "Pitch me the product.",
  "Where are we taking it?",
  "What's the campaign?",
];

function useHeadline(): string {
  const [headline, setHeadline] = useState(HEADLINES[0]);
  useEffect(() => {
    setHeadline(HEADLINES[Math.floor(Math.random() * HEADLINES.length)]);
  }, []);
  return headline;
}

export default function Home() {
  const session = useStore((s) => s.session);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const setSession = useStore((s) => s.setSession);
  const setStatus = useStore((s) => s.setStatus);
  const setError = useStore((s) => s.setError);
  const reset = useStore((s) => s.reset);

  const [historyKey, setHistoryKey] = useState(0);
  const busy = status !== "idle" && status !== "error";

  const handleBegin = useCallback(
    async (file: File | null, initialPrompt: string) => {
      try {
        setStatus("uploading");
        const { sessionId, product } = await beginSession(file);
        if (initialPrompt) {
          setSession({
            id: sessionId,
            product,
            analysis: null,
            versions: [],
            currentVersionId: null,
            transcript: [
              {
                kind: "user",
                content: initialPrompt,
                createdAt: new Date().toISOString(),
              },
            ],
            suggestions: [],
            title: null,
            thumbnail: product,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        if (file) {
          setStatus("analyzing");
          const analyzed = await analyzeSession(sessionId, initialPrompt || undefined);
          setSession(analyzed);
        }
        if (initialPrompt) {
          setStatus("generating");
          const generated = await generateScene(sessionId, initialPrompt);
          setSession(generated);
        }
        setStatus("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "something went wrong");
      }
    },
    [setSession, setStatus, setError],
  );

  const handlePrompt = useCallback(
    async (prompt: string) => {
      if (!session) return;
      try {
        const isFirst = session.versions.length === 0;
        setSession({
          ...session,
          transcript: [
            ...session.transcript,
            {
              kind: "user",
              content: prompt,
              createdAt: new Date().toISOString(),
            },
          ],
        });
        setStatus(isFirst ? "generating" : "refining");
        const fn = isFirst ? generateScene : refineScene;
        const updated = await fn(session.id, prompt);
        setSession(updated);
        setStatus("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "something went wrong");
      }
    },
    [session, setSession, setStatus, setError],
  );

  const handleSuggestion = useCallback(
    (suggestion: SuggestedScene) => handlePrompt(suggestion.prompt),
    [handlePrompt],
  );

  const handleSelectVersion = useCallback(
    async (versionId: string) => {
      if (!session || busy) return;
      setSession({ ...session, currentVersionId: versionId });
      try {
        const synced = await selectVersion(session.id, versionId);
        setSession(synced);
      } catch (err) {
        setError(err instanceof Error ? err.message : "version sync failed");
      }
    },
    [session, busy, setSession, setError],
  );

  const handleResume = useCallback(
    async (sessionId: string) => {
      try {
        setStatus("analyzing");
        const restored = await loadSession(sessionId);
        setSession(restored);
        setStatus("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "couldn't resume session");
      }
    },
    [setSession, setStatus, setError],
  );

  const handleNewSession = useCallback(() => {
    reset();
    setHistoryKey((k) => k + 1);
  }, [reset]);

  const headline = useHeadline();
  const version = currentVersion(session);
  const canvasImage = version?.image ?? session?.product ?? null;
  const versionIndex = session && version
    ? session.versions.findIndex((v) => v.id === version.id)
    : -1;
  const canvasLabel =
    versionIndex >= 0
      ? `Render — v${versionIndex + 1}`
      : session?.product
        ? "Product"
        : "Canvas";

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-cream text-ink">
      <header className="flex shrink-0 items-center justify-between border-b border-edge px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-sienna" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink">
            Peggy
          </span>
        </div>
        {session ? (
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <span className="font-mono">session/{session.id.slice(0, 8)}</span>
            <a
              href={transcriptHref(session.id)}
              className="rounded-md border border-edge bg-paper-high px-2.5 py-1 transition hover:border-sienna hover:text-sienna"
            >
              export transcript
            </a>
            <button
              type="button"
              onClick={handleNewSession}
              className="rounded-md border border-edge bg-paper-high px-2.5 py-1 transition hover:border-sienna hover:text-sienna"
            >
              new session
            </button>
          </div>
        ) : null}
      </header>

      {!session ? (
        <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-12">
          <div className="flex w-full flex-1 flex-col items-center justify-center">
            <div className="mb-10 max-w-2xl text-center">
              <h1 className="font-display whitespace-nowrap text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
                {headline}
              </h1>
              <p className="mt-5 text-base leading-relaxed text-ink-soft">
                I&apos;m Peggy — your AI ad agent. Let&apos;s make some marketing
                magic together. Drop an image into the chat box below to get
                started, or just tell me what you need.
              </p>
            </div>
            <EmptyBrief onSubmit={handleBegin} busy={busy} />
            {busy ? (
              <p className="mt-5 text-sm">
                <span className="shimmer-text">{STATUS_LABELS[status] ?? status}</span>
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 text-xs text-sienna-dark">{error}</p>
            ) : null}
          </div>
          <RecentSessions onPick={handleResume} refreshKey={historyKey} />
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden px-6 py-6 lg:grid-cols-[1fr_420px]">
          <section className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1">
              <Canvas image={canvasImage} label={canvasLabel} busy={busy} />
            </div>
            <VersionRail
              versions={session.versions}
              currentVersionId={session.currentVersionId}
              onSelect={handleSelectVersion}
            />
          </section>

          <aside className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <AgentTranscript transcript={session.transcript} status={status} />
            {error ? (
              <div className="rounded-lg border border-sienna/40 bg-sienna-soft/40 px-3 py-2 text-xs text-sienna-dark">
                {error}
              </div>
            ) : null}
            <PromptBar
              placeholder={
                session.versions.length === 0
                  ? "What scene do you want?"
                  : "Tell me what to tweak — or pick one of mine."
              }
              disabled={busy}
              onSubmit={handlePrompt}
              suggestions={session.suggestions}
              onPickSuggestion={handleSuggestion}
            />
          </aside>
        </main>
      )}
    </div>
  );
}
