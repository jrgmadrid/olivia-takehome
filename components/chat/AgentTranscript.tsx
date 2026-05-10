"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentTurn, ProductAnalysis, ToolName } from "@/lib/types";

type Props = {
  transcript: AgentTurn[];
  analysis: ProductAnalysis | null;
  status: string;
};

const TOOL_LABELS: Record<ToolName, string> = {
  analyze_product: "analyze",
  enhance_prompt: "plan",
  generate_scene: "render",
  refine_scene: "edit",
  critique_result: "critique",
};

export function AgentTranscript({ transcript, analysis, status }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript.length, status]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-1 py-1 [scrollbar-gutter:stable]"
    >
      <div className="space-y-3">
        {analysis ? <AnalysisCard analysis={analysis} /> : null}
        {transcript.map((turn, idx) => (
          <TurnBlock key={idx} turn={turn} />
        ))}
        {status !== "idle" && status !== "error" ? <StatusLine status={status} /> : null}
      </div>
    </div>
  );
}

function TurnBlock({ turn }: { turn: AgentTurn }) {
  if (turn.kind === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[90%] rounded-2xl rounded-br-sm bg-zinc-800 px-3 py-2 text-sm text-zinc-100">
          {turn.content}
        </div>
      </div>
    );
  }
  if (turn.kind === "assistant") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200">
        {turn.content}
      </div>
    );
  }
  return <ToolCard turn={turn} />;
}

function ToolCard({ turn }: { turn: Extract<AgentTurn, { kind: "tool" }> }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!turn.detail;

  return (
    <button
      type="button"
      onClick={() => hasDetail && setOpen((v) => !v)}
      className={`block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left transition ${
        hasDetail ? "hover:border-zinc-700" : "cursor-default"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
          {TOOL_LABELS[turn.tool] ?? turn.tool}
        </span>
        <span className="text-sm text-zinc-300">{turn.label}</span>
        {hasDetail ? (
          <span className="ml-auto text-xs text-zinc-500">
            {open ? "hide" : "expand"}
          </span>
        ) : null}
      </div>
      {open && hasDetail ? (
        <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-black/50 p-2 font-mono text-[11px] leading-relaxed text-zinc-300">
          {JSON.stringify(turn.detail, null, 2)}
        </pre>
      ) : null}
    </button>
  );
}

function AnalysisCard({ analysis }: { analysis: ProductAnalysis }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
          context
        </span>
        <span className="text-sm font-medium text-zinc-200">{analysis.category}</span>
      </div>
      <p className="text-sm text-zinc-400">{analysis.description}</p>
      {analysis.materials.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {analysis.materials.map((m) => (
            <span
              key={m}
              className="rounded-full border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400"
            >
              {m}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusLine({ status }: { status: string }) {
  const labels: Record<string, string> = {
    uploading: "uploading image…",
    analyzing: "analyzing product…",
    generating: "rendering scene…",
    refining: "applying edit…",
  };
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-amber-300/80">
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
      </span>
      {labels[status] ?? status}
    </div>
  );
}
