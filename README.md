# DAYZERO

**DAYZERO turns your real schedule into an RPG campaign. Plan your week, live through your day, and build your character from what you actually accomplish.**

Your real life builds your character.

**YOUR WORLD STARTS WHEN YOU DO.**

Live Demo: [Deployment pending]

Demo Video: [Video pending]

## What is DAYZERO?

Traditional productivity apps can make real-life responsibilities feel like more administrative work. Games make progress tangible through immediate feedback, visible growth, rewards, identity, and anticipation. DAYZERO brings those mechanics to the commitments already in your life: studying, exercising, practicing a skill, or maintaining a routine.

**REAL LIFE → GAME ENGINE → RPG IDENTITY**

Your schedule supplies the activities. The game engine translates completed activities into progression. Your Wayfarer, restored Realms, and earned cosmetics make that progress visible. The fantasy world is the presentation and progression layer for your real schedule; DAYZERO is not primarily a fantasy exploration game.

## Core Loop

1. Plan your week with scheduled quests and recurring routines.
2. Choose a daily Main Quest and work through Today.
3. Complete real activities, then record completion in DAYZERO.
4. Earn database-calculated XP, Gold, and attribute points.
5. Level up your Wayfarer, restore Realms, and sustain the Zeroflame.
6. Purchase and equip cosmetics, earn Chronicle milestones, and plan the next day.

## Features & Routes

| Screen | Route | Implemented behavior |
| --- | --- | --- |
| Today | `/game/today` | Daily activity timeline, scheduled quests, routine instances, Main Quest highlight, completion feedback, and Active Trials. |
| Week | `/game/week` | Weekly planning, quest scheduling and rescheduling, routine management, and daily Main Quest designation. |
| Quests | `/game/quests` | Create, edit, delete, and complete quests; choose attributes and reward-related difficulty or effort/challenge inputs. |
| Realm | `/game` | Five-Realm map showing attribute-linked restoration and the central Zeroflame. |
| Wayfarer | `/game/wayfarer` | Character sheet with progression, attributes, equipped appearance, and Chronicle summary. |
| Vault | `/game/vault` | Cosmetic catalog, purchase eligibility, ownership, and equipping. |
| Chronicle | `/game/chronicle` | Inscription catalog, earned milestones, and daily/weekly Trials. |

The landing page is `/`; email/password authentication uses `/signup` and `/login`. `/auth/callback` handles authorization-code exchange and validates the internal redirect destination. Game routes check authentication.

### Planning and progression

**Quests** represent individual activities. They may be scheduled or remain in the quest board. **Routines** define recurring commitments; the database creates dated instances so each occurrence can be completed separately. **Main Quest** marks one scheduled quest per user per date, enforced by a database uniqueness rule, and adds 20 XP and 10 Gold on completion.

**XP and levels** follow a nonlinear curve: advancing from level `L` requires `floor(100 × L^1.5)` XP. Total XP is cumulative, and players begin at level 1. Database functions calculate the authoritative level; TypeScript helpers provide the corresponding display breakdown. Activity rewards use the stored effort/challenge settings, with legacy difficulty-based rewards supported for quests without effort settings.

**Gold** is earned through activity completion and qualifying Trials, then spent in the Vault. **Attributes** grow through activities assigned to them and drive their corresponding Realms:

| Attribute | Realm |
| --- | --- |
| Intellect | The Academy |
| Strength | The Wilds |
| Discipline | The Forge |
| Wellness | The Sanctuary |
| Creativity | The Atelier |

The map presents restoration tiers from 0 through 3. The **Zeroflame** changes appearance with the stored streak. Completion logic uses the profile timezone: another completion on the same local day preserves the streak, the next consecutive day extends it, and completion after a gap starts it again at one. Timezone edge-case QA remains pending.

### Wayfarer and Vault

The Wayfarer is the player's visual identity. The seeded Vault contains 12 cosmetics across three categories: **mantle, crest, and title**. Purchases check Gold and any level or attribute requirements. Equipping requires ownership and stores one item per category. Mantle and crest layers appear on the avatar; the equipped title accompanies the character presentation. Cosmetics provide presentation rewards rather than activity XP bonuses.

### Chronicle

Chronicle implements **12 Inscriptions** and **three active Trials: two daily and one weekly**. Inscriptions commemorate milestones and award no XP or Gold. Trials award Gold only:

| Trial | Requirement | Reward |
| --- | --- | --- |
| The Daily Three | Complete three planned activities for today: scheduled quests or routine instances. | 8 Gold |
| Steadfast | Complete one routine instance today. | 6 Gold |
| The Main Path | Complete three Main Quests during the current local week. | 20 Gold |

