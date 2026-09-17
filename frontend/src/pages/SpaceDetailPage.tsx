import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ArrowLeft, Plus, Layout } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  learningGoal: string;
  createdAt: string;
}

interface Space {
  id: string;
  name: string;
  description: string | null;
  projects: Project[];
}

export const SpaceDetailPage: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create Project Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newGoal, setNewGoal] = useState('');
  
  const navigate = useNavigate();

  const fetchSpaceDetails = async () => {
    try {
      const res = await apiClient.get(`/spaces/${spaceId}`);
      setSpace(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load space details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaceDetails();
  }, [spaceId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newGoal.trim()) return;
    
    try {
      const res = await apiClient.post('/projects', { 
        spaceId, 
        name: newName, 
        description: newDesc,
        learningGoal: newGoal
      });
      if (space) {
        setSpace({
          ...space,
          projects: [res.data.data, ...space.projects]
        });
      }
      setIsCreating(false);
      setNewName('');
      setNewDesc('');
      setNewGoal('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create project');
    }
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading space...</div>;
  if (error || !space) return <div style={{ color: '#f87171', padding: '2rem', textAlign: 'center' }}>{error || 'Space not found'}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/spaces')} 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.9rem' }}
      >
        <ArrowLeft size={16} /> Back to Spaces
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{space.name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>{space.description || 'No description provided.'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          <Plus size={18} /> New Project
        </button>
      </div>

      {isCreating && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem' }}>Create a New Project</h3>
          <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              className="input-glass" 
              placeholder="Project Name (e.g. Master React)" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              required 
            />
            <input 
              type="text" 
              className="input-glass" 
              placeholder="Learning Goal (e.g. I want to build full-stack web apps)" 
              value={newGoal} 
              onChange={e => setNewGoal(e.target.value)} 
              required
            />
            <input 
              type="text" 
              className="input-glass" 
              placeholder="Description (Optional)" 
              value={newDesc} 
              onChange={e => setNewDesc(e.target.value)} 
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Project</button>
            </div>
          </form>
        </div>
      )}

      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Projects</h2>

      {space.projects.length === 0 && !isCreating ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <Layout size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
          <h3>No projects found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Create a project inside this space to upload materials and start learning.</p>
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>Create Project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {space.projects.map(project => (
            <div 
              key={project.id} 
              className="glass-panel animate-fade-in" 
              style={{ padding: '1.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderRadius: '8px' }}>
                  <Layout size={20} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{project.name}</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <strong>Goal:</strong> {project.learningGoal}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpaceDetailPage;
