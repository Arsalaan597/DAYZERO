# DAYZERO

**Your world starts when you do.**

DAYZERO is a Life RPG where real-world actions progress a dormant post-collapse fantasy world. The player is "The Wayfarer", whose actions awaken the world from its frozen state since the event known as DAYZERO.

---

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS v4**
- **Motion** (animation library, successor to Framer Motion)
- **Supabase** (auth, database, RLS)
- **PostgreSQL** (via Supabase)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project

### 1. Clone & Install

```bash
git clone <repo-url>
cd DAYZERO
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these values in your Supabase project dashboard under **Settings → API**.

> **Security**: Only the anon (public) key is used client-side. The service-role key is never exposed.

### 3. Run Database Migrations

Apply the schema to your Supabase project using the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Alternatively, you can copy the contents of `supabase/migrations/20240101000000_initial_schema.sql` and run it directly in your Supabase SQL Editor.

### 4. Configure Supabase Auth

In your Supabase dashboard:

1. Go to **Authentication → Settings**
2. Ensure **Email** provider is enabled
3. For local development, you may want to disable **Confirm email** to skip email verification

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Architecture

```
src/
├── app/                    # Next.js App Router pages & layouts
│   ├── (auth)/             # Auth route group (login, signup)
│   ├── (game)/game/        # Protected game routes
│   └── auth/callback/      # Supabase auth callback handler
├── components/
│   ├── ui/                 # Reusable UI primitives (Button, Input)
│   ├── game/               # Game-specific components (HUD)
│   └── layout/             # Layout components (NavLink)
├── lib/
│   ├── supabase/           # Supabase client factories (browser, server, middleware)
│   └── game/               # Game domain logic (XP calculations, rewards)
├── types/                  # TypeScript type definitions
│   ├── game.ts             # Core game types (Attribute, Realm, Quest, etc.)
│   └── database.ts         # Database row types matching PostgreSQL schema
├── config/
│   └── game.ts             # Game constants (realms, difficulties, rewards)
└── middleware.ts            # Auth guard middleware
```

### Key Principles

- **Game logic is separate from UI**: XP formulas and reward calculations live in `lib/game/`, not in React components.
- **Database access is organized**: Supabase clients are in `lib/supabase/`. Queries should use these clients, not be scattered in components.
- **Types mirror the domain**: `types/game.ts` has camelCase domain types; `types/database.ts` has snake_case DB row types.
- **Config is centralized**: Realm definitions, difficulty rewards, and XP formula constants live in `config/game.ts`.

---

## Database Schema

| Table | Description |
|-------|-------------|
| `profiles` | Player profile (level, XP, gold, streak) — keyed on `auth.users.id` |
| `quests` | Player quests with attribute, difficulty, and rewards |
| `attributes` | Five player attributes (intellect, strength, discipline, wellness, creativity) |
| `realm_progress` | Progress level for each of the five realms |
| `inventory` | Player inventory items |

All tables have **Row Level Security** enabled. Users can only read/write their own data.

A trigger automatically creates `profiles`, `attributes`, and `realm_progress` rows when a new user signs up.

---

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

---

## Design System

The visual language follows a "post-collapse fantasy × ancient machinery × dying/restoring nature" direction.

### Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `void` | `#0B0C0C` | Deepest background |
| `obsidian` | `#121413` | Card/section backgrounds |
| `stone` | `#1B1E1C` | Interactive surface backgrounds |
| `ash` | `#8B8D87` | Secondary text, borders |
| `parchment` | `#E7DFC9` | Primary text |
| `ember` | `#D97732` | Activity, awakening, XP, completion |
| `gold` | `#C6A15B` | Currency, achievements |
| `danger` | `#A94A42` | Errors, destructive actions |

### Typography

- **Display**: Cinzel (serif) — game/world headings
- **Body**: Inter (sans-serif) — interface text

---

## Contributing

When extending the project:

1. Place new game formulas in `lib/game/`, not inside components
2. Place new Supabase queries in dedicated data access functions, not scattered in page components
3. Add new types to `types/game.ts` or `types/database.ts`
4. Add new constants to `config/game.ts`
5. Respect the visual direction — avoid generic dashboard UI patterns
