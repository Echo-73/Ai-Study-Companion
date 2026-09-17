import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useAdmin } from '../components/Layout/AdminLayout';
import { Link } from 'react-router-dom';
import {
  Users,
  Folder,
  FileText,
  BrainCircuit,
  MessageSquare,
  Award,
  Activity,
  HeartPulse,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
  Database,
  CheckCircle2,
  XCircle,
  Clock3
} from 'lucide-react';

interface OverviewData {
  totalUsers: number;
  totalProjects: number;
  totalMaterials: number;
  completedQuizzes: number;
  totalQuizzes: number;
  tutorInteractions: number;
  averageQuizScore: number | null;
  materialBreakdown: {
    READY: number;
    PROCESSING: number;
    QUEUED: number;
    FAILED: number;
  };
  recentEvents: Array<{
    id: string;
    eventType: string;
    metadata: any;
    timestamp: string;
    userName: string;
    userEmail: string;
    projectName: string;
    projectId: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    spacesCount: number;
    activityCount: number;
  }>;
  recentProjects: Array<{
    id: string;
    name: string;
    learningGoal: string;
    createdAt: string;
    ownerName: string;
    ownerEmail: string;
    materialsCount: number;
    quizzesCount: number;
  }>;
}

interface ChartData {
  userGrowth: Array<{ date: string; count: number; cumulative: number }>;
  quizPerformance: Array<{ date: string; count: number; averageScore: number }>;
  tutorActivity: Array<{ date: string; count: number }>;
  materialDistribution: Array<{ status: string; count: number }>;
}

