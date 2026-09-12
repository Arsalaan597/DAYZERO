import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-void">
      {/* Subtle radial vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-void)_70%)]"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        {/* Title */}
        <h1 className="font-display text-5xl tracking-[0.3em] text-parchment sm:text-7xl">
          DAYZERO
        </h1>

        {/* Tagline */}
        <p className="max-w-md text-sm tracking-[0.15em] text-ash uppercase">
          Your world starts when you do.
        </p>

        {/* Separator — ancient geometric mark */}
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px w-12 bg-ash/30" />
          <span className="text-ember text-xs">◆</span>
          <span className="h-px w-12 bg-ash/30" />
        </div>

        {/* Primary CTA */}
        <Link href="/signup">
          <Button variant="primary">Enter</Button>
        </Link>

        {/* Secondary */}
        <Link
          href="/login"
          className="text-xs tracking-widest text-ash/60 uppercase transition-colors hover:text-parchment"
        >
          Already awakened? Continue
        </Link>
      </div>

      {/* Faint bottom gradient — dormant world suggestion */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-obsidian/50 to-transparent"
        aria-hidden="true"
      />
    </main>
  );
}
