import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { useAdmin } from '../../components/Layout/AdminLayout';
import AdminPagination from '../../components/Admin/AdminPagination';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  Shield,
  ShieldAlert,
  AlertCircle,
  Clock,
  Sparkles,
  Check
} from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  lastActivity: string;
  projectsCount: number;
  quizzesCount: number;
  activityCount: number;
  status: 'ACTIVE' | 'INACTIVE';
}

interface UsersResponse {
  users: UserItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  stats: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    students: number;
    admins: number;
  };
}

export const AdminUsersPage: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { refreshTrigger, setIsRefreshing } = useAdmin();

  const [data, setData] = useState<UsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & Pagination state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/admin/users', {
        params: {
          page,
          pageSize,
          search: search || undefined,
          role: roleFilter !== 'ALL' ? roleFilter : undefined,
        },
      });
      setData(res.data.data);
    } catch (err: any) {
      console.error('Failed to load admin users:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, pageSize, search, roleFilter, setIsRefreshing]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleRoleToggle = async (targetUser: UserItem) => {
    const newRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const actionLabel = newRole === 'ADMIN' ? 'Promote' : 'Demote';

    if (!window.confirm(`Are you sure you want to ${actionLabel} "${targetUser.name}" (${targetUser.email}) to ${newRole}?`)) {
      return;
    }

    try {
      setActionInProgressId(targetUser.id);
      setActionMessage(null);
      const res = await apiClient.patch(`/admin/users/${targetUser.id}/role`, {
        role: newRole,
      });

      setActionMessage({
        type: 'success',
        text: res.data.message || `Successfully updated ${targetUser.name} to ${newRole}`,
      });
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to update user role';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setActionInProgressId(null);
    }
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
            {data?.stats?.totalUsers ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New (30 Days)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6366f1', marginTop: '0.25rem' }}>
            {data?.stats?.newUsers ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Learners</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
            {data?.stats?.activeUsers ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Students</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a5b4fc', marginTop: '0.25rem' }}>
            {data?.stats?.students ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Administrators</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
            {data?.stats?.admins ?? 0}
          </div>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          style={{
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: actionMessage.type === 'success' ? '#34d399' : '#f87171',
          }}
        >
          {actionMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{actionMessage.text}</span>
        </div>
      )}

      {/* Search & Filter Header */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search user by name or email..."
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
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="input-glass"
            style={{ width: 'auto', padding: '0.6rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <option value="ALL" style={{ background: '#121826' }}>All Roles</option>
            <option value="USER" style={{ background: '#121826' }}>Students (USER)</option>
            <option value="ADMIN" style={{ background: '#121826' }}>Admins (ADMIN)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading registered users...
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
            {error}
          </div>
        ) : !data || data.users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No users found matching your criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>User</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Projects</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quizzes</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Last Activity</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => {
                  const isCurrentAccount = currentAdmin?.email === u.email;
                  const isPending = actionInProgressId === u.id;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border-glass)',
                        transition: 'background 0.2s',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {u.name} {isCurrentAccount && <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>(You)</span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>

                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: '9999px',
                            background: u.role === 'ADMIN' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: u.role === 'ADMIN' ? '#f59e0b' : '#a5b4fc',
                            border: `1px solid ${u.role === 'ADMIN' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                          }}
                        >
                          {u.role === 'ADMIN' ? <Shield size={12} /> : <UserCheck size={12} />}
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{u.projectsCount}</td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{u.quizzesCount}</td>

                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {formatSafeDate(u.lastActivity)}
                      </td>

                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span
                          className={`badge ${u.status === 'ACTIVE' ? 'badge-ready' : 'badge-queued'}`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleRoleToggle(u)}
                          disabled={isPending || (isCurrentAccount && u.role === 'ADMIN')}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.4rem 0.85rem',
                            fontSize: '0.8rem',
                            opacity: isCurrentAccount && u.role === 'ADMIN' ? 0.4 : 1,
                            cursor: isCurrentAccount && u.role === 'ADMIN' ? 'not-allowed' : 'pointer',
                          }}
                          title={isCurrentAccount && u.role === 'ADMIN' ? 'Admins cannot demote their own account' : undefined}
                        >
                          {isPending ? 'Updating...' : u.role === 'ADMIN' ? 'Demote to USER' : 'Promote to ADMIN'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

export default AdminUsersPage;
