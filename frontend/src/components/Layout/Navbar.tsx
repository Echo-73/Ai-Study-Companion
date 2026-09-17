import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav style={{ 
      background: 'rgba(11, 15, 25, 0.8)', 
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-glass)',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/spaces" style={{ fontSize: '1.25rem', fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
          AI Study Companion
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {user.role === 'ADMIN' && (
          <Link to="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
            Admin Console
          </Link>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.4rem', borderRadius: '50%' }}>
            <UserIcon size={16} />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user.name}</span>
        </div>
        <button 
          onClick={handleLogout}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', transition: 'var(--transition)' }}
          onMouseOver={(e) => e.currentTarget.style.color = '#f87171'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
