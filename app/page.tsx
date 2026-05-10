"use client";

import { useCallback } from "react";
import {
  analyzeSession,
  generateScene,
  refineScene,
  transcriptHref,
  uploadImage,
} from "@/lib/client/api";
import { currentVersion, useStore } from "@/lib/client/store";
import { Canvas } from "@/components/canvas/Canvas";
import { VersionRail } from "@/components/canvas/VersionRail";
import { AgentTranscript } from "@/components/chat/AgentTranscript";
import { PromptBar } from "@/components/chat/PromptBar";
import { DropZone } from "@/components/upload/DropZone";
import type { SuggestedScene } from "@/lib/types";

export default function Home() {
  const session = useStore((s) => s.session);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const setSession = useStore((s) => s.setSession);
  const setStatus = useStore((s) => s.setStatus);
  const setError = useStore((s) => s.setError);
  const reset = useStore((s) => s.reset);

  const busy = status !== "idle" && status !== "error";

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        setStatus("uploading");
        const { sessionId } = await uploadImage(file);
        setStatus("analyzing");
        const analyzed = await analyzeSession(sessionId);
        setSession(analyzed);
        setStatus("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "upload failed");
      }
    },
    [setSession, setStatus, setError],
  );

  const handlePrompt = useCallback(
    async (prompt: string) => {
      if (!session) return;
      try {
        const isFirst = session.versions.length === 0;
        setStatus(isFirst ? "generating" : "refining");
        const fn = isFirst ? generateScene : refineScene;
        const updated = await fn(session.id, prompt);
        setSession(updated);
        setStatus("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "generation failed");
      }
    },
    [session, setSession, setStatus, setError],
  );

  const handleSuggestion = useCallback(
    (suggestion: SuggestedScene) => handlePrompt(suggestion.prompt),
    [handlePrompt],
  );

  const version = currentVersion(session);
  const canvasImage = version?.image ?? session?.product ?? null;
  const canvasLabel = version
    ? `Render — v${session!.versions.findIndex((v) => v.id === version.id) + 1}`
    : "Product";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-900 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
            ad-agent
          </span>
        </div>
        {session ? (
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="font-mono">session/{session.id.slice(0, 8)}</span>
            <a
              href={transcriptHref(session.id)}
              className="rounded-md border border-zinc-800 px-2 py-1 transition hover:border-zinc-600 hover:text-zinc-300"
            >
              export transcript
            </a>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-zinc-800 px-2 py-1 transition hover:border-zinc-600 hover:text-zinc-300"
            >
              new session
            </button>
          </div>
        ) : null}
      </header>

      {!session ? (
        <EmptyState onUpload={handleUpload} busy={busy} status={status} error={error} />
      ) : (
        <main className="grid flex-1 grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_420px]">
          <section className="flex min-h-0 flex-col">
            <Canvas image={canvasImage} label={canvasLabel} busy={busy} />
            <VersionRail
              versions={session.versions}
              currentVersionId={session.currentVersionId}
            />
          </section>

          <aside className="flex min-h-0 flex-col gap-3">
            <AgentTranscript
              transcript={session.transcript}
              analysis={session.analysis}
              status={status}
            />
            {error ? (
              <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            ) : null}
            <PromptBar
              placeholder={
                session.versions.length === 0
                  ? "Describe the scene you want…"
                  : "Refine: make the background warmer, add a headline…"
              }
              disabled={busy || !session.analysis}
              onSubmit={handlePrompt}
              suggestions={
                session.versions.length === 0 ? session.analysis?.suggestedScenes : undefined
              }
              onPickSuggestion={handleSuggestion}
            />
          </aside>
        </main>
      )}
    </div>
  );
}

type EmptyProps = {
  onUpload: (file: File) => void;
  busy: boolean;
  status: string;
  error: string | null;
};

function EmptyState({ onUpload, busy, status, error }: EmptyProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          Upload a product. Get a campaign.
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          An agent analyzes your product, plans the scene, and renders ads you can
          iterate on by chat.
        </p>
      </div>
      <DropZone onFile={onUpload} disabled={busy} />
      {busy ? (
        <p className="mt-4 text-xs text-amber-300/80">
          {status === "uploading" ? "uploading…" : "analyzing your product…"}
        </p>
      ) : null}
      {error ? <p className="mt-4 text-xs text-red-300">{error}</p> : null}
    </main>
  );
}
