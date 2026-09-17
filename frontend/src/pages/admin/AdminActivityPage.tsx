import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { useAdmin } from '../../components/Layout/AdminLayout';
import AdminPagination from '../../components/Admin/AdminPagination';
import {
  Activity,
  Search,
  Filter,
  PenTool,
  MessageCircle,
  TrendingUp,
  BookOpen,
  FileText,
  AlertCircle,
  FolderPlus,
  Clock
} from 'lucide-react';

interface ActivityItem {
  id: string;
  eventType: string;
  metadata: any;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  project: {
    id: string;
    name: string;
  };
}

interface ActivityResponse {
  events: ActivityItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

export const AdminActivityPage: React.FC = () => {
  const { refreshTrigger, setIsRefreshing } = useAdmin();
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchActivity = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/admin/activity', {
        params: {
          page,
          pageSize,
          search: search || undefined,
          eventType: eventTypeFilter !== 'ALL' ? eventTypeFilter : undefined,
        },
      });
      setData(res.data.data);
    } catch (err: any) {
      console.error('Failed to load activity logs:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch activity logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, pageSize, search, eventTypeFilter, setIsRefreshing]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const formatSafeDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventBadge = (type: string) => {
    let color = '#6366f1';
    let icon = <Activity size={14} />;
    let label = type.replace(/_/g, ' ');

    if (type.includes('ASSESSMENT') || type.includes('QUIZ_COMPLETED')) {
      color = '#10b981';
      icon = <PenTool size={14} />;
      label = 'Quiz Completed';
    } else if (type.includes('QUIZ_STARTED')) {
      color = '#06b6d4';
      icon = <PenTool size={14} />;
      label = 'Quiz Started';
    } else if (type.includes('TUTOR')) {
      color = '#f59e0b';
      icon = <MessageCircle size={14} />;
      label = 'Tutor Question';
    } else if (type.includes('MATERIAL')) {
      color = '#ec4899';
      icon = <FileText size={14} />;
      label = type === 'MATERIAL_UPLOADED' ? 'Material Uploaded' : 'Material Processed';
    } else if (type.includes('MASTERY')) {
      color = '#8b5cf6';
      icon = <TrendingUp size={14} />;
      label = 'Mastery Updated';
    } else if (type.includes('PROJECT')) {
      color = '#3b82f6';
      icon = <FolderPlus size={14} />;
      label = 'Project Created';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.65rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          background: `${color}18`,
          color: color,
          border: `1px solid ${color}35`,
        }}
      >
        {icon}
        {label}
      </span>
    );
  };

  const formatMetadata = (meta: any) => {
    if (!meta || typeof meta !== 'object') return '—';
    const parts: string[] = [];

    if (typeof meta.overallScore === 'number') {
      parts.push(`Score: ${Math.round(meta.overallScore * 100)}%`);
    } else if (typeof meta.score === 'number') {
      parts.push(`Score: ${Math.round(meta.score * 100)}%`);
    }
    if (meta.title) parts.push(`"${meta.title}"`);
    if (meta.questionCount) parts.push(`${meta.questionCount} questions`);
    if (meta.status) parts.push(`Status: ${meta.status}`);
    if (meta.isSupported !== undefined) parts.push(meta.isSupported ? 'Grounded' : 'Ungrounded');
    if (meta.conceptName) parts.push(`Concept: ${meta.conceptName}`);

    if (parts.length > 0) {
      return parts.join(' • ');
    }

    return Object.entries(meta)
      .filter(([k]) => !['quizId', 'conversationId', 'materialId', 'conceptId'].includes(k))
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' • ') || 'Event logged';
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Search & EventType Filter Header */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search by student name, email, or project..."
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
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Event Type:</span>
          <select
            value={eventTypeFilter}
            onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}
            className="input-glass"
            style={{ width: 'auto', padding: '0.6rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <option value="ALL" style={{ background: '#121826' }}>All Events</option>
            <option value="ASSESSMENT_COMPLETED" style={{ background: '#121826' }}>Quiz Completed</option>
            <option value="QUIZ_STARTED" style={{ background: '#121826' }}>Quiz Started</option>
            <option value="TUTOR_INTERACTION" style={{ background: '#121826' }}>Tutor Interaction</option>
            <option value="MATERIAL_UPLOADED" style={{ background: '#121826' }}>Material Uploaded</option>
            <option value="MASTERY_UPDATED" style={{ background: '#121826' }}>Mastery Updated</option>
            <option value="PROJECT_CREATED" style={{ background: '#121826' }}>Project Created</option>
          </select>
        </div>
      </div>

      {/* Activity Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading activity audit stream...
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
            {error}
          </div>
        ) : !data || data.events.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No activity events found matching your criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Event</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Student</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Project</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Details / Metadata</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((evt) => (
                  <tr
                    key={evt.id}
                    style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {formatSafeDate(evt.timestamp)}
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      {getEventBadge(evt.eventType)}
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{evt.user.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{evt.user.email}</div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{evt.project.name}</div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatMetadata(evt.metadata)}
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

export default AdminActivityPage;
