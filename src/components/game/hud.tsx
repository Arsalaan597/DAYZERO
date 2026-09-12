'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavLink } from '@/components/layout/nav-link';
import { SignOutButton } from '@/components/game/sign-out-button';

const NAV_ITEMS = [
  { href: '/game/today', label: 'Today' },
  { href: '/game/week', label: 'Week' },
  { href: '/game', label: 'Realm' },
  { href: '/game/wayfarer', label: 'Wayfarer' },
  { href: '/game/quests', label: 'Quests' },
] as const;

const MOBILE_NAV_ITEMS = [
  { href: '/game/today', label: 'Today' },
  { href: '/game/week', label: 'Week' },
  { href: '/game', label: 'Realm' },
  { href: '/game/wayfarer', label: 'Wayfarer' },
  { href: '/game/vault', label: 'Vault' },
  { href: '/game/quests', label: 'Quests' },
] as const;


export function HUD() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  // Close mobile drawer on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="border-b border-ash/10 bg-obsidian/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link
          href="/game/today"
          className="font-display text-base tracking-[0.25em] text-parchment select-none hover:text-ember transition-colors"
        >
          DAYZERO
        </Link>

        {/* Desktop Navigation & Actions (Hidden below md breakpoint) */}
        <div className="hidden md:flex items-center gap-4 sm:gap-6">
          <nav aria-label="Game navigation">
            <ul className="flex gap-1 sm:gap-2" role="list">
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

        {/* Mobile Navigation Controls (< md) */}
        <div className="flex md:hidden items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 border border-ash/20 bg-stone/40 text-parchment font-display text-xs tracking-wider uppercase hover:border-ember transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ember"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation codex' : 'Open navigation codex'}
          >
            <span className="text-ember text-sm">{mobileMenuOpen ? '✕' : '☰'}</span>
            <span>Codex</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Panel */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="md:hidden border-t border-ash/15 bg-obsidian/95 backdrop-blur-md px-4 py-4 space-y-3 shadow-2xl"
        >
          <nav aria-label="Mobile game navigation">
            <ul className="flex flex-col gap-1.5" role="list">
              {MOBILE_NAV_ITEMS.map(({ href, label }) => {
                const isActive = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 font-display text-sm tracking-widest uppercase border transition-colors ${
                        isActive
                          ? 'border-ember bg-ember/15 text-parchment font-semibold'
                          : 'border-ash/10 bg-stone/30 text-ash hover:border-ash/30 hover:text-parchment'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span>{label}</span>
                      {isActive && <span className="text-xs text-ember">◆</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="pt-3 border-t border-ash/10 flex items-center justify-between">
            <span className="text-[10px] tracking-widest text-ash/60 uppercase">
              Wayfarer Session
            </span>
            <SignOutButton />
          </div>
        </div>
      )}
    </header>
  );
}
