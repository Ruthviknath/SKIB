import { api } from '@/lib/api';
import type { PublicProfile, ReportItem } from '@/types/api';

export const listBlockedUsers = async () =>
  (await api<{ blocks: Array<{ blockedAt: string; user: PublicProfile }> }>('/safety/blocks')).blocks;

export const blockUser = async (userId: string) =>
  (await api<{ blocks: Array<{ blockedAt: string; user: PublicProfile }> }>(`/safety/block/${userId}`, { method: 'POST' }))
    .blocks;

export const unblockUser = async (userId: string) =>
  (
    await api<{ blocks: Array<{ blockedAt: string; user: PublicProfile }> }>(`/safety/block/${userId}`, {
      method: 'DELETE',
    })
  ).blocks;

export const submitReport = async (input: {
  targetUserId: string;
  reason: 'SPAM' | 'HARASSMENT' | 'FAKE_PROFILE' | 'NO_SHOW' | 'INAPPROPRIATE' | 'OTHER';
  details?: string;
}) => (await api<{ report: ReportItem }>('/safety/reports', { method: 'POST', body: input })).report;

export const listReports = async () => (await api<{ reports: ReportItem[] }>('/safety/reports')).reports;

export const resolveReport = async (reportId: string, status: 'OPEN' | 'RESOLVED') =>
  (await api<{ report: ReportItem }>(`/safety/reports/${reportId}`, { method: 'PATCH', body: { status } })).report;
