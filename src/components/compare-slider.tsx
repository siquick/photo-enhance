'use client';
import * as React from 'react';

type Props = {
  beforeSrc: string;
  afterSrc: string;
  onClose: () => void;
};

export default function CompareSlider({ beforeSrc, afterSrc, onClose }: Props) {
  const [pos, setPos] = React.useState(50); // percentage
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const onPointerMove = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el || (e.buttons & 1) === 0) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    setPos(Math.round((x / rect.width) * 100));
  };

  const onClick = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    setPos(Math.round((x / rect.width) * 100));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between p-3 md:p-4">
        <div className="text-sm md:text-base text-foreground/80">Compare</div>
        <button
          aria-label="Close compare"
          onClick={onClose}
          className="h-9 w-9 rounded-md bg-white text-black font-semibold"
        >
          ×
        </button>
      </div>
      <div className="flex-1 px-3 pb-4 md:px-6 md:pb-6">
        <div
          ref={containerRef}
          className="relative mx-auto max-w-5xl h-[55vh] md:h-[70vh] overflow-hidden rounded-xl border border-white/15 bg-black"
          onPointerMove={onPointerMove}
          onPointerDown={onPointerMove}
          onClick={onClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={beforeSrc} alt="before" className="absolute inset-0 h-full w-full object-contain" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={afterSrc}
            alt="after"
            className="absolute inset-0 h-full w-full object-contain"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          />
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white/70"
            style={{ left: `${pos}%`, transform: 'translateX(-1px)' }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 pointer-events-none"
            aria-hidden
          >
            <div className="hidden md:block text-xs text-white/70 bg-black/50 rounded px-2 py-1">Drag to compare</div>
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="h-8 w-8 rounded-full bg-white text-black grid place-items-center text-xs shadow">
              ⇆
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

