# AGENTS.md — Next.js + AI SDK + Gemini 2.5 Flash Image ("Nano Banana")

> **Purpose**: Give Codex everything needed to implement a web UI + API in **Next.js + TypeScript** that accepts a user‑captured or uploaded **image**, sends it to **Google Gemini 2.5 Flash Image (image generation/editing)** with a **specific system prompt**, and returns the **edited/generated image** to display in the UI. Uses **AI SDK** (`ai`, `@ai-sdk/google`) and **shadcn/ui** for the frontend.

---

## 1) Mission & Success Criteria

**Mission**

* Build an end‑to‑end image flow: capture/upload → API → Gemini → UI display.
* Keep the API stateless and mobile‑client friendly (the same API will be used by a future mobile app).

**Success Criteria**

* User can upload/take a photo, type optional instructions, submit, and see the returned image (PNG/WebP) in < 10s under typical conditions.
* API accepts **multipart/form-data** with an `image` file + optional `instruction` string.
* Gemini model used: **`gemini-2.5-flash-image-preview`** with **image output enabled**.
* Clear error states in UI (file too large, unsupported type, model safety block, etc.).
* Types are strict; lint/tests pass; reproducible with documented commands.

**Out of Scope for v1**

* Persistent storage (S3/GCS) — optional stub only.
* Auth; rate‑limiting beyond a simple per‑IP guard.

---

## 2) High‑Level Architecture

```
[User Device]
   └── Web UI (Next.js + shadcn) → POST /api/image/process (multipart: image + instruction)
                                  └── Node 22 runtime Route Handler
                                       ├─ Validate file/type/size
                                       ├─ Call AI SDK Google provider
                                       │    model: "gemini-2.5-flash-image-preview"
                                       │    system: SYSTEM_PROMPT
                                       │    responseModalities: ['TEXT','IMAGE']
                                       ├─ Extract image file(s) from result
                                       └─ Return { imageBase64, mimeType } or { fileUrl }
```

---

## 3) Tech Stack & Dependencies

* **Next.js 14/15** (App Router, Route Handlers, Node 22 runtime)
* **TypeScript (strict)**
* **AI SDK**: `ai`, `@ai-sdk/google`
* **UI**: `@/components/ui/*` via **shadcn/ui** + Tailwind CSS
* **Utilities**: `zod` for schema validation; optional `sharp` for sanity checks/format conversion; `uuid` for client image keys

**Environment**

* `GOOGLE_GENERATIVE_AI_API_KEY` (read server-side only)
* Optional: `ALLOWED_ORIGINS` (comma‑separated for CORS), `MAX_UPLOAD_MB` (default 8)

---

## 4) Folder & File Layout

```
.
├─ app/
│  ├─ api/
│  │  └─ image/
│  │     └─ process/route.ts          # POST (multipart) → Gemini → JSON with image
│  └─ page.tsx                        # Minimal upload UI
├─ components/
│  └─ upload-card.tsx                 # shadcn card: file input, preview, submit
├─ lib/
│  ├─ gemini.ts                       # provider init (google())
│  ├─ schema.ts                       # zod validators (instruction, file type/size)
│  └─ cors.ts                         # simple CORS helper
├─ types/
│  └─ image.ts                        # API response types
├─ styles/
│  └─ globals.css
├─ .env.example
├─ next.config.mjs
├─ tailwind.config.ts
├─ postcss.config.mjs
└─ package.json
```

---

## 5) API Contract

**Endpoint**: `POST /api/image/process`

**Request (multipart/form-data)**

* **image**: `File` (required) – png/jpg/webp, ≤ `MAX_UPLOAD_MB` MiB.
* **instruction**: `string` (optional) – user instruction (e.g., "brighten background, remove blemishes").

**Behavior**

* Applies a fixed **system prompt** (below) plus the optional user instruction.
* Calls Gemini **`gemini-2.5-flash-image-preview`** with **image output enabled**.

