# Peggy

An agentic product ad generator. Drop in a product image and a brief, and Peggy reads both, plans the shot, renders it with Gemini, then iterates with you by chat. Works prompt-only if you don't have a product image yet.

Built for the Olivia Applied Agentic Developer take-home.

## What it does

1. **Upload anything, write anything, or both.** Drop a product image into the chat box, type a brief, or describe a scene from scratch. Peggy invents the product from your prompt if you don't have one.
2. **Peggy reads the product and the brief together.** If you say "make it pink" against a green mug, the intro acknowledges the swap instead of complimenting the green you just asked to change.
3. **Claude plans, Gemini renders.** Claude Sonnet 4.6 enhances the prompt, names the campaign, picks the strategy. Gemini 2.5 Flash Image generates the scene because it preserves subject identity across edits.
4. **Refine by chat.** "Warm the highlights." "Drop the rope." "Add a headline that says 'Slow mornings'." After each render Peggy runs a vision pass on the output and proposes three follow-up tweaks based on what came back.
5. **Branch from any version.** Click a thumbnail in the version rail to make it the new base for refinement.
6. **Sessions persist.** Recent work shows as a rail on the empty state, click to resume, and the full transcript exports as Markdown.

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

Every tool call lands in the agent transcript as a quiet collapsible stamp, so the reasoning is visible without taking over the conversation.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind v4**, warm cream and burnt sienna palette
- **Fraunces** for display, **DM Sans** for UI, **Geist Mono** for chrome
- **@anthropic-ai/sdk** with `claude-sonnet-4-6` for analysis, planning, refinement routing, tweak proposing
- **@google/genai** with `gemini-2.5-flash-image` for generation and conversational editing
- **@libsql/client** (Turso) for sessions, versions, and image BLOBs in the same DB. Schema bootstraps on first request.
- **Zustand** for client state and optimistic user-turn rendering

## Run it locally

Create `.env.local` with these four keys:

```env
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

`TURSO_DATABASE_URL` accepts either a Turso URL (`turso db create ad-agent && turso db show ad-agent --url`) or a local SQLite file in dev (`file:./.local.db`, no auth token needed).

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

- **Claude as orchestrator, not generator.** Anthropic doesn't generate images, so Claude does the judgment work: analyze, plan, propose tweaks. Gemini 2.5 Flash Image handles pixels because it preserves subject identity across edits. Without that property, a product ad generator turns your mug into something kinda-mug-shaped.
- **Brief-aware intro.** When there's a brief alongside the image, the analysis step reads them together. The intro won't praise features you just asked to change.
- **Image-aware tweak chips.** After each render Claude runs a vision pass on the output and proposes three follow-up moves based on what came back. The original analysis chips don't persist past the first render.
- **Optimistic user turns.** Messages render the instant you hit send instead of waiting on the 15-second server round-trip. The server's eventual response replaces the local copy, made idempotent by `appendUserTurnIfNew`.
- **Structured JSON over tool use.** System-prompted structured outputs are faster and less brittle than the tool-call dance at this scope, and the reasoning shows directly in the transcript.
- **Single-page state machine.** Empty state and session view share one route, no navigation between them.
- **One vendor for persistence.** Turso (libsql) handles metadata and image BLOBs in the same database. The "right" architecture splits images out to Vercel Blob or R2; for a take-home, one secret is enough, and serving image bytes from the DB means Vercel cold starts can't 404 them.

## What's deliberately not here

- **No auth.** OAuth microservice felt out of scope. Side benefit: the recent-work rail is a live demo of other people's example use cases.
- **No streaming.** Assistant reasoning lands in the transcript after each round-trip rather than as it generates. SSE is the next pass.
- **No critique loop.** `critique_result` exists as a `ToolName` and the orchestrator path is sketched; the self-correction retry isn't wired in.
- **No GPT-Image-1.5 for headlines.** Gemini's in-image text is decent but not best-in-class. Production ads would call out to a dedicated typography renderer.
- **No rate limiting or telemetry.**
