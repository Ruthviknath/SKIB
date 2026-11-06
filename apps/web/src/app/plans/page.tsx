'use client';

import { AppNav } from '@/components/AppNav';
import { useAuthGate } from '@/features/auth/useAuthGate';
import { PlansFeed } from '@/features/plans/PlansFeed';

export default function PlansPage() {
  const { profile, ready } = useAuthGate('member');
  if (!ready || !profile) {
    return (
      <div className="center">
        <div className="spinner" />
      </div>
    );
  }
  return (
    <main className="screen">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="brand" style={{ fontSize: 28 }}>
          SKIB
        </h2>
        <span className="chip static">📍 {profile.city?.name}</span>
      </div>
      <AppNav />
      <PlansFeed viewer={profile} />
    </main>
  );
}
