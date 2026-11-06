import { api } from '@/lib/api';
import type { CommunityDetail, CommunityPost, CommunitySummary } from '@/types/api';

export const listCommunities = async (cityId?: string) =>
  (
    await api<{ communities: CommunitySummary[] }>(
      `/communities${cityId ? `?cityId=${encodeURIComponent(cityId)}` : ''}`,
    )
  ).communities;

export const getCommunity = async (communityId: string) =>
  (await api<{ community: CommunityDetail }>(`/communities/${communityId}`)).community;

export const createCommunity = async (input: {
  name: string;
  description: string;
  cityId: string;
  interestId: string;
}) => (await api<{ community: CommunityDetail }>('/communities', { method: 'POST', body: input })).community;

export const joinCommunity = async (communityId: string) =>
  (await api<{ community: CommunityDetail }>(`/communities/${communityId}/join`, { method: 'POST' })).community;

export const leaveCommunity = async (communityId: string) =>
  (await api<{ community: CommunityDetail }>(`/communities/${communityId}/join`, { method: 'DELETE' })).community;

export const createCommunityPost = async (communityId: string, body: string) =>
  (await api<{ post: CommunityPost }>(`/communities/${communityId}/posts`, { method: 'POST', body: { body } }))
    .post;
