import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import type { GeneratedFile } from 'ai';
import { google } from '@/lib/gemini';
import { instructionSchema, assertImageFile } from '@/lib/schema';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SYSTEM_PROMPT = `Transform this photograph to emulate the distinct and timeless aesthetic of a legendary Leica M-series rangefinder camera paired with a fast prime lens like a Summilux.

Core Rendering:
Render the image with rich, analog color science—deep, clean blacks without crushing shadow detail, and soft, natural highlight roll-off. Introduce high micro-contrast across the entire tonal range to create a tactile, three-dimensional 'pop' that separates the subject from the background.

Texture and Sharpness:
Apply sharpness that is crisp and resolving at the point of focus, but entirely avoid artificial digital over-sharpening. Overlay a fine, organic film grain, reminiscent of classic Kodak Portra for color or Tri-X for monochrome, to add character and eliminate any digital sterility.

Lens Characteristics:
If applicable to the composition, create a shallow depth of field with a smooth, creamy, and painterly bokeh. Add a subtle, natural vignette to gently frame the subject.

Final Mood and Exclusions:
The final result must possess character and soul—feeling less like a digital capture and more like a classic, cinematic, and masterfully crafted photograph. Crucially, avoid any trace of a modern over-processed HDR look, digital noise reduction artifacts, or unnaturally smooth, plastic-like textures.`;

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

    if (!(file instanceof File)) throw new Error('Missing image file');
    assertImageFile(file, Number(process.env.MAX_UPLOAD_MB ?? 8));

    const bytes = new Uint8Array(await file.arrayBuffer());

    const content: Array<
      | { type: 'text'; text: string }
      | { type: 'file'; data: Uint8Array; mediaType: string }
    > = [];
    // Include the Leica system style as an explicit first user text part
    // to ensure the instruction is always applied, regardless of provider handling.
    content.push({ type: 'text', text: SYSTEM_PROMPT });
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
