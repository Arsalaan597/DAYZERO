-- =========================================================================
-- DAYZERO – Phase 6: Wayfarer Visual Identity + Vault / Economy Migration
-- =========================================================================
-- 1. Creates public.vault_items catalog table with constraints.
-- 2. Updates public.inventory for vault item references and uniqueness.
-- 3. Creates public.equipped_cosmetics for 1:1 active slot management.
-- 4. Implements public.purchase_vault_item(p_item_id uuid) RPC.
-- 5. Implements public.equip_vault_item(p_item_id uuid) RPC.
-- 6. Seeds exactly 12 canonical cosmetics (4 mantles, 4 crests, 4 titles).
-- 7. Secures grants and RLS policies.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. VAULT ITEMS CATALOG TABLE
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('mantle', 'crest', 'title')),
  price_gold INTEGER NOT NULL CHECK (price_gold >= 0),
  visual_token TEXT NOT NULL UNIQUE,
  min_level INTEGER CHECK (min_level IS NULL OR min_level >= 1),
  req_attribute TEXT CHECK (req_attribute IS NULL OR req_attribute IN ('intellect', 'strength', 'discipline', 'wellness', 'creativity')),
  req_attribute_value INTEGER CHECK (req_attribute_value IS NULL OR req_attribute_value >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_attribute_requirement CHECK (
    (req_attribute IS NULL AND req_attribute_value IS NULL) OR
    (req_attribute IS NOT NULL AND req_attribute_value IS NOT NULL)
  )
);

ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vault items"
  ON public.vault_items FOR SELECT
  USING (is_active = TRUE);

-- Lock direct writes to catalog
REVOKE ALL ON public.vault_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vault_items TO authenticated, anon;

-- -------------------------------------------------------------------------
-- 2. INVENTORY EVOLUTION
-- -------------------------------------------------------------------------

-- Add nullable vault_item_id to existing inventory table
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS vault_item_id UUID REFERENCES public.vault_items(id) ON DELETE CASCADE;

-- Unique constraint ensuring a user cannot purchase the same vault item twice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_inventory_user_vault_item'
  ) THEN
    ALTER TABLE public.inventory
      ADD CONSTRAINT uq_inventory_user_vault_item UNIQUE (user_id, vault_item_id);
  END IF;
END $$;

-- Revoke direct mutations on inventory, allowing only authenticated SELECT
REVOKE INSERT, UPDATE, DELETE ON public.inventory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.inventory TO authenticated;

-- Ensure RLS policy exists for SELECT
DROP POLICY IF EXISTS "Users can read own inventory" ON public.inventory;
CREATE POLICY "Users can read own inventory"
  ON public.inventory FOR SELECT
  USING (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 3. EQUIPPED COSMETICS TABLE
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.equipped_cosmetics (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('mantle', 'crest', 'title')),
  vault_item_id UUID NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,
  equipped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);

ALTER TABLE public.equipped_cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own equipped cosmetics"
  ON public.equipped_cosmetics FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON public.equipped_cosmetics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.equipped_cosmetics TO authenticated;

-- -------------------------------------------------------------------------
-- 4. PURCHASE VAULT ITEM RPC
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purchase_vault_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_item record;
  v_profile record;
  v_attrs record;
  v_attr_val integer;
  v_new_gold integer;
  v_inv_id uuid;
