import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useParams } from 'react-router-dom';

interface Project {
  id: string;
  spaceId: string;
  name: string;
  description: string;
  learningGoal: string;
}

interface ProjectContextType {
  project: Project | null;
  isLoading: boolean;
  error: string | null;
  refreshProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode; projectId?: string }> = ({ 
  children, 
  projectId: explicitProjectId 
}) => {
  const params = useParams<{ projectId: string }>();
  const projectId = explicitProjectId || params.projectId;
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async () => {
    if (!projectId) {
      setProject(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/projects/${projectId}`);
      setProject(res.data.data.project); // Depending on your backend response structure
    } catch (err: any) {
      console.error('Failed to fetch project:', err);
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  return (
    <ProjectContext.Provider value={{ project, isLoading, error, refreshProject: fetchProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
