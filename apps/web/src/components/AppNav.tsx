'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppNav() {
  const pathname = usePathname();
  const items = [
    { href: '/plans', label: '🗓️ Plans' },
    { href: '/discover', label: '💛 BFF' },
    { href: '/communities', label: '🏘️ Clubs' },
    { href: '/stories', label: '📸 Stories' },
    { href: '/notifications', label: '🔔 Alerts' },
    { href: '/profile', label: '👤 Me' },
  ];

  return (
    <nav
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        background: '#fff',
        padding: 8,
        borderRadius: 20,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      {items.map((item) => {
        const active =
          item.href === '/discover'
            ? pathname.startsWith('/discover') || pathname.startsWith('/matches')
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`chip ${active ? 'selected' : ''}`}
            style={{
              flex: '1 1 30%',
              textAlign: 'center',
              textDecoration: 'none',
              padding: '8px 10px',
              fontSize: 13,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
