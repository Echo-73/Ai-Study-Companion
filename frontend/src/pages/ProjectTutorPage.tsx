import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { apiClient } from '../api/client';
import { Send, Bot, User as UserIcon, BookOpen, AlertTriangle } from 'lucide-react';

interface Citation {
  materialTitle: string;
  pageNumber: number;
  excerpt: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isSupported: boolean;
}

export const ProjectTutorPage: React.FC = () => {
  const { project } = useProject();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Optionally fetch existing conversation history
    // For this prototype, we'll start fresh or fetch the latest
    if (project?.id) {
      apiClient.get(`/projects/${project.id}/tutor/conversations`)
        .then(res => {
          const convs = res.data?.data;
          if (Array.isArray(convs) && convs.length > 0) {
            setConversationId(convs[0].id);
            return apiClient.get(`/projects/${project.id}/tutor/conversations/${convs[0].id}`);
          }
        })
        .then(res => {
          if (res?.data?.data) {
            const msgs = Array.isArray(res.data.data) ? res.data.data : (res.data.data.messages || []);
            setMessages(msgs);
          }
        })
        .catch(err => {
          console.error('Failed to load conversation history:', err);
        });
    }
  }, [project?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !project) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: input.trim(),
      isSupported: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('Sending question to AI Tutor:', {
        url: `/projects/${project.id}/tutor/chat`,
        question: userMessage.content,
        conversationId,
      });

      const res = await apiClient.post(`/projects/${project.id}/tutor/chat`, {
        question: userMessage.content,
        conversationId
      });
      
      console.log('AI Tutor Response:', res.status, res.data);

      const resData = res.data;
      const payload = resData?.data || resData;

      if (!conversationId && payload?.conversationId) {
        setConversationId(payload.conversationId);
      }

      const answerContent =
        payload?.answer ||
        payload?.response ||
        payload?.message?.content ||
        resData?.response ||
        resData?.message ||
        '';

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: answerContent,
        citations: payload?.citations || [],
        isSupported: payload?.isSupported !== undefined ? payload.isSupported : true
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Tutor Chat Error:', err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Sorry, I encountered an error while processing your request.';

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: `[Error] ${errorMsg}`,
        isSupported: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>AI Tutor</h1>
        <p style={{ color: 'var(--text-muted)' }}>Ask questions. Get grounded answers based strictly on your project materials.</p>
      </div>

      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', maxWidth: '400px' }}>
              <Bot size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3>How can I help you learn today?</h3>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>I will strictly use your uploaded materials to answer your questions.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', gap: '1rem', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #6366f1, #ec4899)' : 'rgba(255,255,255,0.1)' 
                }}>
                  {msg.sender === 'user' ? <UserIcon size={18} /> : <Bot size={18} />}
                </div>
                
                <div style={{ 
                  maxWidth: '75%',
                  background: msg.sender === 'user' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${msg.sender === 'user' ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-glass)'}`,
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  borderTopRightRadius: msg.sender === 'user' ? '4px' : 'var(--radius-lg)',
                  borderTopLeftRadius: msg.sender === 'assistant' ? '4px' : 'var(--radius-lg)',
                }}>
                  {!msg.isSupported && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.85rem', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '4px' }}>
                      <AlertTriangle size={16} /> 
                      <strong>Warning:</strong> I couldn't find sufficient evidence in the uploaded materials for this answer.
                    </div>
                  )}
                  
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</div>

                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>SOURCES</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {msg.citations.map((cite, idx) => (
                          <div key={idx} style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.35rem', 
                            fontSize: '0.75rem', padding: '0.25rem 0.5rem', 
                            background: 'rgba(255,255,255,0.05)', borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <BookOpen size={12} style={{ color: '#06b6d4' }} />
                            <span>{cite.materialTitle} (Pg. {cite.pageNumber})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} className="animate-pulse-glow" />
              </div>
              <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              className="input-glass"
              style={{ flex: 1, borderRadius: '9999px', paddingLeft: '1.5rem' }}
              placeholder="Ask a question about your materials..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, flexShrink: 0 }}
              disabled={isLoading || !input.trim()}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectTutorPage;
