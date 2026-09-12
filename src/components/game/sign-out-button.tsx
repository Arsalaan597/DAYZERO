'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="text-xs font-display tracking-widest text-ash/60 uppercase transition-colors duration-200 hover:text-parchment focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-40 disabled:pointer-events-none"
      aria-label="Sign out of DAYZERO"
    >
      {loading ? 'Departing…' : 'Sign Out'}
    </button>
  );
}
