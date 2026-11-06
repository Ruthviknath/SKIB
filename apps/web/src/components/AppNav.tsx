'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppNav() {
  const pathname = usePathname();
  const items = [
    { href: '/plans', label: '🗓️ Plans' },
    { href: '/plans/new', label: '➕ Host Plan' },
    { href: '/profile', label: '👤 Profile' },
  ];

  return (
    <nav
      style={{
        display: 'flex',
        gap: 8,
        background: '#fff',
        padding: 8,
        borderRadius: 999,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      {items.map((item) => {
        const active =
          item.href === '/plans'
            ? pathname === '/plans' || (pathname.startsWith('/plans/') && pathname !== '/plans/new')
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`chip ${active ? 'selected' : ''}`}
            style={{
              flex: 1,
              textAlign: 'center',
              textDecoration: 'none',
              padding: '10px 12px',
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
