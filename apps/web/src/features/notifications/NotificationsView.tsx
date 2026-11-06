'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listNotifications, markAllNotificationsRead } from './notifications.api';
import { errorMessage } from '@/lib/api';
import type { NotificationItem } from '@/types/api';

export function NotificationsView() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    listNotifications()
      .then((res) => {
        setItems(res.notifications);
        setUnreadCount(res.unreadCount);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  async function onReadAll() {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Notifications ({unreadCount} unread)</h2>
          {unreadCount > 0 && (
            <button type="button" className="chip selected" onClick={onReadAll}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="muted">No notifications yet.</p>
        </div>
      ) : (
        items.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{
              background: n.readAt ? '#fff' : 'var(--yellow-soft)',
              gap: 6,
            }}
          >
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{n.title}</strong>
              <span className="muted">{new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>{n.body}</p>
            {n.link && (
              <Link href={n.link} className="btn link" style={{ alignSelf: 'flex-start', padding: 0 }}>
                Open →
              </Link>
            )}
          </div>
        ))
      )}
    </div>
  );
}
