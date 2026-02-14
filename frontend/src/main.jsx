import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ServiceBoardPage from './pages/ServiceBoardPage';
import AccountsPage from './pages/AccountsPage';
import AccountCreatePage from './pages/AccountCreatePage';
import AccountDetailPage from './pages/AccountDetailPage';
import PoliciesPage from './pages/PoliciesPage';
import PolicyDetailPage from './pages/PolicyDetailPage';
import PipelinePage from './pages/PipelinePage';
import ProspectCreatePage from './pages/ProspectCreatePage';
import ProspectDetailPage from './pages/ProspectDetailPage';
import SalesLogPage from './pages/SalesLogPage';
import CarriersPage from './pages/CarriersPage';
import TasksPage from './pages/TasksPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sentinel-500" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/service-board" element={<ServiceBoardPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/accounts/new" element={<AccountCreatePage />} />
              <Route path="/accounts/:id" element={<AccountDetailPage />} />
              <Route path="/policies" element={<PoliciesPage />} />
              <Route path="/policies/:id" element={<PolicyDetailPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/prospects/new" element={<ProspectCreatePage />} />
              <Route path="/prospects/:id" element={<ProspectDetailPage />} />
              <Route path="/sales-log" element={<SalesLogPage />} />
              <Route path="/carriers" element={<CarriersPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
