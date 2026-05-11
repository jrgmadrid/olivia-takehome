"use client";

import { create } from "zustand";
import type { ImageVersion, Session } from "@/lib/types";

export type Status =
  | "idle"
  | "uploading"
  | "analyzing"
  | "generating"
  | "refining"
  | "error";

export const STATUS_LABELS: Partial<Record<Status, string>> = {
  uploading: "uploading…",
  analyzing: "looking at it…",
  generating: "rendering…",
  refining: "editing…",
};

type State = {
  session: Session | null;
  status: Status;
  error: string | null;
};

type Actions = {
  setSession: (session: Session | null) => void;
  setStatus: (status: Status) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initial: State = {
  session: null,
  status: "idle",
  error: null,
};

export const useStore = create<State & Actions>((set) => ({
  ...initial,
  setSession: (session) => set({ session }),
  setStatus: (status) =>
    set(status === "error" ? { status } : { status, error: null }),
  setError: (error) => set({ error, status: error ? "error" : "idle" }),
  reset: () => set(initial),
}));

export function currentVersion(session: Session | null): ImageVersion | null {
  if (!session) return null;
  return session.versions.find((v) => v.id === session.currentVersionId) ?? null;
}
