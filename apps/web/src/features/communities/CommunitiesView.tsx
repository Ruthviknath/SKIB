'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createCommunity, listCommunities } from './communities.api';
import { getCities, getInterests } from '@/features/onboarding/onboarding.api';
import { errorMessage } from '@/lib/api';
import type { City, CommunitySummary, Interest, Profile } from '@/types/api';

interface Props {
  viewer: Profile;
}

export function CommunitiesView({ viewer }: Props) {
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [cityId, setCityId] = useState(viewer.city?.id ?? '');
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [interestId, setInterestId] = useState(viewer.interests[0]?.id ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    getCities().then(setCities).catch(() => {});
    getInterests().then((list) => {
      setInterests(list);
      if (!interestId && list[0]) setInterestId(list[0].id);
    });
  }, [interestId]);

  useEffect(() => {
    listCommunities(cityId || undefined)
      .then(setCommunities)
      .catch((err) => setError(errorMessage(err)));
  }, [cityId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createCommunity({
        name,
        description,
        cityId: cityId || viewer.city?.id || cities[0]?.id || '',
        interestId,
      });
      setName('');
      setDescription('');
      setShowCreate(false);
      setCommunities(await listCommunities(cityId || undefined));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <select
            className="input"
            style={{ width: 'auto', padding: '8px 12px', fontSize: 14 }}
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="chip selected"
            onClick={() => setShowCreate((s) => !s)}
          >
            {showCreate ? 'Close' : '➕ New Community'}
          </button>
        </div>
      </div>

      {showCreate && (
        <form className="card" onSubmit={onCreate}>
          <h2>Start a Local Community</h2>
          <input
            className="input"
            placeholder="Community name (e.g. Indiranagar Run Club)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select className="input" value={interestId} onChange={(e) => setInterestId(e.target.value)} required>
            {interests.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.category})
              </option>
            ))}
          </select>
          <textarea
            className="input"
            rows={2}
            placeholder="What is this community about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <button type="submit" className="btn yellow">
            Create community
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}

      {communities.map((c) => (
        <Link
          key={c.id}
          href={`/communities/${c.id}`}
          className="card"
          style={{ textDecoration: 'none', color: 'inherit', gap: 8 }}
        >
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="chip static">{c.interest.name}</span>
            <span className="muted">
              {c.memberCount} members · {c.postCount} posts
            </span>
          </div>
          <h2>{c.name}</h2>
          <p className="muted">{c.description}</p>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>📍 {c.city.name}</span>
            {c.joined && <span className="chip selected">Joined ✓</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
