import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: '1rem',
        color: 'var(--text-muted)'
      }}>
        <div className="animate-pulse-glow" style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
        }} />
        <p style={{ fontSize: '1rem', fontWeight: 500 }}>Verifying administrator credentials...</p>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Normal user attempting to access admin route -> show strict 403 screen
  if (user.role !== 'ADMIN') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div className="glass-panel" style={{
          maxWidth: '520px',
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          background: 'rgba(244, 63, 94, 0.04)'
        }}>
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            color: '#f87171',
            padding: '1.25rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={48} />
          </div>

          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f87171', marginBottom: '0.5rem' }}>
              403 Forbidden
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Access Denied. Your account (<strong>{user.email}</strong>) does not have administrator privileges.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => window.location.href = '/spaces'}
              className="btn btn-primary"
            >
              Return to Student Spaces
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
