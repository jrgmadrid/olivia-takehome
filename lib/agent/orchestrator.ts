import { randomUUID } from "node:crypto";
import {
  analyzeProduct,
  planGeneration,
  planRefinement,
  proposeTweaks,
} from "@/lib/agent/claude";
import {
  generateScene,
  refineScene,
  type GeneratedImage,
  type RefineHistoryItem,
} from "@/lib/agent/gemini";
import { getBlob, putBlob } from "@/lib/storage/blob";
import {
  appendTurn,
  appendUserTurnIfNew,
  appendVersion,
  requireSession,
  setAnalysis,
  setSuggestions,
  setTitle,
} from "@/lib/storage/session";
import type { ImageVersion, Session } from "@/lib/types";

async function refreshSuggestions(
  sessionId: string,
  rendered: GeneratedImage,
  enhancedPrompt: string,
): Promise<void> {
  const session = await requireSession(sessionId);
  try {
    const suggestions = await proposeTweaks({
      renderedImage: rendered.data,
      mimeType: rendered.mimeType,
      analysis: session.analysis,
      currentPrompt: enhancedPrompt,
    });
    await setSuggestions(sessionId, suggestions);
  } catch {
    // suggestions are non-critical — leave the previous set in place
  }
}

export async function runAnalysis(
  sessionId: string,
  brief?: string,
): Promise<Session> {
  const session = await requireSession(sessionId);
  if (!session.product) return session;
  const blob = await getBlob(session.product.id);
  if (!blob) throw new Error("Product image blob missing");

  const trimmedBrief = brief?.trim();
  if (trimmedBrief) {
    await appendUserTurnIfNew(sessionId, trimmedBrief);
  }

  const analysis = await analyzeProduct(blob.data, blob.mimeType, trimmedBrief);
  await setAnalysis(sessionId, analysis);
  await setSuggestions(sessionId, analysis.suggestedScenes);
  const now = () => new Date().toISOString();

  await appendTurn(sessionId, {
    kind: "assistant",
    content: analysis.intro,
    createdAt: now(),
  });
  await appendTurn(sessionId, {
    kind: "tool",
    tool: "analyze_product",
    label: `read ${analysis.category}`,
    detail: { ...analysis },
    createdAt: now(),
  });

  return requireSession(sessionId);
}

export async function runGeneration(
  sessionId: string,
  userPrompt: string,
): Promise<Session> {
  const session = await requireSession(sessionId);
  const now = () => new Date().toISOString();

  const isFirstGeneration = session.versions.length === 0;
  await appendUserTurnIfNew(sessionId, userPrompt);

  const plan = await planGeneration(userPrompt, session.analysis);
  if (isFirstGeneration && plan.title.trim()) {
    await setTitle(sessionId, plan.title.trim());
  }
  await appendTurn(sessionId, { kind: "assistant", content: plan.notes, createdAt: now() });
  await appendTurn(sessionId, {
    kind: "tool",
    tool: "enhance_prompt",
    label: `plan · ${plan.strategy.replace(/_/g, " ")}`,
    detail: { enhancedPrompt: plan.enhancedPrompt },
    createdAt: now(),
  });

  let productImage: { data: Buffer; mimeType: string } | undefined;
  if (session.product) {
    const productBlob = await getBlob(session.product.id);
    if (!productBlob) throw new Error("Product image blob missing");
    productImage = { data: productBlob.data, mimeType: productBlob.mimeType };
  }

  const generated = await generateScene({
    productImage,
    prompt: plan.enhancedPrompt,
  });

  const blobId = await putBlob(generated.data, generated.mimeType);
  const version: ImageVersion = {
    id: randomUUID(),
    image: { id: blobId, mimeType: generated.mimeType },
    prompt: userPrompt,
    enhancedPrompt: plan.enhancedPrompt,
    parentId: null,
    createdAt: now(),
  };
  await appendVersion(sessionId, version);

  const after = await requireSession(sessionId);
  await appendTurn(sessionId, {
    kind: "tool",
    tool: "generate_scene",
    label: `render v${after.versions.length}`,
    versionId: version.id,
    createdAt: now(),
  });

  await refreshSuggestions(sessionId, generated, plan.enhancedPrompt);
  return requireSession(sessionId);
}

export async function runRefinement(
  sessionId: string,
  userMessage: string,
): Promise<Session> {
  const session = await requireSession(sessionId);
  const currentVersion = session.versions.find((v) => v.id === session.currentVersionId);
  if (!currentVersion) throw new Error("No current version to refine");
  const now = () => new Date().toISOString();

  await appendUserTurnIfNew(sessionId, userMessage);

  const plan = await planRefinement({
    analysis: session.analysis,
    currentPrompt: currentVersion.enhancedPrompt,
    userMessage,
  });
  await appendTurn(sessionId, { kind: "assistant", content: plan.notes, createdAt: now() });
  await appendTurn(sessionId, {
    kind: "tool",
    tool: "refine_scene",
    label: `edit · ${plan.intent}`,
    detail: { enhancedPrompt: plan.enhancedPrompt },
    createdAt: now(),
  });

  const currentBlob = await getBlob(currentVersion.image.id);
  if (!currentBlob) throw new Error("Current version blob missing");

  const history: RefineHistoryItem[] = [];
  if (session.product) {
    const productBlob = await getBlob(session.product.id);
    if (!productBlob) throw new Error("Product image blob missing");
    history.push({
      role: "user",
      image: { data: productBlob.data, mimeType: productBlob.mimeType },
      text: currentVersion.enhancedPrompt,
    });
  } else {
    history.push({ role: "user", text: currentVersion.enhancedPrompt });
  }
  history.push({
    role: "model",
    image: { data: currentBlob.data, mimeType: currentBlob.mimeType },
  });

  const generated = await refineScene({ history, prompt: plan.enhancedPrompt });

  const blobId = await putBlob(generated.data, generated.mimeType);
  const version: ImageVersion = {
    id: randomUUID(),
    image: { id: blobId, mimeType: generated.mimeType },
    prompt: userMessage,
    enhancedPrompt: plan.enhancedPrompt,
    parentId: currentVersion.id,
    createdAt: now(),
  };
  await appendVersion(sessionId, version);

  const after = await requireSession(sessionId);
  await appendTurn(sessionId, {
    kind: "tool",
    tool: "generate_scene",
    label: `render v${after.versions.length}`,
    versionId: version.id,
    createdAt: now(),
  });

  await refreshSuggestions(sessionId, generated, plan.enhancedPrompt);
  return requireSession(sessionId);
}
