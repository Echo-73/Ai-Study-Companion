import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { apiClient } from '../api/client';
import { 
  Activity, 
  BookOpen, 
  PenTool, 
  MessageCircle, 
  TrendingUp, 
  Award, 
  FileText, 
  CheckCircle2, 
  BrainCircuit,
  Calendar
} from 'lucide-react';

interface QuizTrendItem {
  id: string;
  title: string;
  score: number;
  scorePercentage?: number;
  completedAt?: string;
  date?: string;
  dateFormatted?: string;
}

interface ConceptMasteryItem {
  conceptId: string;
  name: string;
  conceptName?: string;
  score: number;
  scorePercentage?: number;
  currentScore?: number;
  status: 'NEW' | 'IMPROVING' | 'STABLE' | 'REQUIRES_ATTENTION';
  trend?: 'improving' | 'declining' | 'stable' | 'NEW';
  totalQuestions?: number;
  correctAnswers?: number;
  hasData?: boolean;
  lastTestedAt?: string | null;
}

interface AnalyticsData {
  totalInteractions: number;
  quizzesTaken: number;
  tutorQuestions: number;
  materialsUploaded: number;
  averageQuizScore: number | null;
  activityBreakdown: Record<string, number>;
  masteryDistribution: {
    IMPROVING: number;
    STABLE: number;
    REQUIRES_ATTENTION: number;
    NEW: number;
  };
  quizTrend: QuizTrendItem[];
  recentQuizzes: QuizTrendItem[];
  conceptMastery: ConceptMasteryItem[];
  tutorMessagesCount: number;
}

