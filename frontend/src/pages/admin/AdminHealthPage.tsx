import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { useAdmin } from '../../components/Layout/AdminLayout';
import {
  HeartPulse,
  Server,
  Database,
  Sparkles,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface HealthData {
  overall: 'operational' | 'degraded';
  timestamp: string;
  components: {
    backend: {
      status: string;
      uptimeSeconds: number;
      memoryHeapUsedMB: number;
      nodeVersion: string;
      timestamp: string;
    };
    database: {
      status: string;
      latencyMs: number;
    };
    aiService: {
      status: string;
      configured: boolean;
      model: string;
      message: string;
    };
    backgroundWorker: {
      status: string;
      queue: {
        queued: number;
        processing: number;
        failed: number;
        completed: number;
      };
    };
  };
}

export const AdminHealthPage: React.FC = () => {
  const { refreshTrigger, setIsRefreshing } = useAdmin();
  const [data, setData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());

  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/admin/health');
      setData(res.data.data);
      setLastCheckTime(new Date());
    } catch (err: any) {
      console.error('Failed to run health checks:', err);
      setError(err.response?.data?.error || err.message || 'Failed to connect to system health service');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setIsRefreshing]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth, refreshTrigger]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const getStatusIcon = (status: string) => {
    if (status === 'healthy' || status === 'operational') {
      return <CheckCircle2 size={20} style={{ color: '#10b981' }} />;
    }
    if (status === 'warning' || status === 'degraded') {
      return <AlertTriangle size={20} style={{ color: '#f59e0b' }} />;
    }
    return <XCircle size={20} style={{ color: '#f87171' }} />;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Overall Health Status Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          borderLeft: `5px solid ${data?.overall === 'operational' ? '#10b981' : '#f59e0b'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              padding: '1rem',
              borderRadius: '14px',
              background: data?.overall === 'operational' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: data?.overall === 'operational' ? '#10b981' : '#f59e0b',
            }}
          >
            <HeartPulse size={36} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                System Status: {data?.overall ? data.overall.toUpperCase() : 'CHECKING...'}
              </h2>
              <span
                className="badge"
                style={{
                  background: data?.overall === 'operational' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: data?.overall === 'operational' ? '#34d399' : '#fbbf24',
                  border: `1px solid ${data?.overall === 'operational' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                }}
              >
                ● LIVE
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Real-time connectivity, latency, and resource metrics checked at {lastCheckTime.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <button
          onClick={() => { setIsLoading(true); fetchHealth(); }}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} /> Re-run Diagnostics
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Executing diagnostic queries on backend, database, AI model, and job queue...
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 0.5rem' }} />
          <p>{error}</p>
        </div>
      ) : !data ? null : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* 1. Backend Server Component */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', borderRadius: '10px' }}>
                  <Server size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Backend API Service</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Express & Node.js Runtime</span>
                </div>
              </div>
              {getStatusIcon(data.components.backend.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span style={{ fontWeight: 600, color: '#34d399' }}>OPERATIONAL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Process Uptime</span>
                <span style={{ fontWeight: 600 }}>{formatUptime(data.components.backend.uptimeSeconds)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Heap Memory Used</span>
                <span style={{ fontWeight: 600 }}>{data.components.backend.memoryHeapUsedMB} MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Node.js Version</span>
                <span style={{ fontFamily: 'monospace' }}>{data.components.backend.nodeVersion}</span>
              </div>
            </div>
          </div>

          {/* 2. Database Component */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '10px' }}>
                  <Database size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>PostgreSQL Database</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Prisma ORM Connection</span>
                </div>
              </div>
              {getStatusIcon(data.components.database.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Connection</span>
                <span style={{ fontWeight: 600, color: data.components.database.status === 'healthy' ? '#34d399' : '#f87171' }}>
                  {data.components.database.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Round-Trip Ping</span>
                <span style={{ fontWeight: 600, color: data.components.database.latencyMs < 50 ? '#34d399' : '#fbbf24' }}>
                  {data.components.database.latencyMs} ms
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Verification Query</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-dim)' }}>SELECT 1</span>
              </div>
            </div>
          </div>

          {/* 3. AI / Gemini Component */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', borderRadius: '10px' }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>AI / Gemini Integration</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Google Generative AI</span>
                </div>
              </div>
              {getStatusIcon(data.components.aiService.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)' }}>API Key Status</span>
                <span style={{ fontWeight: 600, color: data.components.aiService.configured ? '#34d399' : '#fbbf24' }}>
                  {data.components.aiService.configured ? 'CONFIGURED & READY' : 'NOT CONFIGURED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Active Model</span>
                <span style={{ fontWeight: 600 }}>{data.components.aiService.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status Message</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{data.components.aiService.message}</span>
              </div>
            </div>
          </div>

          {/* 4. Background Worker Component */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderRadius: '10px' }}>
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Background Job Worker</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Material & PDF Pipeline</span>
                </div>
              </div>
              {getStatusIcon(data.components.backgroundWorker.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Worker Pipeline</span>
                <span style={{ fontWeight: 600, color: data.components.backgroundWorker.status === 'healthy' ? '#34d399' : '#f87171' }}>
                  {data.components.backgroundWorker.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Active Processing</span>
                <span style={{ fontWeight: 600, color: '#06b6d4' }}>{data.components.backgroundWorker.queue.processing}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pending in Queue</span>
                <span style={{ fontWeight: 600, color: '#fbbf24' }}>{data.components.backgroundWorker.queue.queued}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Failed Jobs</span>
                <span style={{ fontWeight: 600, color: data.components.backgroundWorker.queue.failed > 0 ? '#f87171' : 'var(--text-dim)' }}>
                  {data.components.backgroundWorker.queue.failed}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHealthPage;
