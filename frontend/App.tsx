import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { redirect } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from 'wagmi'
import { I18nProvider } from "./contexts/I18nContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ActiveThemeProvider } from "@/contexts/active-theme";
import { Toaster } from "@/components/ui/sonner"
import { wagmiConfig } from '@/lib/wagmi'
import Layout from "@/components/layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import SignUp from "@/pages/SignUp";
import Homepage from "@/pages/Homepage";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    throw redirect("/login");
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  // Wait for auth to resolve before rendering routes to avoid redirect flicker
  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<Homepage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <I18nProvider>
          <AuthProvider>
            <ActiveThemeProvider storageKey="vite-ui-theme">
              <Router>
                <AppRoutes />
              </Router>
              <Toaster />
            </ActiveThemeProvider>
          </AuthProvider>
        </I18nProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

