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
              className="rounded-full border border-edge bg-paper-high px-3 py-1.5 text-xs text-ink-soft transition hover:border-sienna hover:bg-sienna-soft/30 hover:text-sienna-dark disabled:opacity-50"
              title={suggestion.rationale}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 rounded-2xl border border-edge bg-paper-high px-3 py-2 transition focus-within:border-sienna"
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
          className="flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-full bg-sienna px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-paper-high transition hover:bg-sienna-dark disabled:opacity-30"
        >
          Send
        </button>
      </form>
    </div>
  );
}
