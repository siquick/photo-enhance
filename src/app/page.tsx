import UploadCard from '@/components/upload-card';

export default function Home() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(1200px_600px_at_50%_-20%,hsl(220_80%_60%/.12),transparent),linear-gradient(to_bottom,hsl(240_10%_5%),hsl(240_10%_8%))] text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em]">
              Photo Boost
              <span className="ml-2 inline-block rounded-full border border-white/10 px-2 py-[2px] text-xs text-foreground/70 align-middle">Leica Look</span>
            </h1>
            <p className="mt-2 text-sm text-foreground/60">
              Transform your photos with Leica-inspired color science and micro‑contrast.
            </p>
          </div>
          <div className="hidden md:block text-xs text-foreground/50">Powered by Gemini 2.5 Flash Image</div>
        </header>

        <UploadCard />
      </div>
    </main>
  );
}