**Response (200)**

```ts
{
  imageBase64: string;   // base64-encoded image bytes
  mimeType: 'image/png' | 'image/webp' | 'image/jpeg';
  safety?: { blocked: boolean; reasons?: string[] };
}
```

**Response (4xx/5xx)**

```ts
{ error: string; details?: unknown }
```

**CORS**

* If `ALLOWED_ORIGINS` is set, respond with `Access-Control-Allow-Origin` for those origins.

---

## 6) Model Usage & Prompts

**Model**: `gemini-2.5-flash-image-preview`

**System Prompt (v1 – Leica Aesthetic)**

```
Transform this photograph to emulate the distinct and timeless aesthetic of a legendary Leica M-series rangefinder camera paired with a fast prime lens like a Summilux.

Core Rendering:
Render the image with rich, analog color science—deep, clean blacks without crushing shadow detail, and soft, natural highlight roll-off. Introduce high micro-contrast across the entire tonal range to create a tactile, three-dimensional 'pop' that separates the subject from the background.

Texture and Sharpness:
Apply sharpness that is crisp and resolving at the point of focus, but entirely avoid artificial digital over-sharpening. Overlay a fine, organic film grain, reminiscent of classic Kodak Portra for color or Tri-X for monochrome, to add character and eliminate any digital sterility.

Lens Characteristics:
If applicable to the composition, create a shallow depth of field with a smooth, creamy, and painterly bokeh. Add a subtle, natural vignette to gently frame the subject.

Final Mood and Exclusions:
The final result must possess character and soul—feeling less like a digital capture and more like a classic, cinematic, and masterfully crafted photograph. Crucially, avoid any trace of a modern over-processed HDR look, digital noise reduction artifacts, or unnaturally smooth, plastic-like textures.
```

**User Message Template**

```
If instruction is present, prepend: "Instruction: <instruction>"
Then attach the image file as a part.
```

**Provider Options (required)**

* `responseModalities: ['TEXT','IMAGE']` to receive image files.
* Optional `safetySettings` to block disallowed content.

---

## 7) Implementation Tasks (for Codex)

1. **Bootstrap & Config**

   * Initialize Next.js + Tailwind + shadcn (see Commands below).
   * Add `ai`, `@ai-sdk/google`, `zod`, `sharp` (optional), `uuid`.
   * Create `.env.example` with `GOOGLE_GENERATIVE_AI_API_KEY=`.

2. **Provider Setup (`lib/gemini.ts`)**

   * Export `google` provider instance that reads `process.env.GOOGLE_GENERATIVE_AI_API_KEY`.

3. **Validation (`lib/schema.ts`)**

   * Zod schema for `instruction` (≤ 500 chars) and accepted MIME types.

4. **CORS Helper (`lib/cors.ts`)**

   * Small utility to set `Access-Control-Allow-*` headers for `OPTIONS` and `POST`.

5. **API Route (`app/api/image/process/route.ts`)**

   * `export const runtime = 'nodejs'` (Node 22)
   * Parse `await req.formData()`; extract `File` for `image`, `instruction`.
   * Enforce size/type limits; convert `File` → `ArrayBuffer` → `Uint8Array`.
   * Call AI SDK `generateText` with:

     * `model: google('gemini-2.5-flash-image-preview')`
     * `system: SYSTEM_PROMPT`
     * `messages`: one user message with `text` (instruction if present) + file part
     * `providerOptions.google.responseModalities = ['TEXT','IMAGE']`
   * From `result.files`, find first `image/*`, read bytes, base64‑encode, return JSON.
   * Handle safety blocks; return `safety` info when present.

6. **UI (`components/upload-card.tsx`, `app/page.tsx`)**

   * shadcn Card: file selector/camera; preview thumbnail; text area for instruction; submit Button.
   * On submit, build `FormData` and `fetch('/api/image/process', { method: 'POST', body: form })`.
   * Show a loading state; display returned image via `src={'data:'+mime+';base64,'+imageBase64}`.

