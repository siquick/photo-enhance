'use client';
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ProcessImageResponse } from '@/types/image';

export default function UploadCard() {
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [resultSrc, setResultSrc] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  // Mime is managed on the server response; no local state needed.
  const [loading, setLoading] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setOriginalSrc(reader.result as string);
    reader.readAsDataURL(file);
    setResultSrc(null);
  };

  const submit = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError('Please select an image file');
      return;
    }
    const form = new FormData();
    form.set('image', file);
    if (instruction) form.set('instruction', instruction);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/image/process', { method: 'POST', body: form });
      const json: ProcessImageResponse = await res.json();
      setLoading(false);
      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error : 'Request failed');
        return;
      }
      if ('imageBase64' in json) {
        setResultSrc(`data:${json.mimeType};base64,${json.imageBase64}`);
      }
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : 'Network error';
      setError(msg);
    }
  };

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Image Edit with Gemini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          onChange={onFileChange}
          type="file"
          accept="image/*"
          capture="environment"
        />
        <Textarea
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          placeholder="Optional: describe your edit"
        />
        <Button onClick={submit} disabled={loading}>{loading ? 'Processing…' : 'Submit'}</Button>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {(originalSrc || resultSrc) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <h4 className="text-sm font-medium mb-2">Before</h4>
              {originalSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <>
                  <img
                    src={originalSrc}
                    alt="original"
                    className="w-full h-auto rounded-xl border cursor-zoom-in"
                    onClick={() => setLightboxSrc(originalSrc)}
                  />
                  <div className="mt-2">
                    <a
                      href={originalSrc}
                      download="original.jpg"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-foreground text-background hover:opacity-90 h-9 px-3"
                    >
                      Download
                    </a>
                  </div>
                </>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">After</h4>
              {resultSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <>
                  <img
                    src={resultSrc}
                    alt="edited"
                    className="w-full h-auto rounded-xl border cursor-zoom-in"
                    onClick={() => setLightboxSrc(resultSrc)}
                  />
                  <div className="mt-2">
                    <a
                      href={resultSrc}
                      download="edited.jpg"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-foreground text-background hover:opacity-90 h-9 px-3"
                    >
                      Download
                    </a>
                  </div>
                </>
              ) : (
                <div className="w-full aspect-video rounded-xl border flex items-center justify-center text-sm text-foreground/60">
                  No result yet
                </div>
              )}
            </div>
          </div>
        )}
        {lightboxSrc && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightboxSrc(null)}
            role="dialog"
            aria-modal="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxSrc}
              alt="preview"
              className="max-h-[90vh] max-w-[95vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              aria-label="Close"
              onClick={() => setLightboxSrc(null)}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/90 text-black font-semibold"
            >
              ×
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
