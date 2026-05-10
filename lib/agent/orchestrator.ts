import { randomUUID } from "node:crypto";
import { analyzeProduct, planGeneration, planRefinement } from "@/lib/agent/claude";
import { generateScene, refineScene, type RefineHistoryItem } from "@/lib/agent/gemini";
import { getBlob, putBlob } from "@/lib/storage/blob";
import {
  appendTurn,
  appendVersion,
  requireSession,
  setAnalysis,
} from "@/lib/storage/session";
import type { ImageVersion, Session } from "@/lib/types";

export async function runAnalysis(sessionId: string): Promise<Session> {
  const session = requireSession(sessionId);
  const blob = getBlob(session.product.id);
  if (!blob) throw new Error("Product image blob missing");

  const analysis = await analyzeProduct(blob.data, blob.mimeType);
  setAnalysis(sessionId, analysis);

  appendTurn(sessionId, {
    kind: "tool",
    tool: "analyze_product",
    label: `Identified ${analysis.category}`,
    detail: { ...analysis },
    createdAt: new Date().toISOString(),
  });

  return requireSession(sessionId);
}

export async function runGeneration(
  sessionId: string,
  userPrompt: string,
): Promise<Session> {
  const session = requireSession(sessionId);
  if (!session.analysis) throw new Error("Session has no analysis yet");

  appendTurn(sessionId, {
    kind: "user",
    content: userPrompt,
    createdAt: new Date().toISOString(),
  });

  const plan = await planGeneration(userPrompt, session.analysis);
  appendTurn(sessionId, {
    kind: "tool",
    tool: "enhance_prompt",
    label: `Strategy: ${plan.strategy.replace(/_/g, " ")}`,
    detail: { enhancedPrompt: plan.enhancedPrompt, notes: plan.notes },
    createdAt: new Date().toISOString(),
  });

  const productBlob = getBlob(session.product.id);
  if (!productBlob) throw new Error("Product image blob missing");

  const generated = await generateScene({
    productImage: { data: productBlob.data, mimeType: productBlob.mimeType },
    prompt: plan.enhancedPrompt,
  });

  const blobId = putBlob(generated.data, generated.mimeType);
  const version: ImageVersion = {
    id: randomUUID(),
    image: { id: blobId, mimeType: generated.mimeType },
    prompt: userPrompt,
    enhancedPrompt: plan.enhancedPrompt,
    parentId: null,
    createdAt: new Date().toISOString(),
  };
  appendVersion(sessionId, version);

  appendTurn(sessionId, {
    kind: "tool",
    tool: "generate_scene",
    label: `Rendered v${session.versions.length + 1}`,
    versionId: version.id,
    createdAt: new Date().toISOString(),
  });

  return requireSession(sessionId);
}

export async function runRefinement(
  sessionId: string,
  userMessage: string,
): Promise<Session> {
  const session = requireSession(sessionId);
  if (!session.analysis) throw new Error("Session has no analysis yet");
  const currentVersion = session.versions.find((v) => v.id === session.currentVersionId);
  if (!currentVersion) throw new Error("No current version to refine");

  appendTurn(sessionId, {
    kind: "user",
    content: userMessage,
    createdAt: new Date().toISOString(),
  });

  const plan = await planRefinement({
    analysis: session.analysis,
    currentPrompt: currentVersion.enhancedPrompt,
    userMessage,
  });
  appendTurn(sessionId, {
    kind: "tool",
    tool: "refine_scene",
    label: `Intent: ${plan.intent}`,
    detail: { enhancedPrompt: plan.enhancedPrompt, notes: plan.notes },
    createdAt: new Date().toISOString(),
  });

  const productBlob = getBlob(session.product.id);
  if (!productBlob) throw new Error("Product image blob missing");
  const currentBlob = getBlob(currentVersion.image.id);
  if (!currentBlob) throw new Error("Current version blob missing");

  const history: RefineHistoryItem[] = [
    {
      role: "user",
      image: { data: productBlob.data, mimeType: productBlob.mimeType },
      text: currentVersion.enhancedPrompt,
    },
    {
      role: "model",
      image: { data: currentBlob.data, mimeType: currentBlob.mimeType },
    },
  ];

  const generated = await refineScene({ history, prompt: plan.enhancedPrompt });

  const blobId = putBlob(generated.data, generated.mimeType);
  const version: ImageVersion = {
    id: randomUUID(),
    image: { id: blobId, mimeType: generated.mimeType },
    prompt: userMessage,
    enhancedPrompt: plan.enhancedPrompt,
    parentId: currentVersion.id,
    createdAt: new Date().toISOString(),
  };
  appendVersion(sessionId, version);

  appendTurn(sessionId, {
    kind: "tool",
    tool: "generate_scene",
    label: `Rendered v${session.versions.length + 1}`,
    versionId: version.id,
    createdAt: new Date().toISOString(),
  });

  return requireSession(sessionId);
}
