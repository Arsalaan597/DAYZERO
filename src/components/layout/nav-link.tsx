'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={[
        'px-4 py-2 text-sm font-display tracking-widest uppercase transition-colors duration-200',
        isActive
          ? 'text-ember border-b-2 border-ember'
          : 'text-ash hover:text-parchment border-b-2 border-transparent',
      ].join(' ')}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
