'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/game');
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-void px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-block">
            <h1 className="font-display text-3xl tracking-[0.25em] text-parchment">
              DAYZERO
            </h1>
          </Link>
          <p className="mt-3 text-xs tracking-widest text-ash uppercase">
            Continue your journey
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="wayfarer@dayzero.world"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Entering…' : 'Enter'}
          </Button>
        </form>

        {/* Footer link */}
        <p className="mt-8 text-center text-xs text-ash/60">
          No account yet?{' '}
          <Link
            href="/signup"
            className="text-ash transition-colors hover:text-parchment"
          >
            Awaken
          </Link>
        </p>
      </div>
    </main>
  );
}
