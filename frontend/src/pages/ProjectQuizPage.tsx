import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { apiClient } from '../api/client';
import { BrainCircuit, CheckCircle, XCircle, ChevronRight } from 'lucide-react';

interface Question {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
  prompt?: string;
  content?: string;
  options?: any;
  correctAnswer?: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

export const ProjectQuizPage: React.FC = () => {
  const { project } = useProject();
  const [isGenerating, setIsGenerating] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  
  // State for taking the quiz
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!project) return;
    setIsGenerating(true);
    setQuiz(null);
    setResult(null);
    setAnswers({});

    console.log('[QUIZ FRONTEND]\nGenerating quiz...\nProject ID:', project.id);
    console.log('API URL: /projects/' + project.id + '/quiz/generate');

    try {
      const res = await apiClient.post(`/projects/${project.id}/quiz/generate`, {
        questionCount: 4,
      });
      console.log('[QUIZ FRONTEND] Quiz response data:', res.data);
      const generatedQuiz = res.data?.data?.quiz || res.data?.data;
      setQuiz(generatedQuiz);
    } catch (err: any) {
      console.error('[QUIZ FRONTEND] Quiz generation error:', err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptionChange = (questionId: string, optionValue: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionValue }));
  };

  const handleOpenEndedChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const getOptionsList = (options: any): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) {
      return options.map(o => String(o));
    }
    if (typeof options === 'object') {
      return Object.values(options).map(o => String(o));
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !quiz) return;
    
    // Format answers for the API
    const formattedResponses = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      userResponse: answer,
      answer
    }));

    setIsSubmitting(true);
    console.log('[QUIZ FRONTEND] Submitting quiz...', { quizId: quiz.id, responses: formattedResponses });

    try {
      const res = await apiClient.post(`/projects/${project.id}/quiz/${quiz.id}/submit`, {
        quizId: quiz.id,
        responses: formattedResponses,
        answers: formattedResponses
      });
      console.log('[QUIZ FRONTEND] Submit response data:', res.data);
      const submitResult = res.data?.data?.result || res.data?.data;
      setResult(submitResult);
    } catch (err: any) {
      console.error('[QUIZ FRONTEND] Submit error:', err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!quiz && !isGenerating && !result) {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem 0' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Adaptive Quizzes</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>Test your knowledge and update your mastery scores.</p>
        
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <BrainCircuit size={64} style={{ color: '#10b981', margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Ready to test yourself?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            We'll generate a custom quiz based on your project's materials. The questions are adaptive, focusing more on areas where you need improvement.
          </p>
          <button className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }} onClick={handleGenerate}>
            Generate Quiz
          </button>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <BrainCircuit size={64} className="animate-pulse-glow" style={{ color: '#10b981', marginBottom: '1.5rem', borderRadius: '50%' }} />
        <h2 style={{ fontSize: '1.5rem' }}>Generating your custom quiz...</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Analyzing concepts and assessing your mastery level.</p>
      </div>
    );
  }

  if (result) {
    const scoreVal = Math.round(((result.score ?? result.overallScore ?? 0) * 100));
    const evaluations = result.evaluations || result.evaluatedResponses || [];

    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 0' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem', borderTop: '4px solid #10b981' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>
            {scoreVal}%
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Quiz Completed</p>
        </div>

        <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Review</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {evaluations.map((ev: any) => {
            const matchedQuestion = quiz?.questions?.find((q: any) => q.id === ev.questionId);
            const questionText = matchedQuestion?.prompt || matchedQuestion?.content || 'Question';

            return (
              <div key={ev.questionId} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `4px solid ${ev.isCorrect ? '#10b981' : '#f43f5e'}` }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ marginTop: '0.25rem' }}>
                    {ev.isCorrect ? <CheckCircle color="#10b981" /> : <XCircle color="#f43f5e" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                      {questionText}
                    </h4>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Your Answer:</p>
                      <p style={{ fontWeight: 500 }}>{answers[ev.questionId] || 'Not answered'}</p>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      <strong>Feedback:</strong> {ev.feedback || (ev.isCorrect ? 'Correct! Selected the valid answer.' : 'Incorrect response.')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={() => { setResult(null); setQuiz(null); }}>
            Return to Quizzes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{quiz?.title}</h1>
          <p style={{ color: 'var(--text-muted)' }}>Answer all questions to complete the assessment.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {quiz?.questions?.map((q: any, idx: number) => {
          const promptText = q.prompt || q.content;
          const optionsList = getOptionsList(q.options);

          return (
            <div key={q.id} className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                <span style={{ color: '#10b981', marginRight: '0.5rem' }}>{idx + 1}.</span>
                {promptText}
              </h3>

              {q.type === 'MULTIPLE_CHOICE' && optionsList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {optionsList.map((optValue, optIdx) => (
                    <label 
                      key={optIdx}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                        background: answers[q.id] === optValue ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${answers[q.id] === optValue ? '#10b981' : 'var(--border-glass)'}`,
                        borderRadius: '8px', cursor: 'pointer', transition: 'var(--transition)'
                      }}
                    >
                      <input 
                        type="radio" 
                        name={q.id} 
                        value={optValue} 
                        checked={answers[q.id] === optValue}
                        onChange={() => handleOptionChange(q.id, optValue)}
                        style={{ accentColor: '#10b981', width: '1.2rem', height: '1.2rem' }}
                        required
                      />
                      <span style={{ fontWeight: answers[q.id] === optValue ? 600 : 400 }}>{optValue}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'OPEN_ENDED' && (
                <textarea 
                  className="input-glass"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  placeholder="Type your answer here..."
                  value={answers[q.id] || ''}
                  onChange={e => handleOpenEndedChange(q.id, e.target.value)}
                  required
                />
              )}
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', marginBottom: '4rem' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'} <ChevronRight size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectQuizPage;

