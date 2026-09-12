import { NavLink } from '@/components/layout/nav-link';
import { SignOutButton } from '@/components/game/sign-out-button';

const NAV_ITEMS = [
  { href: '/game', label: 'Realm' },
  { href: '/game/wayfarer', label: 'Wayfarer' },
  { href: '/game/quests', label: 'Quests' },
] as const;

export function HUD() {
  return (
    <header className="border-b border-ash/10 bg-obsidian/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <span className="font-display text-base tracking-[0.25em] text-parchment select-none">
          DAYZERO
        </span>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-6">
          <nav aria-label="Game navigation">
            <ul className="flex gap-1" role="list">
              {NAV_ITEMS.map(({ href, label }) => (
                <li key={href}>
                  <NavLink href={href}>{label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="h-4 w-px bg-ash/10" aria-hidden="true" />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
