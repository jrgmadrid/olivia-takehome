export type ProductAnalysis = {
  category: string;
  intro: string;
  description: string;
  materials: string[];
  dominantColors: string[];
  suggestedScenes: SuggestedScene[];
  gotchas: string[];
};

export type SuggestedScene = {
  label: string;
  prompt: string;
  rationale: string;
};

export type ImageRef = {
  id: string;
  mimeType: string;
};

export type ImageVersion = {
  id: string;
  image: ImageRef;
  prompt: string;
  enhancedPrompt: string;
  parentId: string | null;
  createdAt: string;
};

export type AgentTurn =
  | { kind: "user"; content: string; createdAt: string }
  | {
      kind: "tool";
      tool: ToolName;
      label: string;
      detail?: Record<string, unknown>;
      versionId?: string;
      createdAt: string;
    }
  | { kind: "assistant"; content: string; createdAt: string };

export type ToolName =
  | "analyze_product"
  | "enhance_prompt"
  | "generate_scene"
  | "refine_scene"
  | "critique_result";

export type Session = {
  id: string;
  product: ImageRef;
  analysis: ProductAnalysis | null;
  versions: ImageVersion[];
  currentVersionId: string | null;
  transcript: AgentTurn[];
  suggestions: SuggestedScene[];
  title: string | null;
  thumbnail: ImageRef | null;
  createdAt: string;
  updatedAt: string;
};

export type SessionSummary = {
  id: string;
  title: string;
  thumbnail: ImageRef | null;
  versionCount: number;
  updatedAt: string;
};

export type GeneratePlan = {
  enhancedPrompt: string;
  strategy: "scene_replacement" | "background_swap" | "lifestyle_compose" | "editorial";
  notes: string;
  title: string;
};

export type RefinePlan = {
  enhancedPrompt: string;
  intent: "background" | "lighting" | "composition" | "color" | "text_overlay" | "other";
  notes: string;
};
