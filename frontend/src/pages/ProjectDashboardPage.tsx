import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { apiClient } from '../api/client';
import { 
  Target, 
  FileText, 
  BrainCircuit, 
  Activity, 
  MessageSquare, 
  PenTool, 
  TrendingUp, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  RefreshCw, 
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardData {
  project: {
    id: string;
    name: string;
    description: string | null;
    learningGoal: string;
    spaceId: string;
    createdAt: string;
  };
  materials: {
    total: number;
    readyCount: number;
    processingCount: number;
    failedCount: number;
    list: Array<{
      id: string;
      title: string;
      status: string;
      pageCount: number;
      createdAt: string;
    }>;
  };
  tutor: {
    interactionCount: number;
  };
  quiz: {
    quizzesTaken: number;
    averageQuizScore: number | null;
    lastQuizScore: number | null;
    recentQuizzes: Array<{
      id: string;
      title: string;
      score: number;
      scorePercentage?: number;
      completedAt?: string;
      date?: string;
      dateFormatted?: string;
    }>;
  };
  mastery: {
    conceptCount: number;
    strongCount: number;
    needsAttentionCount: number;
    developingCount: number;
    averageMastery: number | null;
    concepts: Array<{
      conceptId: string;
      name: string;
      score: number;
      scorePercentage: number;
      status: string;
      trend: string;
      hasData: boolean;
    }>;
  };
  focusArea: {
    id?: string;
    conceptName?: string;
    concept?: string;
    title: string;
    reason?: string;
    description?: string;
    actionText: string;
    actionType: 'REVIEW_MATERIAL' | 'TAKE_QUIZ' | 'ASK_TUTOR';
  } | null;
  recentActivity: Array<{
    id: string;
    eventType: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
}

export const ProjectDashboardPage: React.FC = () => {
  const { project, isLoading: projectLoading } = useProject();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    if (!project?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/projects/${project.id}`);
      setDashboard(res.data.data);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.response?.data?.message || 'Unable to load learning progress. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [project?.id]);

  const formatSafeDate = (dateVal: any): string => {
    if (!dateVal) return 'Date unavailable';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Date unavailable';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatRelativeTime = (dateVal: any): string => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getActivityIcon = (type: string) => {
    if (type.includes('QUIZ') || type.includes('ASSESSMENT')) return <PenTool size={16} style={{ color: '#8b5cf6' }} />;
    if (type.includes('TUTOR') || type.includes('CHAT')) return <MessageSquare size={16} style={{ color: '#06b6d4' }} />;
    if (type.includes('MASTERY')) return <TrendingUp size={16} style={{ color: '#10b981' }} />;
    if (type.includes('MATERIAL')) return <FileText size={16} style={{ color: '#ec4899' }} />;
    return <Activity size={16} style={{ color: '#6366f1' }} />;
  };

  const handleActionClick = (actionType?: string) => {
    switch (actionType) {
      case 'TAKE_QUIZ': return navigate('quiz');
      case 'ASK_TUTOR': return navigate('tutor');
      default: return navigate('materials');
    }
  };

  if (projectLoading || (isLoading && !dashboard)) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <div className="animate-pulse-glow" style={{ height: '36px', width: '220px', borderRadius: '6px', marginBottom: '0.5rem' }}></div>
          <div className="animate-pulse-glow" style={{ height: '18px', width: '340px', borderRadius: '4px' }}></div>
        </div>
        <div className="glass-panel animate-pulse-glow" style={{ height: '100px', borderRadius: '12px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-panel animate-pulse-glow" style={{ height: '140px', borderRadius: '12px' }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', margin: '2rem 0' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '0.5rem' }}>Unable to Load Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchDashboardData} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (!project) return <div>Project not found.</div>;

  const currentGoal = dashboard?.project?.learningGoal || project.learningGoal;
  const materialsInfo = dashboard?.materials || { total: 0, readyCount: 0, processingCount: 0, failedCount: 0, list: [] };
  const tutorInteractions = dashboard?.tutor?.interactionCount ?? 0;
  const quizzesTaken = dashboard?.quiz?.quizzesTaken ?? 0;
  const avgQuizScore = dashboard?.quiz?.averageQuizScore;
  const lastQuizScore = dashboard?.quiz?.lastQuizScore;
  const recentQuizzes = dashboard?.quiz?.recentQuizzes || [];
  const masteryInfo = dashboard?.mastery || { strongCount: 0, needsAttentionCount: 0, averageMastery: null, conceptCount: 0, concepts: [] };
  const focusArea = dashboard?.focusArea;
  const recentActivity = dashboard?.recentActivity || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Overview of your learning progress and mastery achievements.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={fetchDashboardData} 
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          title="Refresh dashboard metrics"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Learning Goal Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '12px' }}>
          <Target size={32} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Learning Goal
          </h3>
          <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {currentGoal}
          </p>
        </div>
      </div>

      {/* 4 Core Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {/* Materials Card */}
        <div 
          className="glass-panel" 
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }} 
          onClick={() => navigate('materials')} 
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} 
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ec4899' }}>
              <FileText size={22} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Materials</h3>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {materialsInfo.total} {materialsInfo.total === 1 ? 'uploaded' : 'uploaded'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {materialsInfo.readyCount} processed
            {materialsInfo.processingCount > 0 && ` · ${materialsInfo.processingCount} processing`}
            {materialsInfo.failedCount > 0 && ` · ${materialsInfo.failedCount} failed`}
          </p>
        </div>

        {/* AI Tutor Card */}
        <div 
          className="glass-panel" 
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }} 
          onClick={() => navigate('tutor')} 
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} 
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#06b6d4' }}>
              <MessageSquare size={22} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>AI Tutor</h3>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {tutorInteractions} {tutorInteractions === 1 ? 'interaction' : 'interactions'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Ask questions grounded in your materials
          </p>
        </div>

        {/* Quiz Performance Card */}
        <div 
          className="glass-panel" 
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }} 
          onClick={() => navigate('quiz')} 
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} 
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#8b5cf6' }}>
              <PenTool size={22} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Quizzes</h3>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {quizzesTaken} completed
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {avgQuizScore !== null && avgQuizScore !== undefined ? (
              <span>Avg Score: <strong style={{ color: avgQuizScore >= 70 ? '#10b981' : '#f59e0b' }}>{avgQuizScore}%</strong>{lastQuizScore !== null ? ` · Last: ${lastQuizScore}%` : ''}</span>
            ) : (
              'No quizzes taken yet'
            )}
          </p>
        </div>

        {/* Mastery Card */}
        <div 
          className="glass-panel" 
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }} 
          onClick={() => navigate('growth')} 
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} 
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
              <BrainCircuit size={22} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Mastery</h3>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {masteryInfo.averageMastery !== null ? `${masteryInfo.averageMastery}%` : 'No quiz data'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
            <span className="badge badge-ready">{masteryInfo.strongCount} Strong</span>
            <span className="badge badge-failed">{masteryInfo.needsAttentionCount} Attention</span>
          </div>
        </div>
      </div>

      {/* Middle Section (2 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Focus Area & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Focus Area / Recommendation */}
          <div className="glass-panel" style={{ padding: '1.75rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f59e0b' }}>
              <Target size={20} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>Focus Area</h3>
            </div>

            {focusArea ? (
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {focusArea.title || `Focus on: ${focusArea.conceptName}`}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                  {focusArea.reason || focusArea.description || 'Target this area to improve overall mastery.'}
                </p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleActionClick(focusArea.actionType)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {focusArea.actionText || 'Act Now'} <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.5rem 0' }}>
                <CheckCircle2 size={24} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>You're doing well!</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {quizzesTaken === 0 
                      ? 'Complete a quiz to receive personalized study recommendations.' 
                      : 'No concepts currently require attention. Keep practicing to maintain high mastery.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} style={{ color: '#6366f1' }} /> Quick Actions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => navigate('materials')} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', justifyContent: 'flex-start' }}
              >
                <BookOpen size={18} style={{ color: '#ec4899' }} />
                <span style={{ fontSize: '0.9rem' }}>Materials</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => navigate('tutor')} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', justifyContent: 'flex-start' }}
              >
                <MessageSquare size={18} style={{ color: '#06b6d4' }} />
                <span style={{ fontSize: '0.9rem' }}>AI Tutor</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => navigate('quiz')} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', justifyContent: 'flex-start' }}
              >
                <PenTool size={18} style={{ color: '#8b5cf6' }} />
                <span style={{ fontSize: '0.9rem' }}>Take Quiz</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => navigate('growth')} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', justifyContent: 'flex-start' }}
              >
                <TrendingUp size={18} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.9rem' }}>Mastery</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Quizzes & Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Recent Quiz Performance */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} style={{ color: '#8b5cf6' }} /> Recent Quiz Performance
              </h3>
              {recentQuizzes.length > 0 && (
                <span 
                  onClick={() => navigate('analytics')} 
                  style={{ fontSize: '0.8rem', color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}
                >
                  View All
                </span>
              )}
            </div>

            {recentQuizzes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>No quizzes completed yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentQuizzes.slice(0, 3).map((q, idx) => {
                  const scorePct = typeof q.scorePercentage === 'number'
                    ? q.scorePercentage
                    : Math.round((q.score ?? 0) * 100);
                  const isPassing = scorePct >= 70;
                  const safeDateStr = formatSafeDate(q.completedAt || q.date);

                  return (
                    <div 
                      key={q.id || idx}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.75rem 1rem', 
                        background: 'rgba(255,255,255,0.02)', 
                        borderLeft: `3px solid ${isPassing ? '#10b981' : '#f59e0b'}`,
                        borderRadius: '6px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{q.title || 'Adaptive Quiz'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{safeDateStr}</div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isPassing ? '#10b981' : '#f59e0b' }}>
                        {scorePct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} style={{ color: '#06b6d4' }} /> Recent Activity
            </h3>

            {recentActivity.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>No activity logged yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {recentActivity.slice(0, 4).map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', marginTop: '2px' }}>
                      {getActivityIcon(item.eventType)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{item.title}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboardPage;
