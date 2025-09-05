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
  const [, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileState, setFileState] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedSrc, setCapturedSrc] = useState<string | null>(null);
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  // Camera UX state
  // Full-screen camera UI state
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number }>({ min: 1, max: 1, step: 0.1 });
  const [zoom, setZoom] = useState(1); // logical zoom value
  const [fallbackScale, setFallbackScale] = useState(1); // CSS scale fallback
  const lastTwoTouchDistRef = useRef<number | null>(null);
  // Preset (single-select)
  type PresetKey = 'leica' | 'trix' | 'portrait' | 'street' | 'cinematic';
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [pulse, setPulse] = useState(false);

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
      setToast('Please select an image file');
      return;
    }
    const form = new FormData();
    form.set('image', file);
    if (selectedPreset) form.set('preset', selectedPreset);
    if (instruction) form.set('instruction', instruction);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/image/process', { method: 'POST', body: form });
      const json: ProcessImageResponse = await res.json();
      setLoading(false);
      if (!res.ok || 'error' in json) {
        setToast('error' in json ? json.error : 'Request failed');
        return;
      }
      if ('imageBase64' in json) {
        setResultSrc(`data:${json.mimeType};base64,${json.imageBase64}`);
      }
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : 'Network error';
      setToast(msg);
    }
  };

  // Camera: start/stop stream helpers
  const startStream = async () => {
    try {
      if (streamRef.current) return; // already running
      const constraints: MediaStreamConstraints = {
        video: { facingMode: isMobile ? 'user' : 'environment' },
      };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback: let the browser pick any camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // Detect zoom support
      const [track] = stream.getVideoTracks();
      const capsUnknown = (track.getCapabilities && track.getCapabilities()) as unknown as {
        zoom?: number | { min?: number; max?: number; step?: number };
        torch?: boolean;
      };
      const zoomCaps = capsUnknown?.zoom as { min?: number; max?: number; step?: number } | number | undefined;
      if (typeof zoomCaps === 'number' || (zoomCaps && typeof zoomCaps === 'object')) {
        const min = (typeof zoomCaps === 'object' ? zoomCaps.min : undefined) ?? 1;
        const max = (typeof zoomCaps === 'object' ? zoomCaps.max : undefined) ?? 5;
        const step = (typeof zoomCaps === 'object' ? zoomCaps.step : undefined) ?? 0.1;
        setZoomSupported(true);
        setZoomRange({ min, max, step });
        setZoom(Math.min(Math.max(zoom, min), max));
      } else {
        setZoomSupported(false);
      }
      // Torch support
      setTorchSupported(Boolean((capsUnknown as { torch?: boolean } | undefined)?.torch));
    } catch {
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
    setFlash(true); setTimeout(() => setFlash(false), 140);
    setPulse(true); setTimeout(() => setPulse(false), 220);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { (navigator as unknown as { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(30); } catch {}
    }
    // Pause stream preview but keep tracks alive for retake
  };

  // Note: do not auto-open camera on load; only via explicit user action.

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

  // Tap to focus ring (visual) and try to apply track constraints if supported
  const onVideoTap: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const container = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - container.left;
    const y = e.clientY - container.top;
    setFocusRing({ x, y, show: true });
    setTimeout(() => setFocusRing((r) => ({ ...r, show: false })), 900);
  };

  // Pinch to zoom (two-finger)
  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTwoTouchDistRef.current = Math.hypot(dx, dy);
    }
  };
  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = async (e) => {
    if (e.touches.length === 2 && lastTwoTouchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = (dist - lastTwoTouchDistRef.current) / 150; // sensitivity
      lastTwoTouchDistRef.current = dist;
      if (zoomSupported && streamRef.current) {
        const [track] = streamRef.current.getVideoTracks();
        const next = Math.min(Math.max(zoom + delta, zoomRange.min), zoomRange.max);
        try {
          const constraints = { advanced: [{ zoom: next }] } as unknown as MediaTrackConstraints;
          await track.applyConstraints(constraints);
          setZoom(next);
        } catch {
          // fallback to CSS scale
          const f = Math.min(Math.max(fallbackScale + delta, 1), 3);
          setFallbackScale(f);
        }
      } else {
        const f = Math.min(Math.max(fallbackScale + delta, 1), 3);
        setFallbackScale(f);
      }
    }
  };
  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    if (lastTwoTouchDistRef.current) lastTwoTouchDistRef.current = null;
  };

  // no bottom sheet; full-screen camera

  const charCount = instruction.length;
  const togglePreset = (p: PresetKey) => {
    setSelectedPreset(prev => (prev === p ? null : p));
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const [track] = streamRef.current.getVideoTracks();
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as unknown as MediaTrackConstraints);
      setTorchOn(!torchOn);
    } catch {
      setToast('Torch not available');
      setTimeout(() => setToast(null), 1400);
    }
  };

  return (
    <Card className="mx-auto max-w-6xl border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Image Edit with Gemini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/15 to-white/5">
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
                    <p className="text-sm font-medium">Tap to take a photo or upload</p>
                    <p className="mt-1 text-xs text-foreground/60">PNG, JPG, or WebP — up to 8MB</p>
                  </div>
                </div>
                <input
                  ref={inputRef}
                  onChange={onFileChange}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={openCamera}>Use Camera</Button>
              <Button variant="secondary" onClick={() => inputRef.current?.click()}>Upload Photo</Button>
            </div>

            <div>
              <Textarea
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                placeholder="Optional: describe your edit (e.g., soften shadows, add subtle vignette)"
              />
              <div className="mt-1 text-right text-xs text-foreground/50">{charCount}/500</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['leica','Leica Color'],
                ['trix','Tri‑X B&W'],
                ['portrait','Portrait Soft'],
                ['street','Street Contrast'],
                ['cinematic','Cinematic'],
              ].map(([key, label]) => {
                const active = selectedPreset === (key as PresetKey);
                return (
                  <button
                    key={key}
                    className={[
                      'rounded-full px-3 py-1 text-xs border transition-colors',
                      active ? 'bg-white text-black border-white' : 'border-white/15 hover:bg-white/10'
                    ].join(' ')}
                    onClick={() => togglePreset(key as PresetKey)}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex gap-3">
              <Button onClick={submit} disabled={loading}>
                {loading ? 'Processing…' : 'Process Image'}
              </Button>
              <Button variant="secondary" onClick={() => { setOriginalSrc(null); setResultSrc(null); setFileState(null); setInstruction(''); setError(null); }}>
                Reset
              </Button>
            </div>
            {/* Page-level mobile action bar (truly floating) */}
            {(!cameraOpen) && (
              <div className="md:hidden fixed left-0 right-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                <div className="flex gap-3 pointer-events-auto">
                  <Button className="flex-1" onClick={submit} disabled={loading}>{loading ? 'Processing…' : 'Process'}</Button>
                  <Button className="flex-1" variant="secondary" onClick={() => { setOriginalSrc(null); setResultSrc(null); setFileState(null); setInstruction(''); setError(null); }}>Reset</Button>
                </div>
              </div>
            )}
          </section>

          <section className="lg:col-span-7">
            {resultSrc ? (
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-foreground/60">After</div>
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resultSrc}
                    alt="edited"
                    className="w-full h-auto object-contain cursor-zoom-in"
                    onClick={() => setLightboxSrc(resultSrc)}
                  />
                  {loading && (
                    <div className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-[1px]">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                    </div>
                  )}
                </div>
                <div className="mt-2 flex gap-3">
                  <a
                    href={resultSrc}
                    download="edited.jpg"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white text-black hover:bg-white/90 h-9 px-3"
                  >
                    Download
                  </a>
                  {originalSrc && (
                    <button
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white/10 text-white hover:bg-white/15 h-9 px-3"
                      onClick={() => setShowCompare(true)}
                    >
                      Compare
                    </button>
                  )}
                </div>
              </div>
            ) : originalSrc ? (
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-foreground/60">Preview</div>
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalSrc}
                    alt="original"
                    className="w-full h-auto object-contain cursor-zoom-in"
                    onClick={() => setLightboxSrc(originalSrc)}
                  />
                </div>
                <div className="mt-2">
                  <a
                    href={originalSrc}
                    download="original.jpg"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white text-black hover:bg-white/90 h-9 px-3"
                  >
                    Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-foreground/60">
                Your edits will appear here. Start with the camera or upload a photo.
              </div>
            )}
          </section>
        </div>
        {/* Toast */}
        {toast && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-[max(16px,env(safe-area-inset-bottom))] z-50">
            <div className="rounded-full bg-white text-black shadow px-4 py-2 text-sm animate-[fadeIn_.2s_ease]">
              {toast}
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

        {showCompare && originalSrc && resultSrc && (
          <CompareSlider beforeSrc={originalSrc} afterSrc={resultSrc} onClose={() => setShowCompare(false)} />
        )}

        {cameraOpen && (
          <div className="fixed inset-0 z-50 bg-black" role="dialog" aria-modal="true">
            {/* Top bar */}
            <div className="absolute top-[max(8px,env(safe-area-inset-top))] left-0 right-0 flex items-center justify-between px-4">
              <button
                aria-label="Close"
                onClick={() => { stopStream(); setCameraOpen(false); setCapturedSrc(null); }}
                className="h-9 rounded-full px-3 bg-white/10 text-white hover:bg-white/15 text-sm"
              >
                Close
              </button>
              {!capturedSrc && (
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <button
                    onClick={() => setShowGrid(s => !s)}
                    className="rounded-full px-2 py-1 bg-white/10 hover:bg-white/15"
                    aria-pressed={showGrid}
                  >Grid</button>
                  {torchSupported && (
                    <button
                      onClick={toggleTorch}
                      className="rounded-full px-2 py-1 bg-white/10 hover:bg-white/15"
                      aria-pressed={torchOn}
                    >Torch</button>
                  )}
                  <span className="opacity-70 hidden sm:inline">Tap to focus • Pinch to zoom</span>
                </div>
              )}
            </div>

            {/* Live / Captured full-screen */}
            <div
              className="absolute inset-0"
              onClick={onVideoTap}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {capturedSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capturedSrc} alt="captured" className="h-full w-full object-contain" />
              ) : (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  style={{ transform: `scale(${fallbackScale})` }}
                  autoPlay
                  playsInline
                  muted
                />
              )}
              {focusRing.show && (
                <div
                  className="absolute pointer-events-none border-2 border-white rounded-full"
                  style={{ width: 64, height: 64, left: focusRing.x - 32, top: focusRing.y - 32 }}
                />
              )}
              {showGrid && !capturedSrc && (
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
                </div>
              )}
            </div>

            {/* Bottom controls */}
            <div className="absolute left-0 right-0 bottom-[max(10px,env(safe-area-inset-bottom))] flex items-center justify-center gap-6 px-6">
              {!capturedSrc ? (
                <>
                  <button onClick={capturePhoto} aria-label="Capture" className="h-16 w-16 rounded-full bg-white shadow-[0_0_0_4px_rgba(0,0,0,0.6)]" style={{ animation: pulse ? 'pulseCapture .22s ease' : undefined }} />
                </>
              ) : (
                <div className="flex gap-3 w-full max-w-md justify-center">
                  <Button variant="secondary" onClick={() => setCapturedSrc(null)} className="flex-1">Retake</Button>
                  <Button onClick={useCaptured} className="flex-1">Use Photo</Button>
                </div>
              )}
            </div>
            {flash && <div className="pointer-events-none absolute inset-0 bg-white" style={{ animation: 'flash .14s ease' }} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
