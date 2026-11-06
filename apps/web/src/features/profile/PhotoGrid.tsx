'use client';

import { useRef, useState } from 'react';
import { deletePhoto, uploadPhoto } from './profile.api';
import { errorMessage } from '@/lib/api';
import type { Photo, Profile } from '@/types/api';

interface Props {
  photos: Photo[];
  maxPhotos: number;
  onChange: (profile: Profile) => void;
}

export function PhotoGrid({ photos, maxPhotos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const updated = await uploadPhoto(file);
      onChange(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(photoId: string) {
    setError('');
    setBusy(true);
    try {
      const updated = await deletePhoto(photoId);
      onChange(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const slots = Array.from({ length: maxPhotos }, (_, i) => photos[i] ?? null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={onPick}
      />
      <div className="photo-grid">
        {slots.map((photo, idx) =>
          photo ? (
            <div key={photo.id} className="photo-slot">
              <img src={photo.url} alt={`Photo ${idx + 1}`} />
              <button
                type="button"
                className="remove"
                disabled={busy}
                onClick={() => onRemove(photo.id)}
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              key={`slot-${idx}`}
              type="button"
              className="photo-slot"
              disabled={busy || photos.length >= maxPhotos}
              onClick={() => inputRef.current?.click()}
              aria-label="Add photo"
            >
              {busy && idx === photos.length ? '…' : '+'}
            </button>
          ),
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
