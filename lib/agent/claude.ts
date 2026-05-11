import Anthropic from "@anthropic-ai/sdk";
import type {
  GeneratePlan,
  ProductAnalysis,
  RefinePlan,
  SuggestedScene,
} from "@/lib/types";
import {
  PRODUCT_ANALYZER_SYSTEM,
  PROMPT_ENHANCER_SYSTEM,
  REFINER_SYSTEM,
  TWEAK_PROPOSER_SYSTEM,
} from "@/lib/agent/prompts";

const MODEL = "claude-sonnet-4-6";

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  if (!cachedClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}

type SupportedMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function assertSupportedMime(mime: string): SupportedMime {
  if (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/gif" ||
    mime === "image/webp"
  ) {
    return mime;
  }
  throw new Error(`Unsupported image mime type: ${mime}`);
}

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function parseJson<T>(raw: string, context: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : raw).trim();
  try {
    return JSON.parse(body) as T;
  } catch (cause) {
    throw new Error(`Failed to parse JSON from Claude (${context}): ${body.slice(0, 200)}`, {
      cause,
    });
  }
}

export async function analyzeProduct(
  imageData: Buffer,
  mimeType: string,
  brief?: string,
): Promise<ProductAnalysis> {
  const briefText = brief?.trim();
  const userText = briefText
    ? `The user dropped this product image along with this brief:\n\n"""\n${briefText}\n"""\n\nReturn the JSON brief. Your intro must react to the product AND the brief together — never praise features the brief is asking you to change.`
    : "No brief from the user yet — just the product image. Return the JSON brief.";

  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: PRODUCT_ANALYZER_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: assertSupportedMime(mimeType),
              data: imageData.toString("base64"),
            },
          },
          { type: "text", text: userText },
        ],
      },
    ],
  });

  return parseJson<ProductAnalysis>(extractText(message), "analyzeProduct");
}

export async function planGeneration(
  userPrompt: string,
  analysis: ProductAnalysis,
): Promise<GeneratePlan> {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 800,
    system: PROMPT_ENHANCER_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Product analysis:\n${JSON.stringify(analysis, null, 2)}\n\nUser prompt: ${userPrompt}`,
          },
        ],
      },
    ],
  });

  return parseJson<GeneratePlan>(extractText(message), "planGeneration");
}

export async function proposeTweaks(args: {
  renderedImage: Buffer;
  mimeType: string;
  analysis: ProductAnalysis;
  currentPrompt: string;
}): Promise<SuggestedScene[]> {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 800,
    system: TWEAK_PROPOSER_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: assertSupportedMime(args.mimeType),
              data: args.renderedImage.toString("base64"),
            },
          },
          {
            type: "text",
            text: `Product analysis:\n${JSON.stringify(args.analysis, null, 2)}\n\nCurrent scene prompt:\n${args.currentPrompt}`,
          },
        ],
      },
    ],
  });

  return parseJson<SuggestedScene[]>(extractText(message), "proposeTweaks");
}

export async function planRefinement(args: {
  analysis: ProductAnalysis;
  currentPrompt: string;
  userMessage: string;
}): Promise<RefinePlan> {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 800,
    system: REFINER_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Product analysis:\n${JSON.stringify(args.analysis, null, 2)}\n\nCurrent scene prompt:\n${args.currentPrompt}\n\nUser refinement: ${args.userMessage}`,
          },
        ],
      },
    ],
  });

  return parseJson<RefinePlan>(extractText(message), "planRefinement");
}
