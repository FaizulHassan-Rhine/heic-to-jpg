import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetch admin stats
export function useAdminStats() {
  return useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats", {
        credentials: "include",
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to load statistics");
      }
      
      return data.stats;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Fetch admin users
export function useAdminUsers(page = 1, limit = 20, search = "") {
  return useQuery({
    queryKey: ["adminUsers", page, limit, search],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to load users");
      }
      
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Fetch admin orders
export function useAdminOrders(page = 1, limit = 10, search = "", toolType = "", status = "") {
  return useQuery({
    queryKey: ["adminOrders", page, limit, search, toolType, status],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/orders?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&toolType=${toolType}&status=${status}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to load orders");
      }
      
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Fetch admin settings
export function useAdminSettings() {
  return useQuery({
    queryKey: ["adminSettings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/settings", {
        credentials: "include",
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to load settings");
      }
      
      return data.settings;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Update admin settings mutation
export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings) => {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to save settings");
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate both admin and public settings
      queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// Update admin features mutation
export function useUpdateAdminFeatures() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (features) => {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ features }),
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to save features");
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate both admin and public settings
      queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

