'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  cancelPlan,
  getPlan,
  leavePlan,
  listPlanMessages,
  requestJoinPlan,
  reviewJoinRequest,
  sendPlanMessage,
} from './plans.api';
import { errorMessage } from '@/lib/api';
import { session } from '@/lib/session';
import type { Plan, PlanMessage, Profile } from '@/types/api';

interface Props {
  planId: string;
  viewer: Profile;
}

export function PlanDetailView({ planId, viewer }: Props) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [messages, setMessages] = useState<PlanMessage[]>([]);
  const [note, setNote] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);

  const isApproved = plan?.myMembership?.status === 'APPROVED';
  const isHost = plan?.host.id === viewer.id;

  useEffect(() => {
    getPlan(planId)
      .then(setPlan)
      .catch((err) => setError(errorMessage(err)));
  }, [planId]);

  // Load chat history & connect Socket.IO when approved
  useEffect(() => {
    if (!isApproved) return;
    listPlanMessages(planId)
      .then(setMessages)
      .catch(() => {});

    const token = session.getToken();
    if (!token) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';
    const socket = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('plan:join', planId);
    });
    socket.on('plan:message', (msg: PlanMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    socket.on('plan:member_updated', () => {
      getPlan(planId).then(setPlan).catch(() => {});
    });

    return () => {
      socket.emit('plan:leave', planId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isApproved, planId]);

  async function onRequestJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      setPlan(await requestJoinPlan(planId, note.trim() || undefined));
      setNote('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onLeave() {
    setError('');
    setBusy(true);
    try {
      setPlan(await leavePlan(planId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onReview(userId: string, status: 'APPROVED' | 'REJECTED') {
    setError('');
    setBusy(true);
    try {
      setPlan(await reviewJoinRequest(planId, userId, status));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onCancelPlan() {
    if (!window.confirm('Cancel this plan for all attendees?')) return;
    setError('');
    setBusy(true);
    try {
      setPlan(await cancelPlan(planId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');
    try {
      const sent = await sendPlanMessage(planId, text);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!plan) {
    return (
      <div className="card" style={{ alignItems: 'center', padding: 36 }}>
        {error ? <p className="error">{error}</p> : <div className="spinner" />}
      </div>
    );
  }

  const dt = new Date(plan.startsAt).toLocaleString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="chip static">{plan.interest.name}</span>
          <span className="muted" style={{ fontWeight: 700 }}>
            {plan.spotsFilled}/{plan.capacity} spots filled
          </span>
        </div>
        <h1>{plan.title}</h1>
        <p className="muted">
          🗓️ {dt}
          <br />📍 {plan.venue} ({plan.city.name})
        </p>
        {plan.description && <p style={{ margin: 0 }}>{plan.description}</p>}

        <div>
          <h2>Who&apos;s going ({plan.attendees.length})</h2>
          <div className="chips" style={{ marginTop: 8 }}>
            {plan.attendees.map((a) => (
              <Link
                key={a.user.id}
                href={`/members/${a.user.id}`}
                className={`chip ${a.role === 'HOST' ? 'selected' : ''}`}
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px 4px 4px',
                }}
              >
                {a.user.photos[0] && (
                  <img
                    src={a.user.photos[0].url}
                    alt={a.user.name}
                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <span>
                  {a.user.name}
                  {a.user.age ? `, ${a.user.age}` : ''} {a.role === 'HOST' ? '👑 Host' : ''}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {/* Viewer action bar */}
        {plan.status === 'CANCELLED' ? (
          <div className="dev-banner">This plan has been cancelled by the host.</div>
        ) : isHost ? (
          <button type="button" className="btn danger" disabled={busy} onClick={onCancelPlan}>
            Cancel plan
          </button>
        ) : !plan.myMembership ? (
          <form onSubmit={onRequestJoin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              className="input"
              placeholder="Add a short intro note for the host (optional)"
              maxLength={240}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button type="submit" className="btn yellow" disabled={busy || plan.spotsLeft === 0}>
              {plan.spotsLeft === 0 ? 'Plan is full' : 'Request to join'}
            </button>
          </form>
        ) : plan.myMembership.status === 'PENDING' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="dev-banner">⏳ Your request is waiting for {plan.host.name}&apos;s approval.</div>
            <button type="button" className="btn ghost" disabled={busy} onClick={onLeave}>
              Withdraw request
            </button>
          </div>
        ) : plan.myMembership.status === 'APPROVED' ? (
          <button type="button" className="btn ghost" disabled={busy} onClick={onLeave}>
            Leave plan
          </button>
        ) : (
          <div className="dev-banner">Your join request was declined by the host.</div>
        )}
      </div>

      {/* Host-only approval queue */}
      {isHost && plan.pendingRequests.length > 0 && (
        <div className="card">
          <h2>Pending join requests ({plan.pendingRequests.length})</h2>
          {plan.pendingRequests.map((req) => (
            <div
              key={req.id}
              style={{
                border: '2px solid var(--line)',
                borderRadius: 14,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Link href={`/members/${req.user.id}`} style={{ fontWeight: 700, color: 'inherit' }}>
                  {req.user.name}
                  {req.user.age ? `, ${req.user.age}` : ''}
                </Link>
                <span className="muted">{req.user.gender}</span>
              </div>
              {req.note && <p style={{ margin: 0, fontSize: 14 }}>&ldquo;{req.note}&rdquo;</p>}
              <div className="row">
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: 10 }}
                  disabled={busy}
                  onClick={() => onReview(req.user.id, 'REJECTED')}
                >
                  Decline
                </button>
                <button
                  type="button"
                  className="btn yellow"
                  style={{ padding: 10 }}
                  disabled={busy || plan.spotsLeft === 0}
                  onClick={() => onReview(req.user.id, 'APPROVED')}
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Group Chat (unlocked once APPROVED) */}
      {isApproved && (
        <div className="card">
          <h2>💬 Plan Group Chat</h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 280,
              overflowY: 'auto',
              padding: '4px 0',
            }}
          >
            {messages.length === 0 ? (
              <p className="muted">No messages yet. Say hi to everyone going!</p>
            ) : (
              messages.map((m) => {
                const mine = m.sender.id === viewer.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: mine ? 'flex-end' : 'flex-start',
                      background: mine ? 'var(--yellow)' : 'var(--yellow-soft)',
                      padding: '10px 14px',
                      borderRadius: 16,
                      maxWidth: '82%',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{m.sender.name}</div>
                    <div style={{ fontSize: 14 }}>{m.body}</div>
                  </div>
                );
              })
            )}
          </div>
          <form className="row" onSubmit={onSendMessage}>
            <input
              className="input"
              placeholder="Message attendees…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              type="submit"
              className="btn"
              style={{ width: 'auto', padding: '0 22px' }}
              disabled={!chatInput.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
