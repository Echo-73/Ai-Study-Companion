import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { apiClient } from '../api/client';
import { TrendingUp, AlertTriangle, Lightbulb, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConceptMastery {
  conceptId: string;
  name: string;
  concept?: string;
  conceptName?: string;
  score: number; // 0.0 to 1.0
  currentScore?: number;
  scorePercentage?: number;
  status: 'NEW' | 'IMPROVING' | 'STABLE' | 'REQUIRES_ATTENTION';
  trend?: 'improving' | 'declining' | 'stable' | 'NEW';
  totalQuestions?: number;
  correctAnswers?: number;
  hasData?: boolean;
  lastTestedAt: string | null;
}

interface Recommendation {
  id: string;
  conceptId?: string;
  conceptName?: string;
  concept?: string;
  title?: string;
  actionType: 'REVIEW_MATERIAL' | 'TAKE_QUIZ' | 'ASK_TUTOR';
  description?: string;
  reason?: string;
  isDismissed: boolean;
}

export const ProjectGrowthPage: React.FC = () => {
  const { project } = useProject();
  const [masteryList, setMasteryList] = useState<ConceptMastery[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!project) return;
    
    Promise.all([
      apiClient.get(`/projects/${project.id}/growth/mastery`),
      apiClient.get(`/projects/${project.id}/growth/recommendations`)
    ])
    .then(([masteryRes, recRes]) => {
      setMasteryList(masteryRes.data.data || []);
      setRecommendations((recRes.data.data || []).filter((r: Recommendation) => !r.isDismissed));
    })
    .catch(console.error)
    .finally(() => setIsLoading(false));
  }, [project]);

  const handleDismiss = async (id: string) => {
    if (!project) return;
    try {
      await apiClient.post(`/projects/${project.id}/growth/recommendations/${id}/dismiss`);
      setRecommendations(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
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

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'TAKE_QUIZ': return <TrendingUp size={20} style={{ color: '#ec4899' }} />;
      case 'ASK_TUTOR': return <Lightbulb size={20} style={{ color: '#06b6d4' }} />;
      default: return <AlertTriangle size={20} style={{ color: '#f59e0b' }} />;
    }
  };

  const handleActionClick = (actionType: string) => {
    switch (actionType) {
      case 'TAKE_QUIZ': return navigate('../quiz');
      case 'ASK_TUTOR': return navigate('../tutor');
      default: return navigate('../materials');
    }
  };

  const formatSafeDate = (dateVal: string | null) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) return <div>Loading mastery data...</div>;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Mastery & Growth</h1>
        <p style={{ color: 'var(--text-muted)' }}>Track your understanding of core concepts and get actionable recommendations.</p>
      </div>

      {/* Recommendations Section */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '-1rem' }}>Recommendations</h2>
      {recommendations.length === 0 ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <CheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
          <h3>You're all caught up!</h3>
          <p style={{ color: 'var(--text-muted)' }}>Complete quizzes to generate personalized study recommendations.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recommendations.map(rec => {
            const headingText = rec.title?.startsWith('Focus on') || rec.title?.startsWith('Keep practicing')
              ? rec.title
              : `Focus on: ${rec.conceptName || rec.concept || 'Core Concept'}`;

            const descText = rec.description || rec.reason || 'Practice this concept to reinforce understanding.';

            return (
              <div key={rec.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    {getActionIcon(rec.actionType)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{headingText}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{descText}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => handleDismiss(rec.id)}>Dismiss</button>
                  <button className="btn btn-primary" onClick={() => handleActionClick(rec.actionType)}>
                    Act Now <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Concept Mastery Grid */}
      <h2 style={{ fontSize: '1.25rem', marginTop: '1rem', marginBottom: '-1rem' }}>Concept Mastery</h2>
      {masteryList.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No concepts tracked yet. Upload materials or take quizzes to begin tracking concepts.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {masteryList.map(concept => {
            const rawScore = typeof concept.score === 'number' && !isNaN(concept.score)
              ? concept.score
              : (typeof concept.currentScore === 'number' && !isNaN(concept.currentScore) ? concept.currentScore : 0);

            const scorePct = Math.round(rawScore * 100);
            const hasTestedData = concept.hasData || (concept.totalQuestions !== undefined && concept.totalQuestions > 0);
            const scoreLabel = hasTestedData ? `${scorePct}%` : 'No quiz data yet';
            const formattedDate = formatSafeDate(concept.lastTestedAt);

            return (
              <div key={concept.conceptId} className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, maxWidth: '70%' }}>{concept.name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                    <span style={{ 
                      fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600,
                      background: `${getStatusColor(concept.status)}22`, color: getStatusColor(concept.status)
                    }}>
                      {concept.status.replace('_', ' ')}
                    </span>
                    {concept.trend && concept.trend !== 'NEW' && (
                      <span style={{ fontSize: '0.7rem', color: concept.trend === 'improving' ? '#10b981' : concept.trend === 'declining' ? '#f43f5e' : '#06b6d4', textTransform: 'capitalize' }}>
                        Trend: {concept.trend}
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Score</span>
                  <span style={{ fontWeight: 600 }}>{scoreLabel}</span>
                </div>
                
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${hasTestedData ? Math.min(Math.max(scorePct, 0), 100) : 0}%`, 
                    height: '100%', 
                    background: getStatusColor(concept.status),
                    transition: 'width 1s ease-in-out'
                  }} />
                </div>

                {formattedDate && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '1rem' }}>
                    Last tested: {formattedDate}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectGrowthPage;

