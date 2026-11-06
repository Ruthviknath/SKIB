import { api } from '@/lib/api';
import type { NotificationItem } from '@/types/api';

export const listNotifications = async () =>
  api<{ unreadCount: number; notifications: NotificationItem[] }>('/notifications');

export const markAllNotificationsRead = async () =>
  api<{ ok: boolean }>('/notifications/read-all', { method: 'POST' });

export const markNotificationRead = async (id: string) =>
  api<{ notification: NotificationItem }>(`/notifications/${id}/read`, { method: 'POST' });
