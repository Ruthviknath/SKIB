'use client';

import { useAuthGate } from '@/features/auth/useAuthGate';
import { ProfileView } from '@/features/profile/ProfileView';

export default function ProfilePage() {
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
        <span className="chip static">{profile.city?.name}</span>
      </div>
      <ProfileView initialProfile={profile} />
    </main>
  );
}
