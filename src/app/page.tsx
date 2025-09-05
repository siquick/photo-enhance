import UploadCard from '@/components/upload-card';
import AppHeader from '@/components/app-header';

export default function Home() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(1200px_600px_at_50%_-20%,hsl(220_80%_60%/.12),transparent),linear-gradient(to_bottom,hsl(240_10%_5%),hsl(240_10%_8%))] text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AppHeader />

        <UploadCard />
      </div>
    </main>
  );
}
