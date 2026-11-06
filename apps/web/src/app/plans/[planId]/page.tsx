'use client';

import { useParams } from 'next/navigation';
import { AppNav } from '@/components/AppNav';
import { useAuthGate } from '@/features/auth/useAuthGate';
import { PlanDetailView } from '@/features/plans/PlanDetailView';

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const { profile, ready } = useAuthGate('member');
  if (!ready || !profile || !planId) {
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
      <PlanDetailView planId={planId} viewer={profile} />
    </main>
  );
}