export const AdminDashboardPage: React.FC = () => {
  const { refreshTrigger, setIsRefreshing } = useAdmin();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setError(null);
      const [overviewRes, chartsRes, healthRes] = await Promise.all([
        apiClient.get('/admin/overview'),
        apiClient.get('/admin/charts'),
        apiClient.get('/admin/health'),
      ]);
      setOverview(overviewRes.data.data);
      setCharts(chartsRes.data.data);
      setHealthStatus(healthRes.data.data);
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
      setError(err.response?.data?.error || err.message || 'Failed to connect to admin services');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setIsRefreshing]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview, refreshTrigger]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-panel animate-pulse-glow" style={{ height: '110px' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          <div className="glass-panel animate-pulse-glow" style={{ height: '280px' }} />
          <div className="glass-panel animate-pulse-glow" style={{ height: '280px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
        <AlertCircle size={40} style={{ color: '#f87171', margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f87171', marginBottom: '0.5rem' }}>
          Admin Dashboard Error
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
        <button onClick={() => { setIsLoading(true); fetchOverview(); }} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const formatActivityName = (type: string) => {
    switch (type) {
      case 'ASSESSMENT_COMPLETED': return 'Quiz Completed';
      case 'QUIZ_STARTED': return 'Quiz Started';
      case 'TUTOR_INTERACTION': return 'Tutor Query';
      case 'MATERIAL_UPLOADED': return 'Material Uploaded';
      case 'MATERIAL_PROCESSING_COMPLETED': return 'Material Processed';
      case 'MATERIAL_PROCESSING_STARTED': return 'Processing Started';
      case 'MASTERY_UPDATED': return 'Mastery Updated';
      case 'PROJECT_CREATED': return 'Project Created';
      default: return type.replace(/_/g, ' ');
    }
  };

  const formatSafeDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Top metric card component
  const MetricCard = ({
    title,
    value,
    subtitle,
    icon,
    color,
    to,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    to: string;
  }) => (
    <Link
      to={to}
      className="glass-panel"
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: `4px solid ${color}`,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'var(--transition)',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = color;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--border-glass)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        <div style={{ padding: '0.5rem', background: `${color}18`, color: color, borderRadius: '10px' }}>
          {icon}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1, color: '#f8fafc' }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            {subtitle}
          </div>
        )}
      </div>
    </Link>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* 6 Top-Level Metric Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <MetricCard
          title="Total Users"
          value={overview?.totalUsers ?? 0}
          subtitle="Registered accounts"
          icon={<Users size={22} />}
          color="#6366f1"
          to="/admin/users"
        />
        <MetricCard
          title="Total Projects"
          value={overview?.totalProjects ?? 0}
          subtitle="Study workspaces"
          icon={<Folder size={22} />}
          color="#ec4899"
          to="/admin/projects"
        />
        <MetricCard
          title="Materials"
          value={overview?.totalMaterials ?? 0}
          subtitle={`${overview?.materialBreakdown.READY ?? 0} processed`}
          icon={<FileText size={22} />}
          color="#06b6d4"
          to="/admin/materials"
        />
        <MetricCard
          title="Completed Quizzes"
          value={overview?.completedQuizzes ?? 0}
          subtitle={`of ${overview?.totalQuizzes ?? 0} generated`}
          icon={<BrainCircuit size={22} />}
          color="#10b981"
          to="/admin/quizzes"
        />
        <MetricCard
          title="Tutor Interactions"
          value={overview?.tutorInteractions ?? 0}
          subtitle="Student questions answered"
          icon={<MessageSquare size={22} />}
          color="#f59e0b"
          to="/admin/tutor"
        />
        <MetricCard
          title="Average Quiz Score"
          value={overview?.averageQuizScore !== null && overview?.averageQuizScore !== undefined ? `${overview.averageQuizScore}%` : '—'}
          subtitle="Completed assessments"
          icon={<Award size={22} />}
          color="#8b5cf6"
          to="/admin/quizzes"
        />
      </section>

      {/* Visual Analytics / Charts Section */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2rem' }}>
        {/* User Growth Chart */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: '#6366f1' }} /> User Growth Over Time
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Database registrations</span>
          </div>

          {(!charts?.userGrowth || charts.userGrowth.length === 0) ? (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Not enough data yet
            </div>
          ) : (
            <div>
              {/* SVG Area Chart */}
              <div style={{ width: '100%', height: '170px', position: 'relative' }}>
                <svg width="100%" height="100%" viewBox="0 0 400 150" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="userGrowthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Generate Path */}
                  {(() => {
                    const data = charts.userGrowth;
                    const maxVal = Math.max(...data.map((d) => d.cumulative), 1);
                    const points = data.map((d, i) => {
                      const x = (i / Math.max(data.length - 1, 1)) * 380 + 10;
                      const y = 140 - (d.cumulative / maxVal) * 120;
                      return `${x},${y}`;
                    });
                    const dLine = `M ${points.join(' L ')}`;
                    const dArea = `${dLine} L ${380 + 10},145 L 10,145 Z`;

                    return (
                      <>
                        <path d={dArea} fill="url(#userGrowthGrad)" />
                        <path d={dLine} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
                        {data.map((d, i) => {
                          const x = (i / Math.max(data.length - 1, 1)) * 380 + 10;
                          const y = 140 - (d.cumulative / maxVal) * 120;
                          return (
                            <circle key={i} cx={x} cy={y} r="4" fill="#f8fafc" stroke="#6366f1" strokeWidth="2" />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                <span>{charts.userGrowth[0]?.date}</span>
                <span>{charts.userGrowth[charts.userGrowth.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quiz Performance Trend */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BrainCircuit size={18} style={{ color: '#10b981' }} /> Quiz Performance Trend
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average score per completion date</span>
          </div>

          {(!charts?.quizPerformance || charts.quizPerformance.length === 0) ? (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Not enough data yet
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '170px', gap: '0.75rem', paddingBottom: '0.5rem' }}>
                {charts.quizPerformance.map((item, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.averageScore >= 70 ? '#10b981' : '#f59e0b', marginBottom: '0.35rem' }}>
                      {item.averageScore}%
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '48px',
                        height: `${Math.max(item.averageScore, 10)}%`,
                        background: item.averageScore >= 70
                          ? 'linear-gradient(180deg, #10b981, rgba(16, 185, 129, 0.4))'
                          : 'linear-gradient(180deg, #f59e0b, rgba(245, 158, 11, 0.4))',
                        borderRadius: '6px 6px 0 0',
                        transition: 'var(--transition)',
                      }}
                      title={`${item.date}: Avg score ${item.averageScore}% (${item.count} quizzes)`}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.5rem', whiteSpace: 'nowrap' }}>
                      {item.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Middle Grid: Material Processing Status & System Health */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* Material Processing Status */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} style={{ color: '#06b6d4' }} /> Material Processing Pipeline
            </h3>
            <Link to="/admin/materials" style={{ fontSize: '0.85rem', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>READY</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
                {overview?.materialBreakdown.READY ?? 0}
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600 }}>PROCESSING</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
                {overview?.materialBreakdown.PROCESSING ?? 0}
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>QUEUED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
                {overview?.materialBreakdown.QUEUED ?? 0}
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>FAILED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
                {overview?.materialBreakdown.FAILED ?? 0}
              </div>
            </div>
          </div>

          {/* Progress bar visualizer */}
          {(() => {
            const total = overview?.totalMaterials || 1;
            const readyPct = ((overview?.materialBreakdown.READY || 0) / total) * 100;
            const procPct = (((overview?.materialBreakdown.PROCESSING || 0) + (overview?.materialBreakdown.QUEUED || 0)) / total) * 100;
            const failPct = ((overview?.materialBreakdown.FAILED || 0) / total) * 100;

            return (
              <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ width: `${readyPct}%`, background: '#10b981' }} title={`Ready: ${readyPct.toFixed(1)}%`} />
                <div style={{ width: `${procPct}%`, background: '#f59e0b' }} title={`Processing: ${procPct.toFixed(1)}%`} />
                <div style={{ width: `${failPct}%`, background: '#f43f5e' }} title={`Failed: ${failPct.toFixed(1)}%`} />
              </div>
            );
          })()}
        </div>

        {/* Live System Health Summary */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HeartPulse size={18} style={{ color: '#ec4899' }} /> Live System Health
            </h3>
            <Link to="/admin/health" style={{ fontSize: '0.85rem', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Full diagnostics <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Backend API</span>
              </div>
              <span className="badge badge-ready">Operational</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {healthStatus?.components?.database?.status === 'healthy' ? (
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                ) : (
                  <XCircle size={16} style={{ color: '#f87171' }} />
                )}
                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Database</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {healthStatus?.components?.database?.latencyMs !== undefined ? `${healthStatus.components.database.latencyMs}ms ping` : 'Connected'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {healthStatus?.components?.aiService?.configured ? (
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                ) : (
                  <Clock3 size={16} style={{ color: '#f59e0b' }} />
                )}
                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>AI / Gemini</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: healthStatus?.components?.aiService?.configured ? '#34d399' : '#fbbf24' }}>
                {healthStatus?.components?.aiService?.model || 'Gemini Flash'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Background Worker</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {healthStatus?.components?.backgroundWorker?.queue?.processing ?? 0} active
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section: Recent System Activity & Tables */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* Recent Activity Timeline */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: '#6366f1' }} /> Recent Activity Stream
            </h3>
            <Link to="/admin/activity" style={{ fontSize: '0.85rem', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View all events <ArrowRight size={14} />
            </Link>
          </div>

          {(!overview?.recentEvents || overview.recentEvents.length === 0) ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent activity logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {overview.recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid #6366f1',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                      {formatActivityName(evt.eventType)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {evt.userName} • {evt.projectName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    <Clock size={12} />
                    <span>{formatSafeDate(evt.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Registered Users */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: '#ec4899' }} /> Recent Users
            </h3>
            <Link to="/admin/users" style={{ fontSize: '0.85rem', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Manage users <ArrowRight size={14} />
            </Link>
          </div>

          {(!overview?.recentUsers || overview.recentUsers.length === 0) ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No users found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {overview.recentUsers.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>{u.name}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: u.role === 'ADMIN' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                          color: u.role === 'ADMIN' ? '#f59e0b' : '#a5b4fc',
                        }}
                      >
                        {u.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    <div>Joined {formatSafeDate(u.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
