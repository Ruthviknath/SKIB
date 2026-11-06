'use client';

import { OtpForm } from '@/features/auth/OtpForm';
import { useAuthGate } from '@/features/auth/useAuthGate';

export default function VerifyPage() {
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
      <OtpForm />
    </main>
  );
}
