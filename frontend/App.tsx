import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { redirect } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from 'wagmi'
import { WalletProvider } from "@/contexts/wallet-context";
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
import OnboardingStart from "@/pages/onboarding/Start";
import OnboardingKYC from "@/pages/onboarding/KYC";
import OnboardingQualification from "@/pages/onboarding/Qualification";
import OnboardingIdentity from "@/pages/onboarding/Identity";
import OnboardingESign from "@/pages/onboarding/ESign";
import Marketplace from "@/pages/marketplace/Marketplace";
import MarketplaceDetails from "@/pages/marketplace/MarketplaceDetails";
import Properties from "@/pages/properties/Properties";
import PropertyDetails from "@/pages/properties/PropertyDetails";
import AIInsights from "@/pages/ai-insights/AIInsights";
import PropertiesOverview from "@/pages/properties/PropertiesOverview";
import UserProfile from "@/pages/UserProfile";
import UserWallet from "@/pages/UserWallet";
import AddProperty from "@/pages/properties/AddProperty";
import UpdateProperty from "@/pages/properties/UpdateProperty";
import DeployToken from "@/pages/properties/DeployToken";

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
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/onboarding/start" element={<OnboardingStart />} />
        <Route path="/onboarding/kyc/:sessionId" element={<OnboardingKYC />} />
        <Route path="/onboarding/qualification/:sessionId" element={<OnboardingQualification />} />
        <Route path="/onboarding/identity/:sessionId" element={<OnboardingIdentity />} />
        <Route path="/onboarding/esign/:sessionId" element={<OnboardingESign />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/:id" element={<MarketplaceDetails />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/overview" element={<PropertiesOverview />} />
        <Route path="/properties/:id" element={<PropertyDetails />} />
        <Route path="/properties/new-property" element={<AddProperty />} />
        <Route path="/properties/:id/update-property" element={<UpdateProperty />} />
        <Route path="/properties/:id/deploy-token" element={<DeployToken />} />
        <Route path="/analytics" element={<AIInsights />} />
        <Route path="/wallet" element={<UserWallet />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <WalletProvider>
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
        </WalletProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

