import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export function useBalance() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: balance, ...rest } = useQuery({
    queryKey: ["/api/account/balance"],
    enabled: isAuthenticated,
    refetchInterval: 2000, // Refresh every 2 seconds for ultra-responsive updates
    staleTime: 0, // Always fetch fresh data for accurate balance
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Function to refresh balance immediately
  const refreshBalance = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/account/balance"] });
  };

  // Listen for balance update events (fallback for non-WebSocket scenarios)
  useEffect(() => {
    const handleBalanceUpdate = () => {
      refreshBalance();
    };

    // Listen for custom balance update events
    window.addEventListener('balanceUpdate', handleBalanceUpdate);

    return () => {
      window.removeEventListener('balanceUpdate', handleBalanceUpdate);
    };
  }, [refreshBalance]);

  return {
    balance: balance?.balance || 0,
    refreshBalance,
    ...rest
  };
}

// Helper function to trigger balance updates across the app
export function triggerBalanceUpdate() {
  window.dispatchEvent(new CustomEvent('balanceUpdate'));
}