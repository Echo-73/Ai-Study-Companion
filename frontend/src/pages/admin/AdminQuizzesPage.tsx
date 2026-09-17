import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { useAdmin } from '../../components/Layout/AdminLayout';
import AdminPagination from '../../components/Admin/AdminPagination';
import {
  BrainCircuit,
  Search,
  Filter,
  Award,
  CheckCircle2,
  Clock3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface QuizItem {
  id: string;
  title: string;
  score: number | null;
  scorePercentage: number | null;
  questionCount: number;
  completedAt: string | null;
  createdAt: string;
  status: 'COMPLETED' | 'IN_PROGRESS';
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

interface QuizzesResponse {
  quizzes: QuizItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  stats: {
    totalGenerated: number;
    completedQuizzes: number;
    averageScore: number | null;
    highestScore: number | null;
    lowestScore: number | null;
  };
}

export const AdminQuizzesPage: React.FC = () => {
  const { refreshTrigger, setIsRefreshing } = useAdmin();
  const [data, setData] = useState<QuizzesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchQuizzes = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/admin/quizzes', {
        params: {
          page,
          pageSize,
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      setData(res.data.data);
    } catch (err: any) {
      console.error('Failed to load admin quizzes:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch quizzes');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, pageSize, search, statusFilter, setIsRefreshing]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const formatSafeDate = (isoStr?: string | null) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top statistics summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Generated Quizzes</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
            {data?.stats?.totalGenerated ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
            {data?.stats?.completedQuizzes ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Score</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.25rem' }}>
            {data?.stats?.averageScore !== null && data?.stats?.averageScore !== undefined ? `${data.stats.averageScore}%` : '—'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highest Score</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
            {data?.stats?.highestScore !== null && data?.stats?.highestScore !== undefined ? `${data.stats.highestScore}%` : '—'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lowest Score</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
            {data?.stats?.lowestScore !== null && data?.stats?.lowestScore !== undefined ? `${data.stats.lowestScore}%` : '—'}
          </div>
        </div>
      </div>

      {/* Search & Filter Header */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search by quiz title, project, or student..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-glass"
              style={{ paddingLeft: '2.75rem', fontSize: '0.9rem' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-glass"
            style={{ width: 'auto', padding: '0.6rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <option value="ALL" style={{ background: '#121826' }}>All Quizzes</option>
            <option value="COMPLETED" style={{ background: '#121826' }}>Completed</option>
            <option value="IN_PROGRESS" style={{ background: '#121826' }}>In Progress / Incomplete</option>
          </select>
        </div>
      </div>

      {/* Quizzes Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading quiz assessments...
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
            {error}
          </div>
        ) : !data || data.quizzes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No quiz records found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quiz</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Project</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Student</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Score</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Questions</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Completed At</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Generated</th>
                </tr>
              </thead>
              <tbody>
                {data.quizzes.map((q) => (
                  <tr
                    key={q.id}
                    style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{q.title || 'Adaptive Quiz'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                        ID: {q.id.slice(0, 8)}...
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{q.project.name}</div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{q.user.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.user.email}</div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      {q.scorePercentage !== null ? (
                        <span
                          style={{
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            background: q.scorePercentage >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: q.scorePercentage >= 70 ? '#34d399' : '#fbbf24',
                            border: `1px solid ${q.scorePercentage >= 70 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          }}
                        >
                          {q.scorePercentage}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{q.questionCount}</td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      {q.status === 'COMPLETED' ? (
                        <span className="badge badge-ready">COMPLETED</span>
                      ) : (
                        <span className="badge badge-queued">IN PROGRESS</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatSafeDate(q.completedAt)}
                    </td>

                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatSafeDate(q.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <AdminPagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            totalRecords={data.pagination.totalRecords}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>
    </div>
  );
};

export default AdminQuizzesPage;
