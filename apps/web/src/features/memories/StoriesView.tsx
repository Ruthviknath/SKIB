'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createStory, listStories, rateAttendee } from './memories.api';
import { listPlans } from '@/features/plans/plans.api';
import { errorMessage } from '@/lib/api';
import type { Plan, Profile, StoryItem } from '@/types/api';

const VOUCH_TAGS = ['Great energy', 'Super welcoming', 'On time', 'Great conversation'] as const;

interface Props {
  viewer: Profile;
}

export function StoriesView({ viewer }: Props) {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [myPlans, setMyPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [ratePlanId, setRatePlanId] = useState('');
  const [rateeId, setRateeId] = useState('');
  const [score, setScore] = useState(5);
  const [vouchTag, setVouchTag] = useState<(typeof VOUCH_TAGS)[number]>('Great energy');
  const [comment, setComment] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listStories()
      .then(setStories)
      .catch((err) => setError(errorMessage(err)));
    listPlans({ mine: true })
      .then((list) => {
        const approved = list.filter((p) => p.myMembership?.status === 'APPROVED');
        setMyPlans(approved);
        if (approved[0]) {
          setPlanId(approved[0].id);
          setRatePlanId(approved[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const selectedRatePlan = myPlans.find((p) => p.id === ratePlanId);
  const fellowAttendees =
    selectedRatePlan?.attendees.filter((a) => a.user.id !== viewer.id).map((a) => a.user) ?? [];

  async function onShareStory(e: React.FormEvent) {
    e.preventDefault();
    if (!planId || !caption.trim()) return;
    setError('');
    setFeedback('');
    try {
      const created = await createStory(planId, caption.trim(), file);
      setStories((prev) => [created, ...prev]);
      setCaption('');
      setFile(null);
      setFeedback('Story shared!');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function onRate(e: React.FormEvent) {
    e.preventDefault();
    const targetId = rateeId || fellowAttendees[0]?.id;
    if (!ratePlanId || !targetId) return;
    setError('');
    setFeedback('');
    try {
      await rateAttendee({
        planId: ratePlanId,
        rateeId: targetId,
        score,
        vouchTag,
        comment: comment.trim() || undefined,
      });
      setComment('');
      setFeedback('Vouch & rating submitted!');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {myPlans.length > 0 && (
        <form className="card" onSubmit={onShareStory}>
          <h2>📸 Share a Post-Plan Moment</h2>
          <select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {myPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.city.name})
              </option>
            ))}
          </select>
          <textarea
            className="input"
            rows={2}
            placeholder="How did the meetup go? Share a memory!"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            required
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button type="submit" className="btn yellow">
            Post story
          </button>
        </form>
      )}

      {myPlans.length > 0 && fellowAttendees.length > 0 && (
        <form className="card" onSubmit={onRate}>
          <h2>⭐ Vouch for an Attendee</h2>
          <div className="row">
            <select
              className="input"
              value={ratePlanId}
              onChange={(e) => {
                setRatePlanId(e.target.value);
                setRateeId('');
              }}
            >
              {myPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={rateeId || fellowAttendees[0]?.id || ''}
              onChange={(e) => setRateeId(e.target.value)}
            >
              {fellowAttendees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="chips">
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${score === s ? 'selected' : ''}`}
                onClick={() => setScore(s)}
              >
                {s} ★
              </button>
            ))}
          </div>
          <div className="chips">
            {VOUCH_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`chip ${vouchTag === tag ? 'selected' : ''}`}
                onClick={() => setVouchTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder="Short note (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit" className="btn">
            Submit vouch
          </button>
        </form>
      )}

      {feedback && <div className="dev-banner">✨ {feedback}</div>}
      {error && <p className="error">{error}</p>}

      {stories.map((s) => (
        <div key={s.id} className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href={`/members/${s.author.id}`} style={{ fontWeight: 700, color: 'inherit' }}>
              {s.author.name}
            </Link>
            <Link href={`/plans/${s.plan.id}`} className="chip static" style={{ textDecoration: 'none' }}>
              {s.plan.title}
            </Link>
          </div>
          {s.photoUrl && (
            <img
              src={s.photoUrl}
              alt=""
              style={{ width: '100%', borderRadius: 16, maxHeight: 280, objectFit: 'cover' }}
            />
          )}
          <p style={{ margin: 0 }}>{s.caption}</p>
        </div>
      ))}
    </div>
  );
}
