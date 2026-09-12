'use client';

// ---------------------------------------------------------------------------
// DAYZERO – VaultClient Component
// ---------------------------------------------------------------------------
// Handles interactive state for The Vault chamber:
// - Category Tabs (MANTLES | CRESTS | TITLES)
// - Server-authoritative purchase and equip execution
// - Acquisition reveal toast / card highlight
// - Live Gold balance and equipment sync
// ---------------------------------------------------------------------------

import { useState } from 'react';
import Link from 'next/link';
import { VaultItemCard } from './vault-item-card';
import { purchaseVaultItemAction, equipVaultItemAction } from '@/lib/actions/vault';
import type {
  ProfileRow,
  AttributesRow,
  VaultItemRow,
  InventoryRow,
  EquippedCosmeticRow,
} from '@/types/database';
import type { CosmeticCategory } from '@/types/game';

interface VaultClientProps {
  profile: ProfileRow;
  attributes: AttributesRow | null;
  initialVaultItems: VaultItemRow[];
  initialInventory: InventoryRow[];
  initialEquipped: EquippedCosmeticRow[];
}

export function VaultClient({
  profile: initialProfile,
  attributes,
  initialVaultItems,
  initialInventory,
  initialEquipped,
}: VaultClientProps) {
  const [profile, setProfile] = useState<ProfileRow>(initialProfile);
  const [inventory, setInventory] = useState<InventoryRow[]>(initialInventory);
  const [equipped, setEquipped] = useState<EquippedCosmeticRow[]>(initialEquipped);
  const [activeCategory, setActiveCategory] = useState<CosmeticCategory>('mantle');

  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [isEquippingId, setIsEquippingId] = useState<string | null>(null);
  const [justAcquiredId, setJustAcquiredId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revealToast, setRevealToast] = useState<{ name: string; category: string } | null>(null);

  // Set of owned vault item IDs
  const ownedItemIds = new Set(
    inventory.map((inv) => inv.vault_item_id).filter(Boolean) as string[]
  );

  // Set of equipped vault item IDs
  const equippedItemIds = new Set(equipped.map((e) => e.vault_item_id));

  // Filter items for current category tab
  const categoryItems = initialVaultItems.filter(
    (item) => item.category === activeCategory
  );

  // Purchase Handler
  async function handlePurchase(item: VaultItemRow) {
    setErrorMessage(null);
    setBusyItemId(item.id);

    try {
      const res = await purchaseVaultItemAction(item.id);
      if (!res.success || !res.data) {
        setErrorMessage(res.error ?? 'Failed to acquire relic.');
        setBusyItemId(null);
        return;
      }

      // Update state authoritatively from RPC response
      const rpcData = res.data;
      setProfile((prev) => ({
        ...prev,
        gold: rpcData.new_gold,
      }));

      // Add to inventory
      setInventory((prev) => [
        ...prev,
        {
          id: rpcData.inventory_id,
          user_id: profile.id,
          item_id: rpcData.item_key,
          vault_item_id: rpcData.vault_item_id,
          acquired_at: new Date().toISOString(),
        },
      ]);

      // Trigger Acquisition Reveal animation
      setJustAcquiredId(item.id);
      setRevealToast({ name: item.name, category: item.category });
      setTimeout(() => {
        setJustAcquiredId(null);
      }, 4000);
    } catch {
      setErrorMessage('A temporal disturbance occurred. Please try again.');
    } finally {
      setBusyItemId(null);
    }
  }

  // Equip Handler
  async function handleEquip(item: VaultItemRow) {
    setErrorMessage(null);
    setIsEquippingId(item.id);

    try {
      const res = await equipVaultItemAction(item.id);
      if (!res.success || !res.data) {
        setErrorMessage(res.error ?? 'Failed to attune to relic.');
        setIsEquippingId(null);
        return;
      }

      // Update equipped state authoritatively
      const rpcData = res.data;
      setEquipped((prev) => {
        // Remove existing item in same category, then add new
        const filtered = prev.filter((e) => e.category !== rpcData.category);
        return [
          ...filtered,
          {
            user_id: profile.id,
            category: rpcData.category,
            vault_item_id: rpcData.vault_item_id,
            equipped_at: new Date().toISOString(),
          },
        ];
      });
    } catch {
      setErrorMessage('Failed to attune to relic. Please try again.');
    } finally {
      setIsEquippingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Vault Chamber Header & Currency HUD                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="border border-ash/20 bg-obsidian/85 p-6 backdrop-blur-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ash/15 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xs tracking-[0.25em] text-ember uppercase">
                The Armoury of Ancients
              </span>
              <span className="text-ash/40">◆</span>
              <span className="text-xs text-ash tracking-widest uppercase">Phase 6</span>
            </div>
            <h1 className="mt-1 font-display text-2xl tracking-[0.15em] text-parchment uppercase sm:text-3xl">
              The Vault
            </h1>
            <p className="mt-1 max-w-xl text-xs sm:text-sm text-ash leading-relaxed">
              Earned solely through real-world trial and devotion. Attune relics to forge your persistent visual presence.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Gold Balance Readout */}
            <div className="border border-gold/30 bg-stone/70 px-5 py-3 text-right">
              <span className="text-[10px] tracking-[0.2em] text-gold uppercase font-semibold">
                Available Tribute
              </span>
              <p className="font-display text-2xl tracking-wider text-gold font-bold">
                {profile.gold} <span className="text-sm font-normal text-gold/80">G</span>
              </p>
            </div>

            {/* Back to Wayfarer Link */}
            <Link
              href="/game/wayfarer"
              className="border border-ash/25 bg-stone/40 px-4 py-3 font-display text-xs tracking-widest text-parchment uppercase transition-colors hover:border-ash/60 hover:text-ember"
            >
              ← To Wayfarer
            </Link>
          </div>
        </div>

        {/* Acquisition Reveal Toast Alert Banner */}
        {revealToast && (
          <div
            role="status"
            className="mt-6 flex items-center justify-between border border-gold/60 bg-gold/15 px-4 py-3 text-parchment animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg text-gold">✦</span>
              <div>
                <p className="font-display text-xs tracking-wider uppercase font-semibold text-gold">
                  Artifact Claimed &amp; Sealed
                </p>
                <p className="text-xs text-parchment/90">
                  <strong>{revealToast.name}</strong> added to your collection. You may now attune to it below.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRevealToast(null)}
              className="text-xs text-ash hover:text-parchment font-display uppercase tracking-wider"
              aria-label="Dismiss notification"
            >
              ✕ Close
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-6 flex items-center justify-between border border-danger/60 bg-danger/15 px-4 py-3 text-danger text-xs font-display tracking-wider uppercase"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-danger hover:text-parchment ml-4"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Category Filter Tabs (MANTLES | CRESTS | TITLES)                   */}
        {/* ------------------------------------------------------------------ */}
        <div className="mt-6 flex border-b border-ash/15" role="tablist" aria-label="Vault categories">
          {(['mantle', 'crest', 'title'] as const).map((cat) => {
            const isActive = activeCategory === cat;
            const labels = {
              mantle: 'Mantles & Cloaks',
              crest: 'Insignia Crests',
              title: 'Wayfarer Titles',
            };

            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveCategory(cat);
                  setErrorMessage(null);
                }}
                className={`relative px-5 py-3 font-display text-xs tracking-[0.15em] uppercase transition-all sm:text-sm ${
                  isActive
                    ? 'text-ember font-semibold'
                    : 'text-ash hover:text-parchment'
                }`}
              >
                <span>{labels[cat]}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full bg-ember" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Relics Catalog Grid                                                */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label={`${activeCategory} catalog items`}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categoryItems.map((item) => {
            const isOwned = ownedItemIds.has(item.id);
            const isEquipped = equippedItemIds.has(item.id);
            const isPurchasing = busyItemId === item.id;
            const isEquipping = isEquippingId === item.id;
            const hasJustAcquired = justAcquiredId === item.id;

            return (
              <VaultItemCard
                key={item.id}
                item={item}
                profile={profile}
                attributes={attributes}
                isOwned={isOwned}
                isEquipped={isEquipped}
                onPurchase={handlePurchase}
                onEquip={handleEquip}
                isPurchasing={isPurchasing}
                isEquipping={isEquipping}
                hasJustAcquired={hasJustAcquired}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
