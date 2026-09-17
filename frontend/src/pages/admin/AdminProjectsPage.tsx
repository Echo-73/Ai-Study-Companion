import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { useAdmin } from '../../components/Layout/AdminLayout';
import AdminPagination from '../../components/Admin/AdminPagination';
import {
  Folder,
  Search,
  FileText,
  BrainCircuit,
  MessageSquare,
  Award,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  learningGoal: string;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  materialsCount: number;
  quizzesCount: number;
  completedQuizzesCount: number;
  averageScore: number | null;
  tutorInteractionsCount: number;
}

interface ProjectsResponse {
  projects: ProjectItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  stats: {
    totalProjects: number;
    projectsWithMaterials: number;
    projectsWithQuizzes: number;
    projectsWithTutor: number;
  };
}

export const AdminProjectsPage: React.FC = () => {
  const { refreshTrigger, setIsRefreshing } = useAdmin();
  const [data, setData] = useState<ProjectsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/admin/projects', {
        params: {
          page,
          pageSize,
          search: search || undefined,
        },
      });
      setData(res.data.data);
    } catch (err: any) {
      console.error('Failed to load admin projects:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, pageSize, search, setIsRefreshing]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const formatSafeDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top statistics summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Projects</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
            {data?.stats?.totalProjects ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>With Materials</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#06b6d4', marginTop: '0.25rem' }}>
            {data?.stats?.projectsWithMaterials ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>With Quizzes</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
            {data?.stats?.projectsWithQuizzes ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>With Tutor Sessions</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
            {data?.stats?.projectsWithTutor ?? 0}
          </div>
        </div>
      </div>

      {/* Search Header */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: '500px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search projects by name, learning goal, or owner..."
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
      </div>

      {/* Projects Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading projects...
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
            {error}
          </div>
        ) : !data || data.projects.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No projects found matching your query.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Project</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Owner</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Learning Goal</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Materials</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quizzes</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Score</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tutor Msgs</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                        ID: {p.id.slice(0, 8)}...
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{p.owner.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.owner.email}</div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem', maxWidth: '280px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }} title={p.learningGoal}>
                        {p.learningGoal || 'None'}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{p.materialsCount}</td>
                    
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{p.quizzesCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {p.completedQuizzesCount} completed
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      {p.averageScore !== null ? (
                        <span style={{ fontWeight: 700, color: p.averageScore >= 70 ? '#10b981' : '#f59e0b' }}>
                          {p.averageScore}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{p.tutorInteractionsCount}</td>

                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatSafeDate(p.createdAt)}
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

export default AdminProjectsPage;
