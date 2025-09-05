'use client';
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ProcessImageResponse } from '@/types/image';
import CompareSlider from '@/components/compare-slider';

export default function UploadCard() {
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [resultSrc, setResultSrc] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  // Mime is managed on the server response; no local state needed.
  const [loading, setLoading] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileState, setFileState] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedSrc, setCapturedSrc] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setOriginalSrc(reader.result as string);
    reader.readAsDataURL(file);
    setResultSrc(null);
    setFileState(file);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setOriginalSrc(reader.result as string);
    reader.readAsDataURL(file);
    setResultSrc(null);
    setFileState(file);
  };

  const submit = async () => {
    const file = fileState ?? inputRef.current?.files?.[0] ?? null;
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

  // Camera: start/stop stream helpers
  const startStream = async () => {
    try {
      if (streamRef.current) return; // already running
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Unable to access camera. Check permissions.');
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const openCamera = () => {
    setCameraOpen(true);
    setCapturedSrc(null);
    startStream();
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 1080;
    const h = video.videoHeight || 1440;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedSrc(dataUrl);
    // Pause stream preview but keep tracks alive for retake
  };

  const useCaptured = async () => {
    if (!capturedSrc) return;
    // Convert data URL to File
    const res = await fetch(capturedSrc);
    const blob = await res.blob();
    const file = new File([blob], 'capture.jpg', { type: blob.type || 'image/jpeg' });
    setOriginalSrc(capturedSrc);
    setFileState(file);
    setCameraOpen(false);
    stopStream();
  };

  const charCount = instruction.length;

  return (
    <Card className="mx-auto max-w-6xl border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Image Edit with Gemini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="lg:col-span-5 space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={[
                'group relative rounded-xl border border-dashed cursor-pointer transition-colors',
                'border-white/15 hover:border-white/30 bg-white/[0.03] p-6',
                isDragging ? 'border-white/50 bg-white/[0.06]' : '',
              ].join(' ')}
            >
              <div className="pointer-events-none">
                <div className="mx-auto grid place-items-center h-12 w-12 rounded-full bg-white/10 text-white/80">
                  {/* Clean camera icon */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3c.3 0 .45 0 .6-.05.14-.05.27-.13.38-.25.11-.11.2-.25.35-.51l.16-.28c.19-.33.28-.5.42-.62a1.2 1.2 0 0 1 .5-.26C10.38 3.99 10.58 4 10.98 4h2.04c.4 0 .6 0 .81.03.18.03.35.1.5.21.14.1.23.25.42.57l.17.3c.16.29.24.44.35.56.1.1.23.18.37.23.17.05.33.05.64.05h1.33A2.5 2.5 0 0 1 20 8.5v7A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5v-7Z" fill="currentColor"/>
                    <circle cx="12" cy="12" r="3.75" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="18" cy="8" r="0.8" fill="currentColor"/>
                  </svg>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium">Drop a photo here or click to upload</p>
                  <p className="mt-1 text-xs text-foreground/60">PNG, JPG, or WebP — up to 8MB</p>
                </div>
              </div>
              <input
                ref={inputRef}
                onChange={onFileChange}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => inputRef.current?.click()}>Upload Photo</Button>
              <Button variant="secondary" onClick={openCamera}>Use Camera</Button>
            </div>

            <div>
              <Textarea
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                placeholder="Optional: describe your edit (e.g., soften shadows, add subtle vignette)"
              />
              <div className="mt-1 text-right text-xs text-foreground/50">{charCount}/500</div>
            </div>

            <div className="flex gap-3">
              <Button onClick={submit} disabled={loading}>
                {loading ? 'Processing…' : 'Process Image'}
              </Button>
              <Button variant="secondary" onClick={() => { setOriginalSrc(null); setResultSrc(null); setFileState(null); setInstruction(''); setError(null); }}>
                Reset
              </Button>
            </div>
          </section>

          <section className="lg:col-span-7">
            {(originalSrc || resultSrc) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-foreground/60">Before</div>
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {originalSrc && (
                      <img
                        src={originalSrc}
                        alt="original"
                        className="w-full h-auto object-contain cursor-zoom-in"
                        onClick={() => setLightboxSrc(originalSrc)}
                      />
                    )}
                  </div>
                  {originalSrc && (
                    <div className="mt-2">
                      <a
                        href={originalSrc}
                        download="original.jpg"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white text-black hover:bg-white/90 h-9 px-3"
                      >
                        Download
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-foreground/60">After</div>
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {resultSrc ? (
                      <img
                        src={resultSrc}
                        alt="edited"
                        className="w-full h-auto object-contain cursor-zoom-in"
                        onClick={() => setLightboxSrc(resultSrc)}
                      />
                    ) : (
                      <div className="aspect-video w-full grid place-items-center text-sm text-foreground/60">No result yet</div>
                    )}
                    {loading && (
                      <div className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-[1px]">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                      </div>
                    )}
                  </div>
                  {resultSrc && (
                    <div className="mt-2 flex gap-3">
                      <a
                        href={resultSrc}
                        download="edited.jpg"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white text-black hover:bg-white/90 h-9 px-3"
                      >
                        Download
                      </a>
                      <button
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white/10 text-white hover:bg-white/15 h-9 px-3"
                        onClick={() => setShowCompare(true)}
                      >
                        Compare
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-foreground/60">
                Your edits will appear here. Upload a photo to begin.
              </div>
            )}
          </section>
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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

        {showCompare && originalSrc && resultSrc && (
          <CompareSlider beforeSrc={originalSrc} afterSrc={resultSrc} onClose={() => setShowCompare(false)} />
        )}

        {cameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between p-3">
              <div className="text-sm text-white/80">Camera</div>
              <button
                aria-label="Close camera"
                onClick={() => { stopStream(); setCameraOpen(false); setCapturedSrc(null); }}
                className="h-9 w-9 rounded-md bg-white text-black font-semibold"
              >
                ×
              </button>
            </div>
            <div className="flex-1 grid place-items-center p-3">
              <div className="w-full max-w-md aspect-[3/4] bg-black rounded-xl overflow-hidden border border-white/10">
                {capturedSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={capturedSrc} alt="captured" className="h-full w-full object-contain" />
                ) : (
                  <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                )}
              </div>
            </div>
            <div className="p-3 flex items-center justify-center gap-3">
              {!capturedSrc ? (
                <>
                  <Button onClick={capturePhoto}>Capture</Button>
                  <Button variant="secondary" onClick={() => { startStream(); }}>Retry Camera</Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setCapturedSrc(null)}>Retake</Button>
                  <Button onClick={useCaptured}>Use Photo</Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
