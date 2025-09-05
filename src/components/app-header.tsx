'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export default function AppHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="mb-10 flex items-center justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em]">
          Photo Boost
          <span className="ml-2 inline-block rounded-full border border-white/10 px-2 py-[2px] text-xs text-foreground/70 align-middle">Leica Look</span>
        </h1>
        <p className="mt-2 text-sm text-foreground/60">
          Transform your photos with Leica‑inspired color science and micro‑contrast.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => setOpen(true)}>Help</Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="How it works">
        <ol className="list-decimal pl-5 space-y-2">
          <li>Tap <b>Use Camera</b> or <b>Upload Photo</b>.</li>
          <li>Optionally add an instruction (e.g., “soften shadows”).</li>
          <li>Tap <b>Process Image</b>. Your edit appears in seconds.</li>
        </ol>
        <div className="mt-4 text-xs text-foreground/60">
          Images are processed in memory and never stored server‑side. Max 8MB.
        </div>
      </Modal>
    </header>
  );
}

