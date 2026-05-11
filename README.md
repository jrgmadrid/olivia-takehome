# Peggy

An agentic product ad generator. Drop in a product image and a brief — Peggy reads both, plans the shot, renders it with Gemini, and iterates with you by chat. Works prompt-only too, if you don't have a product image yet.

Built for the Olivia Applied Agentic Developer take-home.

## What it does

1. **Upload anything, write anything, or both.** Drop a product image into the chat box, type a brief, or just describe a scene from scratch — Peggy invents the product from your prompt if you don't have one.
2. **Peggy reads the product *and* the brief as a single unit.** If you said "make it pink" against a green mug, the intro acknowledges the swap. She doesn't praise the features you just asked to change.
3. **Claude plans, Gemini renders.** Claude Sonnet 4.6 enhances the prompt, names the campaign, and routes the strategy. Gemini 2.5 Flash Image generates the scene — chosen specifically because it preserves subject identity across edits.
4. **Refine by chat.** "Warm the highlights." "Drop the rope." "Add a headline that says 'Slow mornings'." After every render, Peggy looks at the result and proposes three fresh tweak chips — image-aware, not generic.
5. **Branch from any version.** Click a thumbnail in the version rail to make that the new base for refinement.
6. **Sessions persist.** Recent work appears as a rail on the empty state. Click to resume. Export the full transcript as Markdown.

## The agent loop

```
upload (optional)
  └─ analyze_product       (Claude vision — reads product + brief together)

first prompt
  └─ enhance_prompt        (Claude → enhanced prompt, strategy, notes, campaign title)
       └─ generate_scene   (Gemini — uses product image if attached, text-only otherwise)
            └─ propose_tweaks (Claude vision on the result — refresh the chip rail)

refinement (each chat turn)
  └─ refine_scene          (Claude → full new prompt preserving untouched elements)
       └─ generate_scene   (Gemini multi-turn edit, preserves subject)
            └─ propose_tweaks
```

Every tool call lands in the agent transcript as a quiet collapsible stamp — the agent's reasoning is visible, not hidden behind a chat bubble.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind v4** — warm cream + burnt sienna palette
- **Fraunces** (display) + **DM Sans** (UI) + **Geist Mono** (chrome)
- **@anthropic-ai/sdk** — `claude-sonnet-4-6` for analysis, planning, refinement routing, tweak proposing
- **@google/genai** — `gemini-2.5-flash-image` for generation and conversational editing
- **@libsql/client** — Turso for sessions / versions / image BLOBs (single-vendor persistence; schema bootstraps on first request)
- **Zustand** — client state with optimistic user-turn rendering

## Run it locally

Create a `.env.local` with these four keys:

```env
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

For `TURSO_DATABASE_URL` you can either point at a Turso DB (`turso db create ad-agent && turso db show ad-agent --url`) or use a local SQLite file in dev (`file:./.local.db`, no auth token needed).

Then:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project layout

```
app/
  page.tsx                       # state machine: empty → session view
  layout.tsx
  globals.css
  api/
    upload/route.ts              # multipart upload (image optional) → session
    analyze/route.ts             # Claude vision pass
    generate/route.ts            # first scene render
    refine/route.ts              # chat refinement turn
    image/[id]/route.ts          # serve image bytes from BLOB store
    session/[id]/route.ts        # session inspection
    session/[id]/select/route.ts # switch the active version
    sessions/route.ts            # recent sessions for the empty state rail
    transcript/route.ts          # markdown export
lib/
  agent/
    prompts.ts                   # all system prompts
    claude.ts                    # Anthropic SDK wrapper
    gemini.ts                    # Google GenAI SDK wrapper
    orchestrator.ts              # the pipeline that ties them together
  db/
    client.ts                    # libsql client (singleton)
    schema.ts                    # bootstrap + one-shot column migration
  storage/
    blob.ts                      # image BLOB store
    session.ts                   # session/version persistence
  client/
    api.ts                       # typed fetch wrappers
    store.ts                     # Zustand store + STATUS_LABELS
  types.ts                       # shared types
components/
  canvas/Canvas.tsx              # current image + spinner + shimmer skeleton
  canvas/VersionRail.tsx         # clickable version thumbnails
  chat/AgentTranscript.tsx       # user / assistant / tool turns
  chat/PromptBar.tsx             # textarea + suggestion chips
  empty/RecentSessions.tsx       # recent-work rail
  upload/EmptyBrief.tsx          # image-in-chatbox empty state
```

## Design notes

- **Claude as orchestrator, not generator.** Anthropic doesn't generate images. Claude is the judgment layer (analyze, plan, propose tweaks). Gemini 2.5 Flash Image was picked specifically because it preserves subject identity across edits — the property that makes a *product* ad generator viable instead of a generic image gen that morphs your mug into something kinda-mug-shaped.
- **Brief-aware intro.** When the user supplies a brief alongside the image, the analysis step reads them together. Saying "the green is great" when the user asked to make it pink is exactly the failure mode the system prompt is wired against.
- **Image-aware tweak chips.** After every render, Claude takes a vision pass on the result and proposes three sharp follow-up moves — referencing what's actually on screen, not the original analysis. Stale suggestions don't survive a refinement.
- **Optimistic user turns.** Messages render the instant you hit send, not after the 15s server round-trip. The server's eventual response replaces the local copy (idempotent via `appendUserTurnIfNew`).
- **Structured JSON over tool use.** For a 48-hour scope, system-prompted structured outputs are faster and less brittle than the tool-call dance, and the agent's reasoning is visible in the transcript without ceremony.
- **Single-page state machine.** Empty state and session view are the same route, no flash, no navigation.
- **One vendor for persistence.** Turso (libsql) handles metadata *and* image BLOBs. Cleaner architecture would split images out to Vercel Blob or R2, but for a take-home one secret is enough and the cold-start image-404 problem on Vercel disappears as a side effect.

## What's deliberately not here

- **No auth or user sessions.** Building an OAuth microservice felt out of scope. Upside: you can browse all the sessions in the recent-work rail as example use cases.
- **No streaming.** The assistant's reasoning lands in the transcript after each round-trip rather than as it generates. The wire is built for it; SSE is the next pass.
- **No critique loop.** `critique_result` is already a `ToolName` and the orchestrator path is sketched, but the self-correction retry isn't implemented yet.
- **No headline copy via GPT-Image-1.5.** Gemini's in-image text is decent but not best-in-class; for production ads I'd add a second renderer for typography.
- **No rate limiting, no telemetry.** This is a take-home, not a service.
