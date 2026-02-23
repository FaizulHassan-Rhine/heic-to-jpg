import { useQuery } from "@tanstack/react-query";

// Fetch user data from MongoDB
export function useUserData(firebaseUid) {
  return useQuery({
    queryKey: ["userData", firebaseUid],
    queryFn: async () => {
      if (!firebaseUid) return null;
      
      const response = await fetch(`/api/auth/get-user?firebaseUid=${firebaseUid}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to load user data");
      }
      
      return data.user;
    },
    enabled: !!firebaseUid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

