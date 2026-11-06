'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorMessage } from '@/lib/api';
import { session } from '@/lib/session';
import { requestOtp } from './auth.api';

export const DEV_CODE_KEY = 'skib.devCode';

export function PhoneForm() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState('+91');
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const digits = number.replace(/\D/g, '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await requestOtp(`${countryCode}${digits}`);
      session.setPendingPhone(res.phone);
      if (res.devCode) sessionStorage.setItem(DEV_CODE_KEY, res.devCode);
      router.push('/verify');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h1>What&apos;s your number?</h1>
      <p className="muted">We&apos;ll text you a code to verify it&apos;s really you.</p>
      <div className="row">
        <input className="input cc" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} aria-label="Country code" />
        <input
          className="input"
          inputMode="numeric"
          autoFocus
          placeholder="98765 43210"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          aria-label="Phone number"
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading || digits.length < 7}>
        {loading ? 'Sending…' : 'Continue'}
      </button>
    </form>
  );
}
