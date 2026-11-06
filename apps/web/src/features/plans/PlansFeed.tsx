'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listPlans } from './plans.api';
import { getCities } from '@/features/onboarding/onboarding.api';
import { errorMessage } from '@/lib/api';
import type { City, Plan, Profile } from '@/types/api';

const CATEGORIES = ['All', 'Food & Drink', 'Sports', 'Outdoors', 'Culture', 'Social'];

interface Props {
  viewer: Profile;
}

export function PlansFeed({ viewer }: Props) {
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState<string>(viewer.city?.id ?? '');
  const [category, setCategory] = useState<string>('All');
  const [mineOnly, setMineOnly] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    listPlans({
      cityId: mineOnly ? undefined : cityId || undefined,
      category: category === 'All' ? undefined : category,
      mine: mineOnly,
    })
      .then(setPlans)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [cityId, category, mineOnly]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: 16, gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="chips">
            <button
              type="button"
              className={`chip ${!mineOnly ? 'selected' : ''}`}
              onClick={() => setMineOnly(false)}
            >
              Discover
            </button>
            <button
              type="button"
              className={`chip ${mineOnly ? 'selected' : ''}`}
              onClick={() => setMineOnly(true)}
            >
              My Plans
            </button>
          </div>

          {!mineOnly && (
            <select
              className="input"
              style={{ width: 'auto', padding: '8px 12px', fontSize: 14 }}
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              aria-label="Filter by city"
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip ${category === cat ? 'selected' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="card" style={{ alignItems: 'center', padding: 36 }}>
          <div className="spinner" />
        </div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <h2>No plans found</h2>
          <p className="muted">Be the first to host a plan in this city!</p>
          <Link href="/plans/new" className="btn yellow" style={{ textDecoration: 'none' }}>
            Host a plan
          </Link>
        </div>
      ) : (
        plans.map((plan) => {
          const dt = new Date(plan.startsAt);
          const dateLabel = dt.toLocaleString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });
          return (
            <Link
              key={plan.id}
              href={`/plans/${plan.id}`}
              className="card"
              style={{ textDecoration: 'none', color: 'inherit', gap: 10 }}
            >
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="chip static">{plan.interest.name}</span>
                <span className="muted" style={{ fontWeight: 600 }}>
                  {plan.spotsFilled}/{plan.capacity} going · {plan.spotsLeft} spots left
                </span>
              </div>
              <h2 style={{ fontSize: 20 }}>{plan.title}</h2>
              <p className="muted">
                🗓️ {dateLabel} · 📍 {plan.venue} ({plan.city.name})
              </p>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                  {plan.host.photos[0] && (
                    <img
                      src={plan.host.photos[0].url}
                      alt={plan.host.name}
                      style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Hosted by {plan.host.name}</span>
                </div>
                {plan.myMembership && (
                  <span className="chip selected" style={{ fontSize: 12, padding: '4px 10px' }}>
                    {plan.myMembership.role === 'HOST'
                      ? 'Hosting'
                      : plan.myMembership.status === 'APPROVED'
                        ? 'Approved ✓'
                        : plan.myMembership.status === 'PENDING'
                          ? 'Pending approval'
                          : 'Declined'}
                  </span>
                )}
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
