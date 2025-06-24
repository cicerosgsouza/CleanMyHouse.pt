import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, isFetched } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user,
    isLoading: isLoading && !isFetched,
    isAuthenticated: !!user,
  };
}