7. **Types (`types/image.ts`)**

   * Strongly type response contracts used in UI.

8. **Quality Gates**

   * Add `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` (stub) and ensure they pass.

9. **Docs**

   * Update this AGENTS.md (current file) with any deviations.

---

## 8) Reference Code (authoritative for Codex)

> Keep imports **ESM** and use **pnpm**.

**`lib/gemini.ts`**

```ts
// ESM
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
```

**`lib/schema.ts`**

```ts
import { z } from 'zod';

export const instructionSchema = z
  .string()
  .trim()
  .max(500, 'Instruction too long')
  .optional();

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function assertImageFile(file: File, maxMB = 8) {
  if (!ACCEPTED_TYPES.includes(file.type as any)) {
    throw new Error('Unsupported image type');
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxMB) throw new Error(`File too large: ${sizeMB.toFixed(1)} MB`);
}
```

**`lib/cors.ts`**

```ts
import { NextResponse } from 'next/server';

export function corsHeaders(origin?: string) {
  const allowed = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim());
  const allow = origin && allowed?.includes(origin) ? origin : allowed?.[0] ?? '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  } as const;
}

export function handleOptions(origin?: string) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}
```

**`app/api/image/process/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@/lib/gemini';
import { instructionSchema, assertImageFile } from '@/lib/schema';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are an expert photo editor. Given a user-provided image and an optional instruction, apply only the requested edits while preserving identity, composition, and scene context. Never add watermarks or text unless explicitly asked. Prefer subtle, realistic changes. Return the final edited image.`;

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') ?? undefined;
  const { handleOptions } = await import('@/lib/cors');
  return handleOptions(origin);
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') ?? undefined;
    const form = await req.formData();
    const file = form.get('image');
    const instruction = instructionSchema.parse(form.get('instruction') ?? undefined);

    if (!(file instanceof File)) throw new Error('Missing image file');
    assertImageFile(file, Number(process.env.MAX_UPLOAD_MB ?? 8));

    const bytes = new Uint8Array(await file.arrayBuffer());

    const result = await generateText({
      model: google('gemini-2.5-flash-image-preview'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            instruction ? { type: 'text', text: `Instruction: ${instruction}` } : undefined,
            { type: 'file', data: bytes, mediaType: file.type },
          ].filter(Boolean) as any,
        },
      ],
      providerOptions: {
        google: { responseModalities: ['TEXT', 'IMAGE'] },
      },
    });

    // Find first image in returned files
    const imageFile = result.files?.find(f => f.mediaType?.startsWith('image/'));
    if (!imageFile) throw new Error('No image returned by model');

    // In AI SDK, files provide arrayBuffer()
    // @ts-ignore – the type depends on the version; we support common cases
    const buf = imageFile.data instanceof Uint8Array
      ? imageFile.data
      : new Uint8Array(await imageFile.arrayBuffer());

    const base64 = Buffer.from(buf).toString('base64');
    const mime = imageFile.mediaType ?? 'image/png';

    return new NextResponse(
      JSON.stringify({ imageBase64: base64, mimeType: mime, safety: (result as any).providerMetadata?.google?.safetyRatings }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...(await import('@/lib/cors')).corsHeaders(origin) } },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Unexpected error' }, { status: 400 });
  }
}
```

**Minimal UI (`components/upload-card.tsx`)**

```tsx
'use client';
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function UploadCard() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [mime, setMime] = useState<string>('image/png');
  const [loading, setLoading] = useState(false);
  const [instruction, setInstruction] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMime(file.type);
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set('image', file);
    if (instruction) form.set('instruction', instruction);
    setLoading(true);
    const res = await fetch('/api/image/process', { method: 'POST', body: form });
    const json = await res.json();
    setLoading(false);
    if (json.imageBase64) setImgSrc(`data:${json.mimeType};base64,${json.imageBase64}`);
  };

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Image Edit with Gemini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input ref={inputRef} onChange={onFileChange} type="file" accept="image/*" capture="environment" />
        <Textarea value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="Optional: describe your edit" />
        <Button onClick={submit} disabled={loading}>{loading ? 'Processing…' : 'Submit'}</Button>
        {imgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt="result" className="rounded-xl border mt-2" />
        )}
      </CardContent>
    </Card>
  );
}
```

**`app/page.tsx`**

```tsx
import UploadCard from '@/components/upload-card';

