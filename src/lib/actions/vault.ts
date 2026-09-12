'use server';

// ---------------------------------------------------------------------------
// DAYZERO – Vault & Cosmetic Server Actions
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { PurchaseVaultItemRpcRow, EquipVaultItemRpcRow } from '@/types/database';

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Purchase an item from the Vault using gold.
 * Server-authoritative RPC validates balance, requirements, and uniqueness.
 */
export async function purchaseVaultItemAction(
  vaultItemId: string
): Promise<ActionResult<PurchaseVaultItemRpcRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  if (!vaultItemId) {
    return { success: false, error: 'Item ID is required.' };
  }

  const { data, error } = await supabase.rpc('purchase_vault_item', {
    p_item_id: vaultItemId,
  });

  if (error) {
    // Sanitize database error messages for user presentation
    let userMsg = error.message;
    if (error.message.includes('Insufficient gold')) {
      userMsg = 'Insufficient Gold in your vault to claim this relic.';
    } else if (error.message.includes('Level requirement not met')) {
      userMsg = error.message;
    } else if (error.message.includes('requirement not met')) {
      userMsg = error.message;
    } else if (error.message.includes('Item already owned')) {
      userMsg = 'You already possess this artifact in your inventory.';
    } else if (error.message.includes('inactive')) {
      userMsg = 'This relic is currently dormant and unavailable.';
    }
    return { success: false, error: userMsg };
  }

  revalidatePath('/game/vault');
  revalidatePath('/game/wayfarer');
  return { success: true, data: data as PurchaseVaultItemRpcRow };
}

/**
 * Equip an owned cosmetic in its respective category.
 * The database derives category from vault_items and atomically updates equipped_cosmetics.
 */
export async function equipVaultItemAction(
  vaultItemId: string
): Promise<ActionResult<EquipVaultItemRpcRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  if (!vaultItemId) {
    return { success: false, error: 'Item ID is required.' };
  }

  const { data, error } = await supabase.rpc('equip_vault_item', {
    p_item_id: vaultItemId,
  });

  if (error) {
    let userMsg = error.message;
    if (error.message.includes('Item not owned')) {
      userMsg = 'You must acquire this item before attuning to it.';
    }
    return { success: false, error: userMsg };
  }

  revalidatePath('/game/vault');
  revalidatePath('/game/wayfarer');
  return { success: true, data: data as EquipVaultItemRpcRow };
}
