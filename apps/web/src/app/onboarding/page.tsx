'use client';

import { useAuthGate } from '@/features/auth/useAuthGate';
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  const { profile, ready } = useAuthGate('onboarding');
  if (!ready || !profile) {
    return (
      <div className="center">
        <div className="spinner" />
      </div>
    );
  }
  return (
    <main className="screen">
      <h2 className="brand" style={{ fontSize: 28 }}>
        SKIB
      </h2>
      <OnboardingWizard initialProfile={profile} />
    </main>
  );
}
