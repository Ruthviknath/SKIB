import { api } from '@/lib/api';
import type { Candidate, DirectMessage, MatchSummary, PublicProfile } from '@/types/api';

export const listCandidates = async (cityId?: string) =>
  (
    await api<{ candidates: Candidate[] }>(
      `/discovery/candidates${cityId ? `?cityId=${encodeURIComponent(cityId)}` : ''}`,
    )
  ).candidates;

export const swipeCandidate = async (targetUserId: string, action: 'LIKE' | 'PASS') =>
  api<{ matched: boolean; match: { id: string; createdAt: string; peer: PublicProfile } | null }>(
    '/discovery/swipe',
    { method: 'POST', body: { targetUserId, action } },
  );

export const listMatches = async () => (await api<{ matches: MatchSummary[] }>('/discovery/matches')).matches;

export const getMatchConversation = async (matchId: string) =>
  api<{ match: { id: string; createdAt: string; peer: PublicProfile }; messages: DirectMessage[] }>(
    `/matches/${matchId}/messages`,
  );

export const sendDirectMessage = async (matchId: string, body: string) =>
  (await api<{ message: DirectMessage }>(`/matches/${matchId}/messages`, { method: 'POST', body: { body } }))
    .message;
