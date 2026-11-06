import { api } from '@/lib/api';
import type { StoryItem, UserRatingItem, UserRatingsSummary } from '@/types/api';

export const listStories = async (cityId?: string) =>
  (
    await api<{ stories: StoryItem[] }>(`/memories/stories${cityId ? `?cityId=${encodeURIComponent(cityId)}` : ''}`)
  ).stories;

export async function createStory(planId: string, caption: string, file?: File | null) {
  const form = new FormData();
  form.append('planId', planId);
  form.append('caption', caption);
  if (file) form.append('photo', file);
  return (await api<{ story: StoryItem }>('/memories/stories', { form })).story;
}

export const rateAttendee = async (input: {
  planId: string;
  rateeId: string;
  score: number;
  vouchTag?: 'Great energy' | 'Super welcoming' | 'On time' | 'Great conversation';
  comment?: string;
}) => (await api<{ rating: UserRatingItem }>('/memories/ratings', { method: 'POST', body: input })).rating;

export const getUserRatings = async (userId: string) =>
  api<UserRatingsSummary>(`/memories/ratings/${userId}`);
