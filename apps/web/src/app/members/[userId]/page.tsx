'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { useAuthGate } from '@/features/auth/useAuthGate';
import { getUserRatings } from '@/features/memories/memories.api';
import { getPublicProfile } from '@/features/profile/profile.api';
import { blockUser, submitReport } from '@/features/safety/safety.api';
import { errorMessage } from '@/lib/api';
import type { PublicProfile, UserRatingsSummary } from '@/types/api';

export default function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { profile: viewer, ready } = useAuthGate('member');
  const [member, setMember] = useState<PublicProfile | null>(null);
  const [ratings, setRatings] = useState<UserRatingsSummary | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<'SPAM' | 'HARASSMENT' | 'FAKE_PROFILE' | 'NO_SHOW' | 'INAPPROPRIATE' | 'OTHER'>('HARASSMENT');
  const [details, setDetails] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || !userId) return;
    getPublicProfile(userId)
      .then(setMember)
      .catch((err) => setError(errorMessage(err)));
    getUserRatings(userId)
      .then(setRatings)
      .catch(() => {});
  }, [ready, userId]);

  async function onBlock() {
    if (!userId || !window.confirm(`Block ${member?.name ?? 'this user'}?`)) return;
    await blockUser(userId);
    router.push('/safety');
  }

  async function onReport(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    await submitReport({ targetUserId: userId, reason, details: details.trim() || undefined });
    setReporting(false);
    setDetails('');
    setNotice('Report submitted to SKIB moderation.');
  }

  if (!ready) {
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
        <button type="button" className="btn link" onClick={() => router.back()}>
          ← Back
        </button>
      </div>
      <AppNav />
      {error ? (
        <div className="card">
          <p className="error">{error}</p>
        </div>
      ) : !member ? (
        <div className="card" style={{ alignItems: 'center', padding: 36 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="profile-hero">
            {member.photos[activePhoto] && <img src={member.photos[activePhoto].url} alt={member.name} />}
            <div className="overlay">
              <h1>
                {member.name}
                {member.age ? `, ${member.age}` : ''}
              </h1>
              <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                📍 {member.city?.name ?? 'Member'} · {member.gender}
                {ratings?.averageScore ? ` · ⭐ ${ratings.averageScore} (${ratings.count} vouches)` : ''}
              </p>
            </div>
          </div>

          {member.photos.length > 1 && (
            <div className="thumbs">
              {member.photos.map((p, idx) => (
                <img
                  key={p.id}
                  src={p.url}
                  alt=""
                  className={idx === activePhoto ? 'active' : ''}
                  onClick={() => setActivePhoto(idx)}
                />
              ))}
            </div>
          )}

          <div className="card">
            {member.bio && (
              <div>
                <h2>About {member.name}</h2>
                <p style={{ margin: '6px 0 0' }}>{member.bio}</p>
              </div>
            )}
            <div>
              <h2>Interests</h2>
              <div className="chips" style={{ marginTop: 8 }}>
                {member.interests.map((i) => (
                  <span key={i.id} className="chip static">
                    {i.name}
                  </span>
                ))}
              </div>
            </div>

            {ratings && ratings.ratings.length > 0 && (
              <div>
                <h2>Attendee Vouches ({ratings.count})</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {ratings.ratings.map((r) => (
                    <div key={r.id} style={{ background: 'var(--yellow-soft)', padding: 10, borderRadius: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {r.score}★ {r.vouchTag ? `· ${r.vouchTag}` : ''} — by {r.rater.name}
                      </div>
                      {r.comment && <div style={{ fontSize: 13, marginTop: 2 }}>{r.comment}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {notice && <div className="dev-banner">{notice}</div>}

            {viewer?.id !== member.id && (
              <div className="row">
                <button type="button" className="btn ghost" onClick={() => setReporting((s) => !s)}>
                  🚩 Report
                </button>
                <button type="button" className="btn danger" onClick={onBlock}>
                  🚫 Block
                </button>
              </div>
            )}

            {reporting && (
              <form onSubmit={onReport} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select
                  className="input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as typeof reason)}
                >
                  <option value="HARASSMENT">Harassment</option>
                  <option value="FAKE_PROFILE">Fake profile</option>
                  <option value="NO_SHOW">No-show at plan</option>
                  <option value="SPAM">Spam</option>
                  <option value="INAPPROPRIATE">Inappropriate behavior</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  className="input"
                  placeholder="Additional details (optional)"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
                <button type="submit" className="btn yellow">
                  Submit report
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </main>
  );
}
