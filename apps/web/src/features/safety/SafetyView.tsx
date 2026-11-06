'use client';

import { useEffect, useState } from 'react';
import { listBlockedUsers, listReports, resolveReport, unblockUser } from './safety.api';
import { errorMessage } from '@/lib/api';
import type { PublicProfile, ReportItem } from '@/types/api';

export function SafetyView() {
  const [blocks, setBlocks] = useState<Array<{ blockedAt: string; user: PublicProfile }>>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listBlockedUsers(), listReports()])
      .then(([b, r]) => {
        setBlocks(b);
        setReports(r);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  async function onUnblock(userId: string) {
    setBlocks(await unblockUser(userId));
  }

  async function onResolve(reportId: string) {
    const updated = await resolveReport(reportId, 'RESOLVED');
    setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <h2>🛡️ Blocked Members ({blocks.length})</h2>
        {blocks.length === 0 ? (
          <p className="muted">You haven&apos;t blocked anyone.</p>
        ) : (
          blocks.map((b) => (
            <div key={b.user.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{b.user.name}</span>
              <button type="button" className="chip" onClick={() => onUnblock(b.user.id)}>
                Unblock
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>⚖️ Moderation Queue ({reports.length})</h2>
        {error && <p className="error">{error}</p>}
        {reports.length === 0 ? (
          <p className="muted">No safety reports submitted.</p>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              style={{
                border: '2px solid var(--line)',
                borderRadius: 14,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>
                  {r.targetUser.name} · {r.reason}
                </strong>
                <span className={`chip ${r.status === 'RESOLVED' ? 'static' : 'selected'}`}>{r.status}</span>
              </div>
              {r.details && <p style={{ margin: 0, fontSize: 14 }}>{r.details}</p>}
              <p className="muted">Reported by {r.reporter.name}</p>
              {r.status === 'OPEN' && (
                <button type="button" className="btn yellow" onClick={() => onResolve(r.id)}>
                  Mark resolved
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
