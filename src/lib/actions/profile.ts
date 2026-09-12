'use server';

// ---------------------------------------------------------------------------
// DAYZERO – Profile Actions
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function updateTimezoneAction(
  timezone: string
): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  const trimmed = timezone.trim();
  // Validate IANA timezone
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
  } catch {
    return { success: false, error: 'Invalid IANA timezone identifier.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ timezone: trimmed })
    .eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/today');
  revalidatePath('/game/week');
  return { success: true, data: trimmed };
}
