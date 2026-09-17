import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SpacesPage from './pages/SpacesPage';
import SpaceDetailPage from './pages/SpaceDetailPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import ProjectMaterialsPage from './pages/ProjectMaterialsPage';
import ProjectTutorPage from './pages/ProjectTutorPage';
import ProjectQuizPage from './pages/ProjectQuizPage';
import ProjectGrowthPage from './pages/ProjectGrowthPage';
import ProjectAnalyticsPage from './pages/ProjectAnalyticsPage';

// Admin imports
import AdminRoute from './components/Admin/AdminRoute';
import AdminLayout from './components/Layout/AdminLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
import AdminMaterialsPage from './pages/admin/AdminMaterialsPage';
import AdminQuizzesPage from './pages/admin/AdminQuizzesPage';
import AdminTutorPage from './pages/admin/AdminTutorPage';
import AdminActivityPage from './pages/admin/AdminActivityPage';
import AdminHealthPage from './pages/admin/AdminHealthPage';

import Navbar from './components/Layout/Navbar';
import ProjectLayout from './components/Layout/ProjectLayout';

const Placeholder = ({ title }: { title: string }) => (
  <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
      <h1
        className="animate-fade-in"
        style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {title}
      </h1>
      <p style={{ color: 'var(--text-muted)' }}>Page under construction</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/spaces" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Student Routes */}
        <Route
          path="/spaces"
          element={
            <ProtectedRoute>
              <SpacesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/spaces/:spaceId"
          element={
            <ProtectedRoute>
              <SpaceDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Project Routes */}
        <Route
          path="/projects/:projectId/*"
          element={
            <ProtectedRoute>
              <ProjectProvider>
                <ProjectLayout>
                  <Routes>
                    <Route path="" element={<ProjectDashboardPage />} />
                    <Route path="materials" element={<ProjectMaterialsPage />} />
                    <Route path="tutor" element={<ProjectTutorPage />} />
                    <Route path="quiz" element={<ProjectQuizPage />} />
                    <Route path="growth" element={<ProjectGrowthPage />} />
                    <Route path="analytics" element={<ProjectAnalyticsPage />} />
                  </Routes>
                </ProjectLayout>
              </ProjectProvider>
            </ProtectedRoute>
          }
        />

        {/* Secure Admin Section with Layout & Sub-routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="projects" element={<AdminProjectsPage />} />
          <Route path="materials" element={<AdminMaterialsPage />} />
          <Route path="quizzes" element={<AdminQuizzesPage />} />
          <Route path="tutor" element={<AdminTutorPage />} />
          <Route path="activity" element={<AdminActivityPage />} />
          <Route path="health" element={<AdminHealthPage />} />
        </Route>

        <Route path="*" element={<Placeholder title="404 Not Found" />} />
      </Routes>
    </>
  );
};

export default App;