export const ProjectAnalyticsPage: React.FC = () => {
  const { project } = useProject();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (project?.id) {
      apiClient.get(`/projects/${project.id}/analytics`)
        .then(res => setAnalytics(res.data.data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [project?.id]);

  if (isLoading) return <div>Loading analytics...</div>;
  if (!analytics) return <div>No analytics available yet.</div>;

  const getActivityIcon = (type: string) => {
    if (type.includes('QUIZ') || type.includes('ASSESSMENT')) return <PenTool size={16} />;
    if (type.includes('TUTOR') || type.includes('CHAT')) return <MessageCircle size={16} />;
    if (type.includes('MASTERY')) return <TrendingUp size={16} />;
    return <BookOpen size={16} />;
  };

  const formatActivityName = (key: string) => {
    switch (key) {
      case 'ASSESSMENT_COMPLETED': return 'Quiz Completed';
      case 'QUIZ_STARTED': return 'Quiz Started';
      case 'TUTOR_INTERACTION': return 'Tutor Question';
      case 'MATERIAL_UPLOADED': return 'Material Uploaded';
      case 'MATERIAL_PROCESSING_COMPLETED': return 'Material Processed';
      case 'MATERIAL_PROCESSING_STARTED': return 'Processing Started';
      case 'MASTERY_UPDATED': return 'Mastery Updated';
      case 'PROJECT_CREATED': return 'Project Created';
      default: return key.replace(/_/g, ' ');
    }
  };

  const formatSafeDate = (dateVal: any): string => {
    if (!dateVal) return 'Date unavailable';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Date unavailable';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IMPROVING': return '#10b981';
      case 'STABLE': return '#06b6d4';
      case 'REQUIRES_ATTENTION': return '#f59e0b';
      case 'NEW': return '#6366f1';
      default: return '#94a3b8';
    }
  };

  // Filter internal alias keys out of Activity Breakdown display so counts don't look redundant
  const displayActivities = Object.entries(analytics.activityBreakdown || {}).filter(
    ([key]) => !['QUIZ_SUBMITTED', 'QUIZ_COMPLETED', 'TUTOR_CHAT'].includes(key)
  );

  const quizzes = analytics.recentQuizzes || analytics.quizTrend || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Analytics</h1>
        <p style={{ color: 'var(--text-muted)' }}>Detailed breakdown of your learning activity and quiz performance.</p>
      </div>

      {/* 5-Card Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#6366f1' }}>
            <Activity size={18} />
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Interactions</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>
            {analytics.totalInteractions ?? 0}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#ec4899' }}>
            <PenTool size={18} />
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quizzes Taken</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>
            {analytics.quizzesTaken ?? 0}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#10b981' }}>
            <Award size={18} />
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Score</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>
            {analytics.averageQuizScore !== null && analytics.averageQuizScore !== undefined ? `${analytics.averageQuizScore}%` : '—'}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#06b6d4' }}>
            <MessageCircle size={18} />
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tutor Questions</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>
            {analytics.tutorQuestions ?? 0}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#f59e0b' }}>
            <FileText size={18} />
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Materials</h3>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>
            {analytics.materialsUploaded ?? 0}
          </p>
        </div>
      </div>

      {/* Activity Breakdown & Recent Quiz Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Activity Breakdown */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} style={{ color: '#6366f1' }} /> Activity Breakdown
          </h3>
          {displayActivities.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No learning activities logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {displayActivities.map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>{getActivityIcon(key)}</div>
                    <span style={{ fontWeight: 500 }}>{formatActivityName(key)}</span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{value as number}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quiz Performance */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PenTool size={20} style={{ color: '#ec4899' }} /> Recent Quiz Performance
          </h3>
          {quizzes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>No completed quizzes yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {quizzes.map((q, i) => {
                const scorePct = typeof q.scorePercentage === 'number' 
                  ? q.scorePercentage 
                  : Math.round((q.score ?? 0) * 100);
                const safeDateStr = formatSafeDate(q.completedAt || q.date);
                const isPassing = scorePct >= 70;

                return (
                  <div key={q.id || i} style={{ 
                    padding: '1rem', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${isPassing ? '#10b981' : '#f59e0b'}`, 
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{q.title || 'Adaptive Quiz'}</span>
                      <span style={{ 
                        fontWeight: 700, 
                        color: isPassing ? '#10b981' : '#f59e0b',
                        fontSize: '1rem'
                      }}>
                        Score: {scorePct}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <Calendar size={14} />
                      <span>{safeDateStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quiz Performance Over Time */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} style={{ color: '#10b981' }} /> Quiz Performance Trend
        </h3>
        {quizzes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Take your first quiz to begin tracking performance over time.</p>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {quizzes.slice().reverse().map((q, idx) => {
                const scorePct = typeof q.scorePercentage === 'number'
                  ? q.scorePercentage
                  : Math.round((q.score ?? 0) * 100);
                const safeDateStr = formatSafeDate(q.completedAt || q.date);

                return (
                  <div key={q.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ minWidth: '100px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {safeDateStr}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span>{q.title || `Quiz #${idx + 1}`}</span>
                        <span style={{ fontWeight: 600 }}>{scorePct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${Math.min(Math.max(scorePct, 0), 100)}%`, 
                          height: '100%', 
                          background: scorePct >= 70 ? '#10b981' : scorePct >= 50 ? '#f59e0b' : '#ef4444',
                          transition: 'width 0.6s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {quizzes.length === 1 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
                Complete more quizzes to observe score progression and learning trends.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Concept Mastery in Analytics (Single Source of Truth) */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BrainCircuit size={20} style={{ color: '#06b6d4' }} /> Concept Mastery Overview
        </h3>
        {!analytics.conceptMastery || analytics.conceptMastery.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No concept mastery data recorded yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {analytics.conceptMastery.map((concept) => {
              const rawScore = typeof concept.score === 'number' && !isNaN(concept.score)
                ? concept.score
                : (typeof concept.currentScore === 'number' && !isNaN(concept.currentScore) ? concept.currentScore : 0);
              const scorePct = typeof concept.scorePercentage === 'number'
                ? concept.scorePercentage
                : Math.round(rawScore * 100);
              const hasTestedData = concept.hasData || (concept.totalQuestions !== undefined && concept.totalQuestions > 0);
              const scoreLabel = hasTestedData ? `${scorePct}%` : 'No quiz data yet';
              const conceptName = concept.name || concept.conceptName || 'Concept';

              return (
                <div key={concept.conceptId} style={{ 
                  padding: '1.25rem', 
                  borderRadius: '8px', 
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{conceptName}</h4>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontWeight: 600,
                      background: `${getStatusColor(concept.status)}22`, 
                      color: getStatusColor(concept.status)
                    }}>
                      {concept.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mastery</span>
                    <span style={{ fontWeight: 600 }}>{scoreLabel}</span>
                  </div>

                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${hasTestedData ? Math.min(Math.max(scorePct, 0), 100) : 0}%`, 
                      height: '100%', 
                      background: getStatusColor(concept.status)
                    }} />
                  </div>

                  {concept.trend && concept.trend !== 'NEW' && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: concept.trend === 'improving' ? '#10b981' : concept.trend === 'declining' ? '#f43f5e' : '#06b6d4', textTransform: 'capitalize' }}>
                      Trend: {concept.trend}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectAnalyticsPage;
