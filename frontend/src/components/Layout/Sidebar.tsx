import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { LayoutDashboard, FileText, MessageSquare, BrainCircuit, Activity, TrendingUp } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const Sidebar: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading } = useProject();

  const navItems = [
    { name: 'Dashboard', path: `/projects/${projectId}`, icon: <LayoutDashboard size={20} />, exact: true },
    { name: 'Materials', path: `/projects/${projectId}/materials`, icon: <FileText size={20} /> },
    { name: 'AI Tutor', path: `/projects/${projectId}/tutor`, icon: <MessageSquare size={20} /> },
    { name: 'Adaptive Quiz', path: `/projects/${projectId}/quiz`, icon: <BrainCircuit size={20} /> },
    { name: 'Mastery & Growth', path: `/projects/${projectId}/growth`, icon: <TrendingUp size={20} /> },
    { name: 'Analytics', path: `/projects/${projectId}/analytics`, icon: <Activity size={20} /> },
  ];

  return (
    <aside style={{ 
      width: '260px', 
      background: 'rgba(18, 24, 38, 0.4)', 
      borderRight: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 65px)', // minus navbar
      position: 'sticky',
      top: '65px'
    }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
        {isLoading ? (
          <div className="animate-pulse-glow" style={{ height: '24px', background: 'var(--bg-glass)', borderRadius: '4px' }}></div>
        ) : (
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project?.name || 'Project Name'}
          </h2>
        )}
      </div>

      <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.exact}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(236, 72, 153, 0.1))' : 'transparent',
              border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
              textDecoration: 'none',
              fontWeight: isActive ? 600 : 500,
              transition: 'var(--transition)'
            })}
          >
            <div style={{ color: 'inherit' }}>{item.icon}</div>
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
