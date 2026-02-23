import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetch user orders with pagination
export function useUserOrders(firebaseUid, page = 1, limit = 10) {
  return useQuery({
    queryKey: ["userOrders", firebaseUid, page, limit],
    queryFn: async () => {
      if (!firebaseUid) return null;
      
      const response = await fetch(
        `/api/user/orders?firebaseUid=${firebaseUid}&page=${page}&limit=${limit}`
      );
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to load orders");
      }
      
      return data;
    },
    enabled: !!firebaseUid,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes - keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  });
}

// Fetch single order details
export function useOrderDetails(orderId, firebaseUid) {
  return useQuery({
    queryKey: ["orderDetails", orderId, firebaseUid],
    queryFn: async () => {
      if (!orderId || !firebaseUid) return null;
      
      const response = await fetch(
        `/api/user/order/${orderId}?firebaseUid=${firebaseUid}`
      );
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to load order details");
      }
      
      return data.order;
    },
    enabled: !!orderId && !!firebaseUid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Delete order mutation
export function useDeleteOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, firebaseUid }) => {
      const response = await fetch(
        `/api/user/order/${orderId}?firebaseUid=${firebaseUid}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to delete order");
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: ["userOrders", variables.firebaseUid] });
    },
  });
}

