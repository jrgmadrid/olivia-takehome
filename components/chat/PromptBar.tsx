"use client";

import { useState, type FormEvent } from "react";
import type { SuggestedScene } from "@/lib/types";

type Props = {
  placeholder: string;
  disabled: boolean;
  onSubmit: (text: string) => void;
  suggestions?: SuggestedScene[];
  onPickSuggestion?: (suggestion: SuggestedScene) => void;
};

export function PromptBar({
  placeholder,
  disabled,
  onSubmit,
  suggestions,
  onPickSuggestion,
}: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue("");
  };

  return (
    <div className="space-y-2">
      {suggestions && suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              disabled={disabled}
              onClick={() => onPickSuggestion?.(suggestion)}
              className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-50"
              title={suggestion.rationale}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 focus-within:border-zinc-600"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-full bg-amber-300 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-950 transition hover:bg-amber-200 disabled:opacity-30"
        >
          Send
        </button>
      </form>
    </div>
  );
}
