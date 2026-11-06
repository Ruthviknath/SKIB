import { api } from '@/lib/api';
import type { Profile, ProfileUpdate } from '@/types/api';

type ProfileResponse = { profile: Profile };

export const getMyProfile = async () => (await api<ProfileResponse>('/profile/me')).profile;

export const updateMyProfile = async (update: ProfileUpdate) =>
  (await api<ProfileResponse>('/profile/me', { method: 'PATCH', body: update })).profile;

export async function uploadPhoto(file: File) {
  const form = new FormData();
  form.append('photo', file);
  return (await api<ProfileResponse>('/profile/me/photos', { form })).profile;
}

export const deletePhoto = async (photoId: string) =>
  (await api<ProfileResponse>(`/profile/me/photos/${photoId}`, { method: 'DELETE' })).profile;

export const deleteAccount = () => api<null>('/profile/me', { method: 'DELETE' });