The evaluator uses completion and scheduling dates in the player's timezone, with Monday-based weeks. Newly earned milestones and Trial rewards join the completion response and reward reveal. The forward repair migration defines the current achievement thresholds, including Tier 1 for First Awakening, Tier 3 for World Restored, 10 routine completions for Rhythm Forged, and 50 points in one attribute for Path Made Visible. Implementation is present; unfinished Phase 7 concurrency and timezone QA is not claimed complete.

## Security & Anti-Cheating

**Server-authoritative progression with database-enforced access controls and atomic reward mutations.**

The progression flow is:

```text
User request → DB validates → DB calculates → atomic state change
             → authoritative result → UI animates
```

Next.js Server Actions authenticate requests and call Supabase with the user's session. For progression, trusted PostgreSQL `SECURITY DEFINER` RPCs—including `complete_quest`, `complete_routine_instance`, `purchase_vault_item`, and `equip_vault_item`—perform the privileged mutations. These functions use an empty `search_path`, qualified database references, and caller checks where applicable. Public/anonymous execution is revoked for these mutation entry points; internal Chronicle evaluation and backfill helpers also deny direct execution to authenticated clients.

- **RLS:** Row Level Security policies scope player-owned records to the authenticated user. Shared catalogs have separate read policies; they are not user-owned writable records.
- **DB-controlled rewards:** Completion RPCs calculate rewards from stored activity settings. Quest triggers enforce reward fields and prevent newly inserted quests from starting completed.
- **Restricted direct progression writes:** Grants and policies restrict client changes to XP, Gold, attributes, Realm progress, inventory, equipment, and Chronicle award records. Allowed planning/profile edits do not grant arbitrary progression writes.
- **Double-completion protection:** Completion RPCs lock activity and player state and reject already completed records. Unique constraints prevent duplicate routine dates, owned catalog items, earned Inscriptions, and Trial awards for the same period.
- **Economy and ownership enforcement:** Purchase RPCs check active catalog entries, requirements, existing ownership, and balance before deducting Gold and inserting inventory in one transaction. Equip RPCs verify ownership and category.
- **Browser credentials:** The application uses the Supabase URL and public anon/publishable key with the user's session. No service-role key belongs in the browser or in any `NEXT_PUBLIC_*` variable.

These protections describe the code and complete migration chain, not an independent security audit or proof that a particular hosted database has applied them. Technical progression integrity is protected, but DAYZERO does not prove offline real-world honesty: users still report whether they actually did an activity and choose its planning inputs.

## Tech Stack & Architecture

| Layer | Repository dependency or implementation |
| --- | --- |
| Web application | Next.js 16.3.5 App Router; React and React DOM 19.2.8 |
| Language and styling | TypeScript 5 with strict mode; Tailwind CSS 4 |
| Animation | Motion 13 |
| Auth and data | Supabase Auth, PostgreSQL, RLS, SQL functions; `@supabase/ssr` and `@supabase/supabase-js` |
| Development tools | ESLint 9, Supabase CLI, and Playwright |

Server-rendered pages load authenticated data; client components handle interaction and animation. Server Actions in `src/lib/actions/` connect those interactions to queries and RPCs. Database migrations define persisted state, authorization, reward mutations, and seeded catalogs.

```text
src/app/                 Pages, protected game layout, auth callback
src/components/game/     Planning, map, avatar, rewards, Vault, Chronicle UI
src/lib/actions/         Authenticated application operations
src/lib/supabase/        Browser, server, and middleware client factories
src/lib/game/            Scheduling, dates, and display-side reward/XP helpers
src/config/game.ts       Attribute, Realm, and game constants
src/types/               Domain and database row types
supabase/migrations/     Ordered schema, security, progression, and catalog SQL
```

### Important database tables

| Table | Purpose |
| --- | --- |
| `profiles` | Player identity, XP, level, Gold, streak, and timezone; linked to `auth.users`. |
| `quests` | Individual activities, scheduling, Main Quest flag, and completion/reward fields. |
| `attributes` | The five attribute scores for each player. |
| `realm_progress` | Each player's five Realm restoration levels. |
| `routines` | Recurring activity definitions. |
| `routine_instances` | Dated routine occurrences and completion state. |
| `vault_items` | Shared cosmetic catalog, prices, and requirements. |
| `inventory` | Player-owned items, including Vault item references. |
| `equipped_cosmetics` | Equipped item per player and cosmetic category. |
| `achievements` / `user_achievements` | Inscription definitions and earned records. |
| `challenges` / `user_challenge_completions` | Trial definitions and awards per player and period. |

