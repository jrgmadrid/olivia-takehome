"use client";

import { useEffect, useRef, useState } from "react";
import { STATUS_LABELS, type Status } from "@/lib/client/store";
import type { AgentTurn, ToolName } from "@/lib/types";

type Props = {
  transcript: AgentTurn[];
  status: Status;
};

const TOOL_LABELS: Record<ToolName, string> = {
  analyze_product: "analyze",
  enhance_prompt: "plan",
  generate_scene: "render",
  refine_scene: "edit",
  critique_result: "critique",
};

export function AgentTranscript({ transcript, status }: Props) {
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
      <div className="space-y-4">
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
        <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-paper-high border border-edge px-3.5 py-2 text-sm leading-relaxed text-ink">
          {turn.content}
        </div>
      </div>
    );
  }
  if (turn.kind === "assistant") {
    return (
      <div className="px-1 text-[15px] leading-relaxed text-ink">
        {turn.content}
      </div>
    );
  }
  return <ToolLine turn={turn} />;
}

function ToolLine({ turn }: { turn: Extract<AgentTurn, { kind: "tool" }> }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!turn.detail;
  const label = TOOL_LABELS[turn.tool] ?? turn.tool;

  return (
    <div className="px-1">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={`group inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-ink-mute transition ${
          hasDetail ? "hover:text-sienna" : "cursor-default"
        }`}
      >
        <span className="rounded bg-sienna-soft/50 px-1.5 py-0.5 text-sienna-dark group-hover:bg-sienna group-hover:text-paper-high">
          {label}
        </span>
        <span className="lowercase tracking-normal">{turn.label}</span>
        {hasDetail ? (
          <span className="opacity-0 group-hover:opacity-100">{open ? "−" : "+"}</span>
        ) : null}
      </button>
      {open && hasDetail ? (
        <pre className="mt-1.5 max-h-72 overflow-auto rounded-md border border-edge bg-paper p-2 font-mono text-[11px] leading-relaxed text-ink-soft">
          {JSON.stringify(turn.detail, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  return (
    <div className="px-1 text-sm leading-relaxed">
      <span className="shimmer-text">{STATUS_LABELS[status] ?? status}</span>
    </div>
  );
}
