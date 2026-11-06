'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPlan } from './plans.api';
import { getCities, getInterests } from '@/features/onboarding/onboarding.api';
import { errorMessage } from '@/lib/api';
import type { City, Interest, Profile } from '@/types/api';

interface Props {
  viewer: Profile;
}

export function HostPlanForm({ viewer }: Props) {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [cityId, setCityId] = useState(viewer.city?.id ?? '');
  const [interestId, setInterestId] = useState(viewer.interests[0]?.id ?? '');
  const [startsAtLocal, setStartsAtLocal] = useState(() => {
    const d = new Date(Date.now() + 24 * 3600_000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [capacity, setCapacity] = useState(6);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCities().then((list) => {
      setCities(list);
      if (!cityId && list[0]) setCityId(list[0].id);
    });
    getInterests().then((list) => {
      setInterests(list);
      if (!interestId && list[0]) setInterestId(list[0].id);
    });
  }, [cityId, interestId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const plan = await createPlan({
        title,
        description: description.trim() || undefined,
        venue,
        cityId,
        interestId,
        startsAt: new Date(startsAtLocal).toISOString(),
        capacity: Number(capacity),
      });
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h1>Host a Plan</h1>
      <p className="muted">Propose a meetup in your city. You review and approve who joins.</p>

      <label>
        Plan title
        <input
          className="input"
          placeholder="Evening Pour-Over Coffee in Indiranagar"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={5}
          maxLength={80}
        />
      </label>

      <div className="row">
        <label style={{ flex: 1 }}>
          City
          <select className="input" value={cityId} onChange={(e) => setCityId(e.target.value)} required>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ flex: 1 }}>
          Activity / Interest
          <select className="input" value={interestId} onChange={(e) => setInterestId(e.target.value)} required>
            {interests.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.category})
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Venue / Meeting point
        <input
          className="input"
          placeholder="Third Wave Coffee, 12th Main Indiranagar"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          required
          minLength={3}
        />
      </label>

      <div className="row">
        <label style={{ flex: 2 }}>
          Date & Time
          <input
            type="datetime-local"
            className="input"
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
            required
          />
        </label>
        <label style={{ flex: 1 }}>
          Max group size
          <input
            type="number"
            className="input"
            min={2}
            max={30}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            required
          />
        </label>
      </div>

      <label>
        Details / What to expect (optional)
        <textarea
          className="input"
          rows={3}
          maxLength={600}
          placeholder="Casual conversation, newcomers welcome!"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="btn yellow" disabled={saving || !title.trim() || !venue.trim()}>
        {saving ? 'Publishing…' : 'Publish plan'}
      </button>
    </form>
  );
}