Signup triggers initialize the profile, attributes, and Realm progress. Later migrations supersede earlier definitions, so the initial schema alone is insufficient.

## Getting Started

Use Node.js **20.9 or newer**, npm, and a Supabase project. The installed Next.js package declares this Node minimum; see the [Next.js installation guide](https://nextjs.org/docs/pages/getting-started/installation). Run commands from the repository root.

### 1. Install dependencies

```bash
npm ci
```

This uses the committed `package-lock.json`. No separate backend application is required.

### 2. Environment Variables

Copy `.env.example` to `.env.local` using your editor or file manager. On PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Set the two variables read by the application:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

These are placeholders only. Obtain the project URL and public key from your Supabase project. The variable name remains `NEXT_PUBLIC_SUPABASE_ANON_KEY` because that is what the code reads. Never substitute a secret or service-role key. `.gitignore` excludes `.env*` while allowing the placeholder `.env.example`; keep real local credentials out of Git.

### 3. Apply migrations

The Supabase CLI is already a development dependency:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Confirm the target project before applying changes. Apply the entire ordered chain in `supabase/migrations/`, including `20240108000003_phase7_test_helper_cleanup.sql`, which removes temporary diagnostic helpers. Do not stop at the initial schema or test-helper migration. For an existing project, inspect migration history first and resolve mismatches before proceeding. The CLI manages which migrations are pending; see [Supabase database migrations](https://supabase.com/docs/guides/local-development/database-migrations).

### 4. Configure authentication and start

Enable email/password authentication in Supabase. Set the development Site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback` for callback-based flows. If email confirmation is enabled, complete confirmation before signing in; the signup screen currently attempts navigation immediately after signup. Verify the project's confirmation-email behavior during setup. See [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000), create an account, and sign in.

### Package scripts

| Command | Actual script |
| --- | --- |
| `npm run dev` | `next dev` — development server. |
| `npm run build` | `next build` — production build. |
| `npm run start` | `next start` — serve an existing production build. |
| `npm run lint` | `eslint` — lint the repository. |

There is no `npm test` script. Standalone Playwright QA files exist (`qa-full-suite.mjs`, `qa-phase6-suite.mjs`, and `qa-phase7-suite.mjs`); they create test users and mutate game data, so review their assumptions before running against a dedicated test environment.

## Production Deployment on Vercel

Deployment remains pending. When ready:

1. Import the DAYZERO Git repository into Vercel and select the repository root.
2. Use the Next.js framework preset, `npm run build`, and the default Next.js output settings. Use `npm ci` if explicitly setting the install command.
3. Add both environment variables above to Production, and separately to Preview if needed, before building. Public variables are exposed to the browser; only use the public Supabase key.
4. Apply and verify the complete migration chain against the intended Supabase project independently of the web deployment. The package build script does not run migrations.
5. Set Supabase's production Site URL to the deployed HTTPS origin and allow its exact `/auth/callback` URL. Configure preview URLs separately if using them.
6. Deploy, then check signup/login, Today completion, persisted progression after refresh, Vault ownership/equipping, and Chronicle behavior with a test account.

Rebuild/redeploy after changing build-time public environment variables. Platform references: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) and [Vercel environment variables](https://vercel.com/kb/guide/how-to-add-vercel-environment-variables).

## Demo

A suggested walkthrough is to sign in, schedule a real activity in Week, designate it as Main Quest, and add a recurring routine. Complete an activity from Today after doing it, then show the authoritative reward reveal, Wayfarer progression, and Realm map. With sufficient earned Gold and requirements met, purchase and equip a Vault cosmetic. Finish with Chronicle to show earned Inscriptions and current Trial progress.

Live Demo: [Deployment pending]

Demo Video: [Video pending]

## Project Status

DAYZERO is a hackathon prototype, version `0.1.0` in `package.json`. The repository contains the planning, progression, Realm, Wayfarer, Vault, and Chronicle implementations described above. **Phase 7 concurrency and timezone QA remains unfinished.** Existing phase reports record earlier validation claims; they are not a substitute for completing that remaining QA or validating a production deployment.

This README was checked against source files, migrations, and package scripts. Documentation review does not establish that the current hosted database is up to date, nor constitute a fresh build, browser test, or security audit. Live deployment and demo video links remain pending.

## Team

DAYZERO team — contributor names to be added.
