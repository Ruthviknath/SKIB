import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SKIB - Meet new people',
  description: 'Join plans and meet new people in your city.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffc629' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