BEGIN
  -- 1. Determine & validate auth.uid()
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Lock player profile row
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- 3. Load vault item
  SELECT * INTO v_item
  FROM public.vault_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault item not found';
  END IF;

  IF NOT v_item.is_active THEN
    RAISE EXCEPTION 'Vault item is currently inactive';
  END IF;

  -- 4. Check if already owned in inventory
  IF EXISTS (
    SELECT 1 FROM public.inventory
    WHERE user_id = v_uid AND vault_item_id = p_item_id
  ) THEN
    RAISE EXCEPTION 'Item already owned';
  END IF;

  -- 5. Validate Level requirement
  IF v_item.min_level IS NOT NULL AND v_profile.level < v_item.min_level THEN
    RAISE EXCEPTION 'Level requirement not met (Requires Level %)', v_item.min_level;
  END IF;

  -- 6. Validate Attribute requirement
  IF v_item.req_attribute IS NOT NULL THEN
    SELECT * INTO v_attrs
    FROM public.attributes
    WHERE user_id = v_uid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Attributes not found';
    END IF;

    IF v_item.req_attribute = 'intellect' THEN
      v_attr_val := v_attrs.intellect;
    ELSIF v_item.req_attribute = 'strength' THEN
      v_attr_val := v_attrs.strength;
    ELSIF v_item.req_attribute = 'discipline' THEN
      v_attr_val := v_attrs.discipline;
    ELSIF v_item.req_attribute = 'wellness' THEN
      v_attr_val := v_attrs.wellness;
    ELSIF v_item.req_attribute = 'creativity' THEN
      v_attr_val := v_attrs.creativity;
    ELSE
      RAISE EXCEPTION 'Unknown attribute requirement: %', v_item.req_attribute;
    END IF;

    IF v_attr_val < v_item.req_attribute_value THEN
      RAISE EXCEPTION '% requirement not met (Requires % %)',
        initcap(v_item.req_attribute), v_item.req_attribute_value, initcap(v_item.req_attribute);
    END IF;
  END IF;

  -- 7. Verify Gold balance
  IF v_profile.gold < v_item.price_gold THEN
    RAISE EXCEPTION 'Insufficient gold (Required: %, Current: %)', v_item.price_gold, v_profile.gold;
  END IF;

  -- 8. Deduct Gold atomically
  v_new_gold := v_profile.gold - v_item.price_gold;
  UPDATE public.profiles
  SET gold = v_new_gold,
      updated_at = now()
  WHERE id = v_uid;

  -- 9. Insert into inventory
  INSERT INTO public.inventory (user_id, item_id, vault_item_id)
  VALUES (v_uid, v_item.item_key, p_item_id)
  RETURNING id INTO v_inv_id;

  -- 10. Return authoritative result
  RETURN jsonb_build_object(
    'success', true,
    'vault_item_id', p_item_id,
    'item_key', v_item.item_key,
    'name', v_item.name,
    'category', v_item.category,
    'price_paid', v_item.price_gold,
    'new_gold', v_new_gold,
    'inventory_id', v_inv_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purchase_vault_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_vault_item(uuid) TO authenticated;

-- -------------------------------------------------------------------------
-- 5. EQUIP VAULT ITEM RPC
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.equip_vault_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_item record;
BEGIN
  -- 1. Determine & validate auth.uid()
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Load item from vault_items
  SELECT * INTO v_item
  FROM public.vault_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault item not found';
  END IF;

  IF NOT v_item.is_active THEN
    RAISE EXCEPTION 'Vault item is inactive';
  END IF;

  -- 3. Verify user ownership in inventory
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory
    WHERE user_id = v_uid AND vault_item_id = p_item_id
  ) THEN
    RAISE EXCEPTION 'Item not owned in inventory';
  END IF;

  -- 4. Atomically upsert equipped item for this user & category
  INSERT INTO public.equipped_cosmetics (user_id, category, vault_item_id, equipped_at)
  VALUES (v_uid, v_item.category, p_item_id, now())
  ON CONFLICT (user_id, category)
  DO UPDATE SET
    vault_item_id = EXCLUDED.vault_item_id,
    equipped_at = now();

  -- 5. Return authoritative equipped state
  RETURN jsonb_build_object(
    'success', true,
    'category', v_item.category,
    'vault_item_id', p_item_id,
    'item_key', v_item.item_key,
    'visual_token', v_item.visual_token,
    'name', v_item.name
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.equip_vault_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equip_vault_item(uuid) TO authenticated;

-- -------------------------------------------------------------------------
-- 6. SEED EXACTLY 12 CANONICAL COSMETICS (4 MANTLES, 4 CRESTS, 4 TITLES)
-- -------------------------------------------------------------------------

INSERT INTO public.vault_items (
  item_key, name, description, category, price_gold, visual_token,
  min_level, req_attribute, req_attribute_value, sort_order
) VALUES
  -- ── MANTLES (4) ────────────────────────────────────────────────────────
  (
    'mantle_ash_cloak',
    'Ashen Mantle',
    'A sturdy traveler cloak woven with fire-retardant ash threads and lined with quiet wool.',
    'mantle',
    30,
    'mantle_ash_cloak',
    1, NULL, NULL,
    10
  ),
  (
    'mantle_scholars_cowl',
    'Scholar Cowl',
    'A deep indigo cowl favored by the archivists of the sunken Academy.',
    'mantle',
    75,
    'mantle_scholars_cowl',
    2, 'intellect', 15,
    20
  ),
  (
    'mantle_forged_pauldrons',
    'Forged Pauldrons',
    'Heavy annealed iron guards that deflect the biting wind and flying slag of the Great Forge.',
    'mantle',
    85,
    'mantle_forged_pauldrons',
    2, 'strength', 15,
    30
  ),
  (
    'mantle_solar_shroud',
    'Solar Shroud',
    'An incandescent vestment of radiant weave, consecrated in the rekindled dawn.',
    'mantle',
    150,
    'mantle_solar_shroud',
    4, 'discipline', 30,
    40
  ),

  -- ── CRESTS (4) ─────────────────────────────────────────────────────────
  (
    'crest_ember_spark',
    'Crest of the Spark',
    'A clean, sharp rhombic insignia commemorating the first vow made against oblivion.',
    'crest',
    25,
    'crest_ember_spark',
    1, NULL, NULL,
    50
  ),
  (
    'crest_ancient_eye',
    'Eye of Remembrance',
    'The unblinking ocular sigil of the scholars who preserved knowledge through the long dark.',
    'crest',
    60,
    'crest_ancient_eye',
    2, 'intellect', 10,
    60
  ),
  (
    'crest_iron_anvil',
    'Anvil of Resolve',
    'A bold geometric anvil mark worn by those who forge discipline out of chaotic days.',
    'crest',
    70,
    'crest_iron_anvil',
    2, 'discipline', 10,
    70
  ),
  (
    'crest_crown_of_dawn',
    'Crown of the Dawn',
    'An elaborate tri-pointed solar crown emblazoned with eternal rekindling resonance.',
    'crest',
    140,
    'crest_crown_of_dawn',
    3, 'wellness', 25,
    80
  ),

  -- ── TITLES (4) ─────────────────────────────────────────────────────────
  (
    'title_seeker',
    'The Seeker',
    'For those who step into the ruined wild without guarantee of return.',
    'title',
    25,
    'title_seeker',
    1, NULL, NULL,
    90
  ),
  (
    'title_flamebearer',
    'Flamebearer',
    'A vow inscribed upon the soul to shield the ember from damp winds.',
    'title',
    65,
    'title_flamebearer',
    2, 'discipline', 10,
    100
  ),
  (
    'title_sanctuary_warden',
    'Sanctuary Warden',
    'Protector of quiet waters, deep breath, and stillness in the wild.',
    'title',
    80,
    'title_sanctuary_warden',
    2, 'wellness', 15,
    110
  ),
  (
    'title_architect_of_dawn',
    'Architect of the Dawn',
    'One whose daily deeds rebuild the ancient pillars of the restored world.',
    'title',
    160,
    'title_architect_of_dawn',
    4, 'creativity', 30,
    120
  )
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_gold = EXCLUDED.price_gold,
  visual_token = EXCLUDED.visual_token,
  min_level = EXCLUDED.min_level,
  req_attribute = EXCLUDED.req_attribute,
  req_attribute_value = EXCLUDED.req_attribute_value,
  sort_order = EXCLUDED.sort_order;
