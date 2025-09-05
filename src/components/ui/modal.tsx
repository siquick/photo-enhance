'use client';
import * as React from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="mx-auto mt-[10vh] w-[92vw] max-w-lg rounded-2xl border border-white/10 bg-black/90 p-4 text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-medium">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="h-8 w-8 rounded-md bg-white text-black font-semibold">
            ×
          </button>
        </div>
        <div className="mt-3 text-sm leading-6 text-foreground/80">{children}</div>
      </div>
    </div>
  );
}

