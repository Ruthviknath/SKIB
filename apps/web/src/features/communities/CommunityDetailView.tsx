'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createCommunityPost, getCommunity, joinCommunity, leaveCommunity } from './communities.api';
import { errorMessage } from '@/lib/api';
import type { CommunityDetail } from '@/types/api';

interface Props {
  communityId: string;
}

export function CommunityDetailView({ communityId }: Props) {
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [postBody, setPostBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCommunity(communityId)
      .then(setCommunity)
      .catch((err) => setError(errorMessage(err)));
  }, [communityId]);

  async function onToggleJoin() {
    if (!community) return;
    setError('');
    setBusy(true);
    try {
      const updated = community.joined
        ? await leaveCommunity(communityId)
        : await joinCommunity(communityId);
      setCommunity(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onPost(e: React.FormEvent) {
    e.preventDefault();
    if (!postBody.trim()) return;
    setError('');
    setBusy(true);
    try {
      const post = await createCommunityPost(communityId, postBody.trim());
      setCommunity((prev) => (prev ? { ...prev, posts: [post, ...prev.posts] } : prev));
      setPostBody('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!community) {
    return (
      <div className="card" style={{ alignItems: 'center', padding: 36 }}>
        {error ? <p className="error">{error}</p> : <div className="spinner" />}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="chip static">{community.interest.name}</span>
          <span className="muted">📍 {community.city.name}</span>
        </div>
        <h1>{community.name}</h1>
        <p style={{ margin: 0 }}>{community.description}</p>

        <div>
          <h2>Members ({community.members.length})</h2>
          <div className="chips" style={{ marginTop: 8 }}>
            {community.members.map((m) => (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="chip"
                style={{ textDecoration: 'none' }}
              >
                {m.name}
                {m.age ? `, ${m.age}` : ''}
              </Link>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`btn ${community.joined ? 'ghost' : 'yellow'}`}
          disabled={busy}
          onClick={onToggleJoin}
        >
          {community.joined ? 'Leave community' : 'Join community'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {community.joined && (
        <form className="card" onSubmit={onPost}>
          <h2>Share with the community</h2>
          <textarea
            className="input"
            rows={2}
            placeholder="Ask a question, share a spot, or propose a hangout…"
            value={postBody}
            onChange={(e) => setPostBody(e.target.value)}
            required
          />
          <button type="submit" className="btn yellow" disabled={busy || !postBody.trim()}>
            Post
          </button>
        </form>
      )}

      <div className="card">
        <h2>Community Feed ({community.posts.length})</h2>
        {community.posts.length === 0 ? (
          <p className="muted">No posts yet. Join and start the conversation!</p>
        ) : (
          community.posts.map((p) => (
            <div
              key={p.id}
              style={{
                borderBottom: '1px solid var(--line)',
                paddingBottom: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Link href={`/members/${p.author.id}`} style={{ fontWeight: 700, color: 'inherit' }}>
                  {p.author.name}
                </Link>
                <span className="muted">{new Date(p.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
              <p style={{ margin: 0 }}>{p.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
