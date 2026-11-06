'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { useAuthGate } from '@/features/auth/useAuthGate';
import { getPublicProfile } from '@/features/profile/profile.api';
import { errorMessage } from '@/lib/api';
import type { PublicProfile } from '@/types/api';

export default function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { ready } = useAuthGate('member');
  const [member, setMember] = useState<PublicProfile | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || !userId) return;
    getPublicProfile(userId)
      .then(setMember)
      .catch((err) => setError(errorMessage(err)));
  }, [ready, userId]);

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
          </div>
        </>
      )}
    </main>
  );
}