export default function Page() {
  return (
    <main className="min-h-dvh p-6">
      <UploadCard />
    </main>
  );
}
```

---

## 9) Commands (pnpm only)

```bash
# Base
pnpm create next-app@latest . -- --ts --eslint --tailwind --app

# UI
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card textarea

# AI SDK + Google provider
pnpm add ai @ai-sdk/google @ai-sdk/react zod
# Optional utilities
pnpm add sharp uuid

# Dev
pnpm dev
pnpm lint
pnpm typecheck
```

---

## 10) Testing & Quality

* **Type**: `pnpm typecheck`
* **Lint**: `pnpm lint`
* **API smoke via cURL**:

```bash
curl -X POST http://localhost:3000/api/image/process \
  -F image=@/path/to/picture.jpg \
  -F instruction='soften shadows'
```

* **Playwright (optional)**: one E2E that uploads a fixture, asserts `img[src^="data:image/"]` appears within 30s.

---

## 11) Safety, Privacy & Limits

* **PII/Photos** never logged; do not persist images server‑side.
* Enforce size/type limits and reject SVG.
* Forward relevant **safety ratings** from provider in response for future UI handling.
* Add a simple per‑IP rate‑limit if needed (not required for v1).

---

## 12) How Codex Should Work in This Repo

* Treat this file as the **source of truth** for scope & contracts.
* Before proposing changes, run: `pnpm typecheck && pnpm lint`.
* Maintain the **API response shape** and update `types/image.ts` first if edits are required.
* Prefer small, composable PRs: provider init → API → UI → tests.
* Keep imports **ESM**; assume **pnpm**, not npm or yarn.

**Allowed Shell Actions** (ask for approval unless in Suggest mode):

* Installing packages, initializing shadcn, running dev server, generating components.

---

## 13) Config Snippets & Notes

* **Route runtime**: `export const runtime = 'nodejs'` (Node 22) for access to file bytes.
* **Mobile clients**: this API is CORS‑enabled; if strict origins are desired, set `ALLOWED_ORIGINS`.
* **Future storage**: return a presigned URL; keep the current base64 response for simplicity.
* **Image format**: prefer `image/webp`; if model returns jpeg, pass through.

---

## 14) Environment Setup (.env.example)

```
GOOGLE_GENERATIVE_AI_API_KEY=
ALLOWED_ORIGINS=http://localhost:3000
MAX_UPLOAD_MB=8
```

---

## 15) Glossary

* **Gemini 2.5 Flash Image / "Nano Banana"**: Google’s fast, reasoning‑aware image generation & editing model we call via AI SDK; the nickname "Nano Banana" is used informally in evals.
* **AI SDK**: Vercel’s TypeScript toolkit (`ai`) with providers like `@ai-sdk/google`.
* **shadcn/ui**: Headless, copy‑in React components for consistent UI.

---

## 16) Acceptance Checklist

* [ ] Upload works from laptop + mobile camera.
* [ ] `instruction` optional and respected.
* [ ] Model returns at least one `image/*` file; UI renders it.
* [ ] Errors render as human‑readable toasts/messages.
* [ ] Lint, types, and smoke cURL pass.

---

## 17) Change Log (keep updated)

* v0.1: Initial spec + skeleton code.
* v0.2: Updated to use Node 22 runtime and pnpm package management.
* v0.3: Replaced system prompt with Leica M-series aesthetic instructions.
