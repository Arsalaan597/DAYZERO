// ---------------------------------------------------------------------------
// DAYZERO – /game/vault Page (Server Component)
// ---------------------------------------------------------------------------
// The ancient Armoury & Vault of relics.
// Server-rendered initial data: user profile (Gold/Level), inventory, equipped,
// attributes, and active catalog items.
// ---------------------------------------------------------------------------

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VaultClient } from '@/components/game/vault/vault-client';
import type {
  AttributesRow,
  ProfileRow,
  VaultItemRow,
  InventoryRow,
  EquippedCosmeticRow,
} from '@/types/database';

export const metadata = {
  title: 'The Vault | DAYZERO',
  description: 'Ancient armoury of mantles, crests, and titles earned through real life.',
};

export default async function VaultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profileRes, attrsRes, vaultItemsRes, inventoryRes, equippedRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('attributes').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('vault_items').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('inventory').select('*').eq('user_id', user.id),
    supabase.from('equipped_cosmetics').select('*').eq('user_id', user.id),
  ]);

  const profile = profileRes.data as ProfileRow | null;
  const attributes = attrsRes.data as AttributesRow | null;
  const vaultItems = (vaultItemsRes.data as VaultItemRow[] | null) ?? [];
  const inventory = (inventoryRes.data as InventoryRow[] | null) ?? [];
  const equippedCosmetics = (equippedRes.data as EquippedCosmeticRow[] | null) ?? [];

  const safeProfile: ProfileRow = profile ?? {
    id: user.id,
    display_name: (user.user_metadata?.display_name as string) ?? 'Wayfarer',
    level: 1,
    xp: 0,
    gold: 0,
    streak: 0,
    last_active_date: null,
    timezone: 'UTC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-16">
      <VaultClient
        profile={safeProfile}
        attributes={attributes}
        initialVaultItems={vaultItems}
        initialInventory={inventory}
        initialEquipped={equippedCosmetics}
      />
    </main>
  );
}
