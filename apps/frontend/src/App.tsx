import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ApplyLoanPage } from './pages/ApplyLoanPage';
import { MyLoansPage } from './pages/MyLoansPage';
import { AdminLoansPage } from './pages/AdminLoansPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const HomeRedirect: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? '/admin' : '/my-loans'} replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Default root redirection */}
                <Route path="/" element={<HomeRedirect />} />

                {/* Customer Protected Routes */}
                <Route element={<ProtectedRoute requiredRole={UserRole.CUSTOMER} />}>
                  <Route path="/apply" element={<ApplyLoanPage />} />
                  <Route path="/my-loans" element={<MyLoansPage />} />
                </Route>

                {/* Admin Protected Routes */}
                <Route element={<ProtectedRoute requiredRole={UserRole.ADMIN} />}>
                  <Route path="/admin" element={<AdminLoansPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<HomeRedirect />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
