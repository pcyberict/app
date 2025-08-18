import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import WatchQueue from "@/pages/watch-queue";
import SubmitVideo from "@/pages/submit-video";
import Account from "@/pages/account";
import BuyCoins from "@/pages/buy-coins";
import Admin from "@/pages/admin";
import AdminLogin from "@/pages/AdminLogin";
import Checkout from "@/pages/checkout";
import Settings from "@/pages/settings";
import ImprovedStreamingPage from "@/pages/streaming-improved";
import StreamingNative from "@/pages/streaming-native";
import Layout from "@/components/Layout";
import BanLockout from "@/components/BanLockout";
import MaintenancePage from "@/pages/maintenance";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

function AdminWithProtection() {
  const [, setLocation] = useLocation();

  const { data: authStatus, isLoading: isCheckingAuth } = useQuery({
    queryKey: ["/api/admin/auth-status"],
    retry: false,
  });

  useEffect(() => {
    if (!isCheckingAuth && !authStatus?.isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [authStatus, isCheckingAuth, setLocation]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Checking admin access...
          </p>
        </div>
      </div>
    );
  }

  if (!authStatus?.isAuthenticated) {
    return null; // Will redirect to login
  }

  return <Admin />;
}

function Router() {
  const { isAuthenticated, isLoading, isBanned } = useAuth();

  // Check maintenance mode status
  const { data: maintenanceConfig, isLoading: isCheckingMaintenance } =
    useQuery({
      queryKey: ["/api/website-config/maintenance"],
      refetchInterval: 30000, // Check every 30 seconds
    });

  // Check if user is admin
  const { data: adminAuthStatus } = useQuery({
    queryKey: ["/api/admin/auth-status"],
    retry: false,
  });

  const isAdmin = adminAuthStatus?.isAuthenticated || false;
  const isMaintenanceMode = maintenanceConfig?.maintenanceMode || false;

  // Show ban lockout if user is banned
  if (isBanned) {
    return <BanLockout />;
  }

  // Show maintenance page if maintenance mode is enabled and user is not admin
  if (isMaintenanceMode && !isAdmin && !isCheckingMaintenance) {
    return (
      <Switch>
        {/* Admin routes still accessible during maintenance */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={AdminWithProtection} />

        {/* All other routes redirect to maintenance */}
        <Route component={MaintenancePage} />
      </Switch>
    );
  }

  return (
    <Switch>
      {/* Admin routes - accessible without regular authentication */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminWithProtection} />

      {/* Maintenance route for testing */}
      <Route path="/maintenance" component={MaintenancePage} />

      {isLoading || !isAuthenticated ? (
        <Route path="/" component={AuthPage} />
      ) : (
        <>
          <Route path="/streaming" component={StreamingNative} />
          <Route path="/streaming-improved" component={ImprovedStreamingPage} />
          <Layout>
            <Route path="/" component={Dashboard} />
            <Route path="/watch-queue" component={WatchQueue} />
            <Route path="/submit-video" component={SubmitVideo} />
            <Route path="/account" component={Account} />
            <Route path="/buy-coins" component={BuyCoins} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/settings" component={Settings} />
          </Layout>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
