'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PhotoGrid } from './PhotoGrid';
import { deleteAccount, updateMyProfile } from './profile.api';
import { getCities, getInterests } from '@/features/onboarding/onboarding.api';
import { errorMessage } from '@/lib/api';
import { session } from '@/lib/session';
import type { City, Interest, Profile } from '@/types/api';

interface Props {
  initialProfile: Profile;
}

export function ProfileView({ initialProfile }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [activePhoto, setActivePhoto] = useState(0);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState(initialProfile.name ?? '');
  const [bio, setBio] = useState(initialProfile.bio ?? '');
  const [cityId, setCityId] = useState(initialProfile.city?.id ?? '');
  const [interestIds, setInterestIds] = useState<string[]>(initialProfile.interests.map((i) => i.id));

  const [cities, setCities] = useState<City[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    getCities().then(setCities).catch(() => {});
    getInterests().then(setInterests).catch(() => {});
  }, [editing]);

  const rules = profile.onboarding.rules;

  function toggleInterest(id: string) {
    setInterestIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= rules.maxInterests) return prev;
      return [...prev, id];
    });
  }

  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updated = await updateMyProfile({ name, bio, cityId, interestIds });
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    session.clear();
    router.replace('/login');
  }

  async function onDeleteAccount() {
    if (!window.confirm('Delete your SKIB account permanently?')) return;
    await deleteAccount();
    session.clear();
    router.replace('/login');
  }

  const heroPhoto = profile.photos[activePhoto] ?? profile.photos[0];

  if (editing) {
    return (
      <form className="card" onSubmit={saveEdits}>
        <h1>Edit profile</h1>
        <PhotoGrid photos={profile.photos} maxPhotos={rules.maxPhotos} onChange={setProfile} />
        <label>
          Name
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          City
          <div className="chips">
            {cities.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${cityId === c.id ? 'selected' : ''}`}
                onClick={() => setCityId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </label>
        <label>
          Bio
          <textarea
            className="input"
            rows={3}
            maxLength={rules.maxBioLength}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        <label>
          Interests ({interestIds.length}/{rules.maxInterests})
          <div className="chips">
            {interests.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`chip ${interestIds.includes(item.id) ? 'selected' : ''}`}
                onClick={() => toggleInterest(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn yellow"
            disabled={saving || interestIds.length < rules.minInterests}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="profile-hero">
        {heroPhoto && <img src={heroPhoto.url} alt={profile.name ?? 'Profile'} />}
        <div className="overlay">
          <h1>
            {profile.name}
            {profile.age ? `, ${profile.age}` : ''}
          </h1>
          <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
            📍 {profile.city?.name ?? 'No city'} · {profile.gender}
          </p>
        </div>
      </div>

      {profile.photos.length > 1 && (
        <div className="thumbs">
          {profile.photos.map((p, idx) => (
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
        {profile.bio && (
          <div>
            <h2>About me</h2>
            <p style={{ margin: '6px 0 0' }}>{profile.bio}</p>
          </div>
        )}
        <div>
          <h2>Interests</h2>
          <div className="chips" style={{ marginTop: 8 }}>
            {profile.interests.map((i) => (
              <span key={i.id} className="chip static">
                {i.name}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="btn yellow" onClick={() => setEditing(true)}>
          Edit profile
        </button>
        <div className="row">
          <button type="button" className="btn ghost" onClick={logout}>
            Log out
          </button>
          <button type="button" className="btn danger" onClick={onDeleteAccount}>
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
