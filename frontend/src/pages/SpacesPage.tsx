import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Plus, Folder } from 'lucide-react';

interface Space {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export const SpacesPage: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create Space Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  const navigate = useNavigate();

  const fetchSpaces = async () => {
    try {
      const res = await apiClient.get('/spaces');
      setSpaces(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load spaces');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    try {
      const res = await apiClient.post('/spaces', { name: newName, description: newDesc });
      setSpaces([res.data.data, ...spaces]);
      setIsCreating(false);
      setNewName('');
      setNewDesc('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create space');
    }
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading spaces...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>My Spaces</h1>
          <p style={{ color: 'var(--text-muted)' }}>Organize your learning by subject or domain</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          <Plus size={18} /> New Space
        </button>
      </div>

      {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}

      {isCreating && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem' }}>Create a New Space</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              className="input-glass" 
              placeholder="Space Name (e.g. Computer Science)" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
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
              <button type="submit" className="btn btn-primary">Create Space</button>
            </div>
          </form>
        </div>
      )}

      {spaces.length === 0 && !isCreating ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <Folder size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
          <h3>No spaces found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Create your first space to get started.</p>
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>Create Space</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {spaces.map(space => (
            <div 
              key={space.id} 
              className="glass-panel animate-fade-in" 
              style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              onClick={() => navigate(`/spaces/${space.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '8px' }}>
                  <Folder size={20} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{space.name}</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1 }}>{space.description || 'No description provided.'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpacesPage;
