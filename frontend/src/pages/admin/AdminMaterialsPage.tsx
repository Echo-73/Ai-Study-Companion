import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { useAdmin } from '../../components/Layout/AdminLayout';
import AdminPagination from '../../components/Admin/AdminPagination';
import {
  FileText,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck
} from 'lucide-react';

interface MaterialItem {
  id: string;
  title: string;
  fileType: string;
  status: 'READY' | 'PROCESSING' | 'QUEUED' | 'FAILED';
  pageCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
  };
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

interface MaterialsResponse {
  materials: MaterialItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  stats: {
    totalMaterials: number;
    processed: number;
    processing: number;
    queued: number;
    failed: number;
  };
}

export const AdminMaterialsPage: React.FC = () => {
  const { refreshTrigger, setIsRefreshing } = useAdmin();
  const [data, setData] = useState<MaterialsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchMaterials = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/admin/materials', {
        params: {
          page,
          pageSize,
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      setData(res.data.data);
    } catch (err: any) {
      console.error('Failed to load admin materials:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch materials');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, pageSize, search, statusFilter, setIsRefreshing]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const formatSafeDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return <span className="badge badge-ready">READY</span>;
      case 'PROCESSING':
        return <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }}>PROCESSING</span>;
      case 'QUEUED':
        return <span className="badge badge-queued">QUEUED</span>;
      case 'FAILED':
        return <span className="badge badge-failed">FAILED</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top statistics summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Uploaded</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
            {data?.stats?.totalMaterials ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Processed (READY)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
            {data?.stats?.processed ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Pipeline</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#06b6d4', marginTop: '0.25rem' }}>
            {data?.stats?.processing ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Failed Processing</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: (data?.stats?.failed ?? 0) > 0 ? '#f87171' : 'var(--text-muted)', marginTop: '0.25rem' }}>
            {data?.stats?.failed ?? 0}
          </div>
        </div>
      </div>

      {/* Failure banner if any failed materials exist */}
      {(data?.stats?.failed ?? 0) > 0 && (
        <div
          style={{
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
          }}
        >
          <AlertTriangle size={18} />
          <span>
            Attention: <strong>{data?.stats?.failed}</strong> material(s) failed during PDF text extraction or embedding generation. Filter by "FAILED" to review error details.
          </span>
        </div>
      )}

      {/* Search & Status Filter Header */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search by material title or project..."
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
            <option value="ALL" style={{ background: '#121826' }}>All Statuses</option>
            <option value="READY" style={{ background: '#121826' }}>Ready</option>
            <option value="PROCESSING" style={{ background: '#121826' }}>Processing</option>
            <option value="QUEUED" style={{ background: '#121826' }}>Queued</option>
            <option value="FAILED" style={{ background: '#121826' }}>Failed</option>
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading material records...
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
            {error}
          </div>
        ) : !data || data.materials.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No material processing records found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Material</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Project</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Owner</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pages</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Uploaded</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Processed / Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.materials.map((m) => (
                  <tr
                    key={m.id}
                    style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{m.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {m.fileType || 'PDF'}
                      </div>
                      {m.errorMessage && (
                        <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          Error: {m.errorMessage}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{m.project.name}</div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{m.owner.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.owner.email}</div>
                    </td>

                    <td style={{ padding: '1rem 1.5rem' }}>
                      {getStatusBadge(m.status)}
                    </td>

                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                      {m.pageCount > 0 ? m.pageCount : '—'}
                    </td>

                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatSafeDate(m.createdAt)}
                    </td>

                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatSafeDate(m.updatedAt)}
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

export default AdminMaterialsPage;
