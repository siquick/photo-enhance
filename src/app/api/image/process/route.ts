import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import type { GeneratedFile } from 'ai';
import { google } from '@/lib/gemini';
import { instructionSchema, assertImageFile } from '@/lib/schema';
import { SYSTEM_PROMPT } from '@/lib/prompt';

export const runtime = 'nodejs';
export const maxDuration = 30;

// SYSTEM_PROMPT imported from '@/lib/prompt'

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') ?? undefined;
  const { handleOptions } = await import('@/lib/cors');
  return handleOptions(origin);
}

type TextResultWithFiles = {
  files?: GeneratedFile[];
  providerMetadata?: { google?: { safetyRatings?: unknown } } | Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') ?? undefined;
    const form = await req.formData();
    const file = form.get('image');
    const instruction = instructionSchema.parse(form.get('instruction') ?? undefined);
    const presetKey = (form.get('preset') ?? undefined) as string | undefined;

    const PRESET_TEXTS: Record<string, string> = {
      leica: 'Render in Leica color with fine grain and gentle contrast.',
      trix: 'Convert to monochrome with Tri‑X-like grain and tonal curve.',
      portrait: 'Portrait: preserve skin texture, soften shadows, subtle warm tone.',
      street: 'Street: higher micro‑contrast, deeper blacks, minimal saturation shift.',
      cinematic: 'Cinematic: gentle teal‑orange balance, soft highlight roll‑off, fine grain.',
    };
    const presetText = presetKey ? PRESET_TEXTS[presetKey] : undefined;

    if (!(file instanceof File)) throw new Error('Missing image file');
    assertImageFile(file, Number(process.env.MAX_UPLOAD_MB ?? 8));

    const bytes = new Uint8Array(await file.arrayBuffer());

    const content: Array<
      | { type: 'text'; text: string }
      | { type: 'file'; data: Uint8Array; mediaType: string }
    > = [];
    // Compose system + preset for robustness as first user text part.
    const combinedSystem = presetText ? `${SYSTEM_PROMPT}\n\nPRESET STYLE:\n${presetText}` : SYSTEM_PROMPT;
    content.push({ type: 'text', text: combinedSystem });
    if (instruction) content.push({ type: 'text', text: `Instruction: ${instruction}` });
    content.push({ type: 'file', data: bytes, mediaType: file.type });

    const result = (await generateText({
      model: google('gemini-2.5-flash-image-preview'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      providerOptions: {
        google: { responseModalities: ['TEXT', 'IMAGE'] },
      },
    })) as unknown as TextResultWithFiles;

    const imageFile = result.files?.find((f) => f.mediaType?.startsWith('image/'));
    if (!imageFile) throw new Error('No image returned by model');

    // AI SDK returns GeneratedFile with base64/uint8Array/mediaType
    const base64 = imageFile.base64 ?? Buffer.from(imageFile.uint8Array).toString('base64');
    const mime = imageFile.mediaType ?? 'image/png';

    const headers = { 'Content-Type': 'application/json', ...(await import('@/lib/cors')).corsHeaders(origin) };
    let safety: unknown = undefined;
    if (result.providerMetadata && typeof result.providerMetadata === 'object' && 'google' in result.providerMetadata) {
      const g = (result.providerMetadata as { google?: { safetyRatings?: unknown } }).google;
      safety = g?.safetyRatings;
    }

    return new NextResponse(
      JSON.stringify({ imageBase64: base64, mimeType: mime, safety }),
      { status: 200, headers },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
