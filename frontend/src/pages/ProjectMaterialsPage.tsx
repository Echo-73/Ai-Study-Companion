import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { apiClient } from '../api/client';
import { UploadCloud, File, FileCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface Material {
  id: string;
  title: string;
  status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage: string | null;
  pageCount: number;
  createdAt: string;
}

export const ProjectMaterialsPage: React.FC = () => {
  const { project } = useProject();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMaterials = async () => {
    if (!project) return;
    try {
      const res = await apiClient.get(`/projects/${project.id}/materials`);
      setMaterials(res.data.data);
    } catch (error) {
      console.error('Failed to load materials', error);
    }
  };

  useEffect(() => {
    fetchMaterials();
    // Poll for status updates if any materials are QUEUED or PROCESSING
    const interval = setInterval(() => {
      setMaterials(current => {
        const needsUpdate = current.some(m => m.status === 'QUEUED' || m.status === 'PROCESSING');
        if (needsUpdate) fetchMaterials();
        return current;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [project]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are supported.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace('.pdf', ''));

    setIsUploading(true);
    try {
      await apiClient.post(`/projects/${project.id}/materials/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchMaterials();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY': return <span className="badge badge-ready"><FileCheck size={14} /> Ready</span>;
      case 'PROCESSING': return <span className="badge badge-queued"><RefreshCw size={14} className="animate-pulse-glow" /> Processing</span>;
      case 'QUEUED': return <span className="badge badge-queued">Queued</span>;
      case 'FAILED': return <span className="badge badge-failed"><AlertCircle size={14} /> Failed</span>;
      default: return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Learning Materials</h1>
          <p style={{ color: 'var(--text-muted)' }}>Upload PDFs for the AI Tutor to analyze and reference.</p>
        </div>
      </div>

      <div 
        className="glass-panel" 
        style={{ 
          padding: '3rem', 
          textAlign: 'center', 
          borderStyle: 'dashed', 
          borderColor: 'var(--border-active)',
          marginBottom: '2rem',
          cursor: isUploading ? 'not-allowed' : 'pointer'
        }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <UploadCloud size={48} style={{ color: '#6366f1', marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          {isUploading ? 'Uploading...' : 'Click or drag PDF to upload'}
        </h3>
        <p style={{ color: 'var(--text-muted)' }}>Maximum file size: 10MB</p>
        <input 
          type="file" 
          accept="application/pdf" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Uploaded Materials</h2>
      
      {materials.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No materials uploaded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {materials.map(material => (
            <div key={material.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <File size={24} style={{ color: 'var(--text-dim)' }} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{material.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Added {new Date(material.createdAt).toLocaleDateString()}
                    {material.pageCount > 0 && ` • ${material.pageCount} pages`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {getStatusBadge(material.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectMaterialsPage;
