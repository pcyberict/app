import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Check if the error indicates the user is banned
  const isBanned = error && (error as any).status === 403 && (error as any).banned;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isBanned,
  };
}
