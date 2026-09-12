// ---------------------------------------------------------------------------
// DAYZERO – Supabase Auth Callback Handler
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Ensures the redirect destination is a safe, internal relative path.
 * Rejects absolute URLs, protocol-relative paths (//), backslash paths (/\\),
 * and malformed paths. Defaults to '/game'.
 */
function getSafeRedirectPath(target: string | null): string {
  if (!target) return '/game';

  // Must begin with a single slash and not double-slash or backslash
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return '/game';
  }

  try {
    const parsed = new URL(target, 'http://localhost');
    if (parsed.origin !== 'http://localhost') {
      return '/game';
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/game';
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const safeNext = getSafeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // If code exchange fails, redirect to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
