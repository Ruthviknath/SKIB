'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { completeOnboarding, getCities, getInterests } from './onboarding.api';
import { PhotoGrid } from '@/features/profile/PhotoGrid';
import { updateMyProfile } from '@/features/profile/profile.api';
import { errorMessage } from '@/lib/api';
import type { City, Gender, Interest, OnboardingStep, Profile } from '@/types/api';

const STEPS: OnboardingStep[] = ['basics', 'city', 'interests', 'photos'];

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Non-binary' },
];

interface Props {
  initialProfile: Profile;
}

export function OnboardingWizard({ initialProfile }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const firstMissing = initialProfile.onboarding.missing[0] ?? 'basics';
  const [stepIndex, setStepIndex] = useState(Math.max(0, STEPS.indexOf(firstMissing)));

  const [name, setName] = useState(initialProfile.name ?? '');
  const [birthDate, setBirthDate] = useState(initialProfile.birthDate ?? '');
  const [gender, setGender] = useState<Gender | ''>(initialProfile.gender ?? '');
  const [cityId, setCityId] = useState(initialProfile.city?.id ?? '');
  const [interestIds, setInterestIds] = useState<string[]>(initialProfile.interests.map((i) => i.id));
  const [bio, setBio] = useState(initialProfile.bio ?? '');

  const [cities, setCities] = useState<City[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCities().then(setCities).catch(() => {});
    getInterests().then(setInterests).catch(() => {});
  }, []);

  const step = STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);
  const rules = profile.onboarding.rules;

  function toggleInterest(id: string) {
    setInterestIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= rules.maxInterests) return prev;
      return [...prev, id];
    });
  }

  async function nextStep(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (step === 'basics') {
        if (!gender) throw new Error('Please select your gender');
        const updated = await updateMyProfile({ name, birthDate, gender });
        setProfile(updated);
        setStepIndex(1);
      } else if (step === 'city') {
        const updated = await updateMyProfile({ cityId });
        setProfile(updated);
        setStepIndex(2);
      } else if (step === 'interests') {
        const updated = await updateMyProfile({ interestIds, bio });
        setProfile(updated);
        setStepIndex(3);
      } else if (step === 'photos') {
        await completeOnboarding();
        router.replace('/profile');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // Group interests by category
  const groupedInterests = interests.reduce<Record<string, Interest[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <form className="card" onSubmit={nextStep}>
      <div className="progress">
        <div style={{ width: `${progress}%` }} />
      </div>
      <p className="muted">
        Step {stepIndex + 1} of {STEPS.length}
      </p>

      {step === 'basics' && (
        <>
          <h1>Tell us about you</h1>
          <label>
            First name
            <input
              className="input"
              placeholder="Asha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Birthday (must be {rules.minAge}+)
            <input
              type="date"
              className="input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </label>
          <label>
            Gender
            <div className="chips">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  className={`chip ${gender === g.value ? 'selected' : ''}`}
                  onClick={() => setGender(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </label>
        </>
      )}

      {step === 'city' && (
        <>
          <h1>Where do you want to meet people?</h1>
          <p className="muted">Pick your city to discover local plans and communities.</p>
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
        </>
      )}

      {step === 'interests' && (
        <>
          <h1>What are you into?</h1>
          <p className="muted">
            Pick {rules.minInterests} to {rules.maxInterests} interests ({interestIds.length} selected)
          </p>
          {Object.entries(groupedInterests).map(([category, list]) => (
            <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h2>{category}</h2>
              <div className="chips">
                {list.map((item) => (
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
            </div>
          ))}
          <label>
            Short bio (optional)
            <textarea
              className="input"
              rows={3}
              maxLength={rules.maxBioLength}
              placeholder="New in town, always up for coffee or badminton!"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
        </>
      )}

      {step === 'photos' && (
        <>
          <h1>Add your photos</h1>
          <p className="muted">
            Upload at least {rules.minPhotos} photo so members know who they&apos;re meeting at plans.
          </p>
          <PhotoGrid photos={profile.photos} maxPhotos={rules.maxPhotos} onChange={setProfile} />
        </>
      )}

      {error && <p className="error">{error}</p>}

      <div className="row">
        {stepIndex > 0 && (
          <button
            type="button"
            className="btn ghost"
            disabled={saving}
            onClick={() => {
              setError('');
              setStepIndex((i) => i - 1);
            }}
          >
            Back
          </button>
        )}
        <button
          type="submit"
          className="btn yellow"
          disabled={
            saving ||
            (step === 'basics' && (!name.trim() || !birthDate || !gender)) ||
            (step === 'city' && !cityId) ||
            (step === 'interests' && interestIds.length < rules.minInterests) ||
            (step === 'photos' && profile.photos.length < rules.minPhotos)
          }
        >
          {saving ? 'Saving…' : step === 'photos' ? 'Finish setup' : 'Continue'}
        </button>
      </div>
    </form>
  );
}
