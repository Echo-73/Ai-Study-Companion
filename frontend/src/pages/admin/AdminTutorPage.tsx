import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { useAdmin } from '../../components/Layout/AdminLayout';
import {
  MessageSquare,
  Users,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface TutorActivityItem {
  id: string;
  conversationId: string;
  timestamp: string;
  isSupported: boolean;
  hasCitations: boolean;
  citationsCount: number;
  project: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TutorStatsResponse {
  stats: {
    totalInteractions: number;
    uniqueUsers: number;
    questionsToday: number;
    questionsWeek: number;
    averageInteractionsPerUser: number;
  };
  recentActivity: TutorActivityItem[];
}

export const AdminTutorPage: React.FC = () => {
  const { refreshTrigger, setIsRefreshing } = useAdmin();
  const [data, setData] = useState<TutorStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTutorStats = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/admin/tutor');
      setData(res.data.data);
    } catch (err: any) {
      console.error('Failed to load tutor stats:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch tutor statistics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setIsRefreshing]);

  useEffect(() => {
    fetchTutorStats();
  }, [fetchTutorStats, refreshTrigger]);

  const formatSafeDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top statistics summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Interactions</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
            {data?.stats?.totalInteractions ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unique Students</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6366f1', marginTop: '0.25rem' }}>
            {data?.stats?.uniqueUsers ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last 24 Hours</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
            {data?.stats?.questionsToday ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last 7 Days</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#06b6d4', marginTop: '0.25rem' }}>
            {data?.stats?.questionsWeek ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg / Student</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
            {data?.stats?.averageInteractionsPerUser ?? 0}
          </div>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div
        style={{
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          color: '#c7d2fe',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
        }}
      >
        <ShieldCheck size={20} style={{ color: '#818cf8', flexShrink: 0 }} />
        <div>
          <strong>Privacy-Preserving AI Observability:</strong> In accordance with student privacy protection standards, this dashboard monitors query frequencies, model grounding fidelity, and citations metadata without exposing personal conversational transcripts.
        </div>
      </div>

      {/* Recent Tutor Activity Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} style={{ color: '#f59e0b' }} /> Recent Tutor Inquiries & Grounding
          </h3>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading AI tutor metrics...
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
            {error}
          </div>
        ) : !data || data.recentActivity.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tutor interactions recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Student</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Project</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Grounding Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Citations</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Session Reference</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.map((act) => (
                  <tr
                    key={act.id}
                    style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatSafeDate(act.timestamp)}
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{act.user.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{act.user.email}</div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{act.project.name}</div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      {act.isSupported ? (
                        <span className="badge badge-ready">GROUNDED IN MATERIAL</span>
                      ) : (
                        <span className="badge badge-queued">GENERAL CONCEPT</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                      {act.citationsCount > 0 ? (
                        <span style={{ color: '#34d399' }}>{act.citationsCount} source chunk(s)</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>None</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                      {act.conversationId.slice(0, 13)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTutorPage;
