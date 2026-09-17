import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Folder, 
  FileText, 
  BrainCircuit, 
  MessageSquare, 
  Activity, 
  HeartPulse, 
  ArrowLeft, 
  Shield, 
  RefreshCw,
  Menu,
  X
} from 'lucide-react';

export interface AdminLayoutContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
  lastRefreshed: Date;
  isRefreshing: boolean;
  setIsRefreshing: (val: boolean) => void;
}

export const AdminLayoutContext = React.createContext<AdminLayoutContextType>({
  refreshTrigger: 0,
  triggerRefresh: () => {},
  lastRefreshed: new Date(),
  isRefreshing: false,
  setIsRefreshing: () => {},
});

export const useAdmin = () => React.useContext(AdminLayoutContext);

export const AdminLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    setLastRefreshed(new Date());
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} />, exact: true },
    { name: 'Users', path: '/admin/users', icon: <Users size={18} /> },
    { name: 'Projects', path: '/admin/projects', icon: <Folder size={18} /> },
    { name: 'Materials', path: '/admin/materials', icon: <FileText size={18} /> },
    { name: 'Quizzes', path: '/admin/quizzes', icon: <BrainCircuit size={18} /> },
    { name: 'AI Tutor', path: '/admin/tutor', icon: <MessageSquare size={18} /> },
    { name: 'Activity', path: '/admin/activity', icon: <Activity size={18} /> },
    { name: 'System Health', path: '/admin/health', icon: <HeartPulse size={18} /> },
  ];

  const getPageTitle = () => {
    const p = location.pathname;
    if (p === '/admin') return 'Dashboard Overview';
    if (p.startsWith('/admin/users')) return 'User Management';
    if (p.startsWith('/admin/projects')) return 'Project Monitoring';
    if (p.startsWith('/admin/materials')) return 'Material Processing';
    if (p.startsWith('/admin/quizzes')) return 'Quiz Assessments';
    if (p.startsWith('/admin/tutor')) return 'AI Tutor Analytics';
    if (p.startsWith('/admin/activity')) return 'Activity Audit Log';
    if (p.startsWith('/admin/health')) return 'System Diagnostics';
    return 'Admin Console';
  };

  return (
    <AdminLayoutContext.Provider
      value={{
        refreshTrigger,
        triggerRefresh: handleRefresh,
        lastRefreshed,
        isRefreshing,
        setIsRefreshing,
      }}
    >
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 65px)', background: 'var(--bg-dark)' }}>
        {/* Admin Sidebar */}
        <aside
          style={{
            width: '260px',
            background: 'rgba(15, 20, 32, 0.75)',
            backdropFilter: 'blur(16px)',
            borderRight: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: '65px',
            height: 'calc(100vh - 65px)',
            zIndex: 40,
            transition: 'transform 0.3s ease',
          }}
          className={`admin-sidebar ${isMobileOpen ? 'open' : ''}`}
        >
          {/* Header section in sidebar */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(236, 72, 153, 0.2))',
                color: '#f59e0b',
                padding: '0.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.02em' }}>
                  Admin Console
                </h2>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ● Operational
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="btn btn-secondary mobile-only"
              style={{ display: 'none', padding: '0.4rem', border: 'none' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav items */}
          <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, overflowY: 'auto' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.exact}
                onClick={() => setIsMobileOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(236, 72, 153, 0.12))'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                  transition: 'var(--transition)',
                })}
              >
                <div style={{ color: 'inherit' }}>{item.icon}</div>
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Footer of sidebar: link back to student app */}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => navigate('/spaces')}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.85rem' }}
            >
              <ArrowLeft size={16} /> Student Spaces
            </button>
            <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Logged in as {user?.email}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Admin Header Bar */}
          <header
            style={{
              height: '60px',
              borderBottom: '1px solid var(--border-glass)',
              background: 'rgba(11, 15, 25, 0.6)',
              backdropFilter: 'blur(12px)',
              padding: '0 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: '65px',
              zIndex: 30,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setIsMobileOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', border: 'none' }}
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {getPageTitle()}
                </h1>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Updated: {lastRefreshed.toLocaleTimeString()}
              </span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn btn-secondary"
                title="Refetch real database values"
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <RefreshCw
                  size={14}
                  style={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </header>

          {/* Admin Page Content */}
          <main style={{ flex: 1, padding: '2rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            top: 65px !important;
            bottom: 0 !important;
            left: 0 !important;
            transform: translateX(-100%);
          }
          .admin-sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </AdminLayoutContext.Provider>
  );
};

export default AdminLayout;
