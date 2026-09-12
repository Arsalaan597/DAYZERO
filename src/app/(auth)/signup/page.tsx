'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
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
    const displayName = formData.get('display-name') as string;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
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
            Begin your awakening
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Display Name"
            name="display-name"
            type="text"
            autoComplete="username"
            required
            placeholder="The Wayfarer"
            minLength={2}
            maxLength={30}
          />
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
            autoComplete="new-password"
            required
            placeholder="••••••••"
            minLength={6}
          />

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Awakening…' : 'Awaken'}
          </Button>
        </form>

        {/* Footer link */}
        <p className="mt-8 text-center text-xs text-ash/60">
          Already awakened?{' '}
          <Link
            href="/login"
            className="text-ash transition-colors hover:text-parchment"
          >
            Continue
          </Link>
        </p>
      </div>
    </main>
  );
}
