'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { errorMessage } from '@/lib/api';
import { session } from '@/lib/session';
import { requestOtp, verifyOtp } from './auth.api';
import { DEV_CODE_KEY } from './PhoneForm';
import { homeFor } from './useAuthGate';

export function OtpForm() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const pending = session.getPendingPhone();
    if (!pending) return router.replace('/login');
    setPhone(pending);
    setDevCode(sessionStorage.getItem(DEV_CODE_KEY));
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;
    setError('');
    setLoading(true);
    try {
      const res = await verifyOtp(phone, code);
      session.setToken(res.token);
      sessionStorage.removeItem(DEV_CODE_KEY);
      router.replace(homeFor(res.profile));
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  async function resend() {
    if (!phone) return;
    setError('');
    try {
      const res = await requestOtp(phone);
      setCooldown(res.resendInSeconds);
      setDevCode(res.devCode ?? null);
      if (res.devCode) sessionStorage.setItem(DEV_CODE_KEY, res.devCode);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!phone) return null;

  return (
    <form className="card" onSubmit={submit}>
      <h1>Enter your code</h1>
      <p className="muted">Sent to {phone}</p>
      {devCode && (
        <div className="dev-banner">
          🧪 Dev mode, no SMS sent. Your code is <strong>{devCode}</strong>
        </div>
      )}
      <input
        className="input otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        aria-label="Verification code"
      />
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading || code.length !== 6}>
        {loading ? 'Verifying…' : 'Verify'}
      </button>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn link" onClick={() => router.replace('/login')}>
          Change number
        </button>
        <button type="button" className="btn link" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}
