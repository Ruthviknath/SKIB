'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMyProfile } from '@/features/profile/profile.api';
import { session } from '@/lib/session';
import type { Profile } from '@/types/api';

export type Gate = 'guest' | 'onboarding' | 'member';

export const homeFor = (profile: Profile) => (profile.onboarding.completed ? '/profile' : '/onboarding');

/**
 * Loads the current user and redirects if they are on the wrong screen:
 * - 'guest'      -> logged-out screens (login/verify)
 * - 'onboarding' -> logged in, onboarding not finished
 * - 'member'     -> logged in and onboarded
 */
export function useAuthGate(gate: Gate) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session.getToken()) {
        if (gate === 'guest') setReady(true);
        else router.replace('/login');
        return;
      }
      try {
        const p = await getMyProfile();
        if (cancelled) return;
        const target = homeFor(p);
        const allowed = (gate === 'onboarding' && !p.onboarding.completed) || (gate === 'member' && p.onboarding.completed);
        if (!allowed) return router.replace(target);
        setProfile(p);
        setReady(true);
      } catch {
        session.clear();
        if (gate === 'guest') setReady(true);
        else router.replace('/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gate, router]);

  return { profile, setProfile, ready };
}
