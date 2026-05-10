# Ad Agent

An agentic product ad generator. Upload a product, brief the agent in natural language, iterate on the result by chat.

Built for the Olivia Applied Agentic Developer take-home.

## What it does

1. **Upload** a product image (JPEG / PNG / WEBP / GIF, up to 8 MB).
2. **Claude Opus/Sonnet** runs a vision pass to produce a structured product brief — category, materials, dominant colors, four candidate scene briefs, and pitfalls to avoid during generation.
3. **You prompt** in plain language ("lifestyle photo on a marble countertop") or pick one of the agent's suggested scenes.
4. Claude expands the prompt into a precise director's brief informed by the product analysis, then calls **Gemini 2.5 Flash Image** ("Nano Banana") to render — the model preserves the product's identity across edits.
5. **Refine by chat** — "make it warmer", "add a headline that says 'Slow mornings'". Claude routes the intent, rewrites the full prompt to preserve untouched elements, and Gemini does the edit.
6. **Export** the agent transcript as Markdown at any point.

## The agent loop

```
upload
  └─ analyze_product (Claude vision → ProductAnalysis JSON)
       └─ suggestedScenes shown as chips

prompt
  └─ enhance_prompt (Claude → GeneratePlan JSON)
       └─ generate_scene (Gemini image gen with product image)

refinement (chat turn)
  └─ refine_scene (Claude → RefinePlan JSON, rewrites the full scene prompt)
       └─ generate_scene (Gemini multi-turn edit, preserves subject)
```

Every tool call lands in the agent transcript as a collapsible card — the agent's decisions are visible, not hidden.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind v4**
- **@anthropic-ai/sdk** — `claude-sonnet-4-6` for analysis, planning, and refinement routing
- **@google/genai** — `gemini-2.5-flash-image` for image generation and editing
- **Zustand** for client state
- In-memory blob + session storage (single-region, ephemeral — fine for a demo, swap to Vercel Blob + Redis for production)

## Run it locally

```bash
cp .env.local.example .env.local
# fill in ANTHROPIC_API_KEY and GEMINI_API_KEY

npm install
npm run dev
```

Open http://localhost:3000.

## Project layout

```
app/
  page.tsx                 # state machine: empty → session view
  layout.tsx               # root layout
  api/
    upload/route.ts        # multipart upload → creates session + stores blob
    analyze/route.ts       # Claude vision pass
    generate/route.ts      # first scene generation
    refine/route.ts        # chat refinement turn
    image/[id]/route.ts    # serve image bytes from blob store
    session/[id]/route.ts  # session inspection
    transcript/route.ts    # markdown export
lib/
  agent/
    prompts.ts             # all system prompts
    claude.ts              # Anthropic SDK wrapper
    gemini.ts              # Google GenAI SDK wrapper
    orchestrator.ts        # the pipeline that ties them together
  storage/
    blob.ts                # image blob store (in-memory)
    session.ts             # session store (in-memory)
  client/
    api.ts                 # typed fetch wrappers
    store.ts               # Zustand store
  types.ts                 # shared types
components/
  upload/DropZone.tsx
  canvas/Canvas.tsx
  canvas/VersionRail.tsx
  chat/AgentTranscript.tsx
  chat/PromptBar.tsx
```

## Design notes

- **Claude as orchestrator, not generator.** Anthropic doesn't generate images; it's the judgment layer. Gemini 2.5 Flash Image was picked specifically for its subject-identity preservation across multi-turn edits — the property that makes a *product* ad generator viable.
- **Structured JSON over tool use.** For a 48-hour scope, system-prompted structured outputs are faster and less brittle than the tool-call dance, and the agent reasoning is visible in the transcript without ceremony.
- **Single-page state machine.** The empty state, generation state, and refinement state are the same route — no flash, no navigation, demo-friendly.
- **In-memory storage.** Real shipping would put images in Vercel Blob and sessions in Upstash; the wrappers are isolated so swapping is a one-file change.

## What's missing

In the interest of time: no auth, no persistence across restarts, no rate limiting, no streaming responses, no critique-loop / self-correction step (the architecture is set up for it — `critique_result` is already a `ToolName`), no headline overlay via GPT-Image-1.5. Each is one focused PR away.
