'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getMatchConversation, sendDirectMessage } from './discovery.api';
import { errorMessage } from '@/lib/api';
import { session } from '@/lib/session';
import type { DirectMessage, Profile, PublicProfile } from '@/types/api';

interface Props {
  matchId: string;
  viewer: Profile;
}

export function DirectChatView({ matchId, viewer }: Props) {
  const [peer, setPeer] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    getMatchConversation(matchId)
      .then((res) => {
        setPeer(res.match.peer);
        setMessages(res.messages);
      })
      .catch((err) => setError(errorMessage(err)));

    const token = session.getToken();
    if (!token) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';
    const socket = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('match:join', matchId);
    });
    socket.on('match:message', (msg: DirectMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    return () => {
      socket.emit('match:leave', matchId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [matchId]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    try {
      const sent = await sendDirectMessage(matchId, text);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/discover" className="btn link" style={{ padding: 0 }}>
          ← Matches
        </Link>
        {peer && (
          <Link href={`/members/${peer.id}`} style={{ fontWeight: 800, color: 'inherit', textDecoration: 'none' }}>
            {peer.name}
            {peer.age ? `, ${peer.age}` : ''}
          </Link>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 240,
          maxHeight: 360,
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {messages.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', margin: 'auto' }}>
            Either of you can make the first move! Say hi 👋
          </p>
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

      <form className="row" onSubmit={onSend}>
        <input
          className="input"
          placeholder={`Message ${peer?.name ?? ''}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn" style={{ width: 'auto', padding: '0 22px' }} disabled={!input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
