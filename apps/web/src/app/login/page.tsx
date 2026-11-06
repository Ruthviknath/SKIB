'use client';

import { PhoneForm } from '@/features/auth/PhoneForm';
import { useAuthGate } from '@/features/auth/useAuthGate';

export default function LoginPage() {
  const { ready } = useAuthGate('guest');
  if (!ready) {
    return (
      <div className="center">
        <div className="spinner" />
      </div>
    );
  }
  return (
    <main className="screen hero">
      <div style={{ textAlign: 'center' }}>
        <h1 className="brand">SKIB</h1>
        <p className="tagline">Meet new people over real-life plans in your city.</p>
      </div>
      <PhoneForm />
    </main>
  );
}
