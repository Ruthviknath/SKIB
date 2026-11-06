'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCandidates, listMatches, swipeCandidate } from './discovery.api';
import { errorMessage } from '@/lib/api';
import type { Candidate, MatchSummary, Profile } from '@/types/api';

interface Props {
  viewer: Profile;
}

export function BffDiscoveryView({ viewer }: Props) {
  const [tab, setTab] = useState<'swipe' | 'matches'>('swipe');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [matchBanner, setMatchBanner] = useState<{ matchId: string; peerName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([listCandidates(viewer.city?.id), listMatches()])
      .then(([cands, m]) => {
        setCandidates(cands);
        setMatches(m);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [viewer.city?.id]);

  async function onSwipe(action: 'LIKE' | 'PASS') {
    const current = candidates[0];
    if (!current) return;
    setError('');
    setBusy(true);
    try {
      const res = await swipeCandidate(current.id, action);
      setCandidates((prev) => prev.slice(1));
      if (res.matched && res.match) {
        setMatchBanner({ matchId: res.match.id, peerName: res.match.peer.name });
        setMatches(await listMatches());
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const current = candidates[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: 14 }}>
        <div className="row">
          <button
            type="button"
            className={`chip ${tab === 'swipe' ? 'selected' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setTab('swipe')}
          >
            💛 Swipe BFF ({candidates.length})
          </button>
          <button
            type="button"
            className={`chip ${tab === 'matches' ? 'selected' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setTab('matches')}
          >
            💬 Matches ({matches.length})
          </button>
        </div>
      </div>

      {matchBanner && (
        <div className="dev-banner">
          <span>🎉 You matched with {matchBanner.peerName}!</span>
          <Link href={`/matches/${matchBanner.matchId}`} className="chip selected" style={{ textDecoration: 'none' }}>
            Message now
          </Link>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="card" style={{ alignItems: 'center', padding: 36 }}>
          <div className="spinner" />
        </div>
      ) : tab === 'swipe' ? (
        !current ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <h2>You&apos;re all caught up in {viewer.city?.name ?? 'your city'}!</h2>
            <p className="muted">Check your Matches tab or join a local Plan to meet more people.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="profile-hero">
              {current.photos[0] && <img src={current.photos[0].url} alt={current.name} />}
              <div className="overlay">
                <h1>
                  {current.name}
                  {current.age ? `, ${current.age}` : ''}
                </h1>
                <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                  📍 {current.city?.name} · {current.sharedInterestCount} shared interests
                </p>
              </div>
            </div>

            <div className="card">
              {current.bio && <p style={{ margin: 0 }}>{current.bio}</p>}
              <div className="chips">
                {current.interests.map((i) => (
                  <span
                    key={i.id}
                    className={`chip ${current.sharedInterests.includes(i.name) ? 'selected' : 'static'}`}
                  >
                    {i.name}
                  </span>
                ))}
              </div>
              <div className="row">
                <button type="button" className="btn ghost" disabled={busy} onClick={() => onSwipe('PASS')}>
                  ✕ Pass
                </button>
                <button type="button" className="btn yellow" disabled={busy} onClick={() => onSwipe('LIKE')}>
                  💛 Wave / Connect
                </button>
              </div>
            </div>
          </div>
        )
      ) : matches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <h2>No BFF matches yet</h2>
          <p className="muted">Swipe in the BFF tab to connect 1:1 with people who share your interests.</p>
        </div>
      ) : (
        matches.map((m) => (
          <Link
            key={m.id}
            href={`/matches/${m.id}`}
            className="card"
            style={{ textDecoration: 'none', color: 'inherit', gap: 6 }}
          >
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>
                {m.peer.name}
                {m.peer.age ? `, ${m.peer.age}` : ''}
              </h2>
              <span className="chip static">{m.peer.city?.name}</span>
            </div>
            <p className="muted">
              {m.lastMessage ? m.lastMessage.body : 'New match! Tap to send the first message 👋'}
            </p>
          </Link>
        ))
      )}
    </div>
  );
}
