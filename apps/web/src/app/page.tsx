'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getMyProfile } from '@/features/profile/profile.api';
import { homeFor } from '@/features/auth/useAuthGate';
import { session } from '@/lib/session';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (!session.getToken()) {
      router.replace('/login');
      return;
    }
    getMyProfile()
      .then((p) => router.replace(homeFor(p)))
      .catch(() => {
        session.clear();
        router.replace('/login');
      });
  }, [router]);

  return (
    <div className="center">
      <div className="spinner" />
    </div>
  );
}
