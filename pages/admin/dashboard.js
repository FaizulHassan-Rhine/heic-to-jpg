import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Users, Mail, Activity, TrendingUp, LogOut, Search, Download, Package, Clock, Eye, FileImage, FileVideo, FileAudio, FileText, Image, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPagination, setOrdersPagination] = useState({});
  const [ordersSearchTerm, setOrdersSearchTerm] = useState("");
  const [viewingOrder, setViewingOrder] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check admin authentication
    if (typeof window !== "undefined") {
      const isAuthenticated = sessionStorage.getItem("adminAuthenticated");
      if (isAuthenticated !== "true") {
        router.push("/admin/login");
        return;
      }
    }
    fetchStats();
    fetchUsers();
    fetchOrders();
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [ordersPage, ordersSearchTerm]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `/api/admin/users?page=${currentPage}&limit=20&search=${encodeURIComponent(searchTerm)}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    }
  };

  const handleLogout = () => {
    document.cookie = "adminAuth=; path=/; max-age=0";
    sessionStorage.removeItem("adminAuthenticated");
    sessionStorage.removeItem("adminEmail");
    router.push("/admin/login");
    toast.success("Logged out successfully");
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await fetch(
        `/api/admin/orders?page=${ordersPage}&limit=10&search=${encodeURIComponent(ordersSearchTerm)}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        console.log(`Fetched ${data.orders.length} orders, total: ${data.pagination.total}`);
        console.log("Orders sample:", data.orders.slice(0, 2));
        setOrders(data.orders);
        setOrdersPagination(data.pagination);
      } else {
        console.error("Failed to fetch orders:", data.error);
        toast.error(data.error || "Failed to load orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  const downloadFile = (file, fileIndex, orderId) => {
    if (!file.outputFileData) {
      toast.error("File data not available");
      return;
    }

    try {
      // Convert base64 to blob
      let base64Data = file.outputFileData;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.outputName || `output-${fileIndex}.${file.outputFormat || 'jpg'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("File downloaded");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (format) => {
    if (!format) return FileText;
    const ext = format.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return FileImage;
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return FileVideo;
    if (['mp3', 'wav', 'ogg'].includes(ext)) return FileAudio;
    return FileText;
  };

  const deleteFile = async (orderId, fileIndex) => {
    if (!confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/delete-file`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ fileIndex }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "File deleted successfully");
        
        // Refresh orders list
        await fetchOrders();
        
        // If order was deleted, close the view
        if (data.orderDeleted) {
          setViewingOrder(null);
        } else {
          // Update viewing order if it's the same order
          if (viewingOrder?.id === orderId) {
            const updatedResponse = await fetch(
              `/api/admin/orders?page=${ordersPage}&limit=10&search=${encodeURIComponent(ordersSearchTerm)}`,
              { credentials: "include" }
            );
            const updatedData = await updatedResponse.json();
            if (updatedData.success) {
              const updatedOrder = updatedData.orders.find(o => o.id === orderId);
              if (updatedOrder && updatedOrder.files && updatedOrder.files.length > 0) {
                setViewingOrder(updatedOrder);
              } else {
                setViewingOrder(null);
              }
            }
          }
        }
      } else {
        toast.error(data.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ["Email", "Display Name", "Provider", "Total Conversions", "Total Compressions", "Total Tools Used", "Created At", "Last Active"],
      ...users.map((user) => [
        user.email,
        user.displayName,
        user.provider,
        user.totalConversions,
        user.totalCompressions,
        user.totalToolsUsed,
        new Date(user.createdAt).toLocaleDateString(),
        new Date(user.lastActive).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Users exported successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">ConvertMastery Admin Panel</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {stats?.totalUsers || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users (30d)</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {stats?.activeUsers || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Conversions</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {stats?.totalConversions || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Compressions</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {stats?.totalCompressions || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {stats?.totalOrders || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Orders (24h)</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {stats?.ordersLast24Hours || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Orders</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {stats?.conversionOrders || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compression Orders</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {stats?.compressionOrders || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gray-600">New Users (7d)</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">
                {stats?.newUsersLastWeek || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gray-600">Google Sign-ins</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">
                {stats?.googleUsers || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gray-600">Email Sign-ups</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">
                {stats?.emailUsers || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Users</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button onClick={exportUsers} variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Provider</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Conversions</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Compressions</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tools Used</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {user.photoURL && (
                              <img
                                src={user.photoURL}
                                alt={user.displayName}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <span className="text-sm">{user.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">{user.displayName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              user.provider === "google"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {user.provider}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{user.totalConversions}</td>
                        <td className="py-3 px-4 text-sm">{user.totalCompressions}</td>
                        <td className="py-3 px-4 text-sm">{user.totalToolsUsed}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(user.lastActive).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * 20) + 1} to{" "}
                  {Math.min(currentPage * 20, pagination.total)} of {pagination.total} users
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders with Files */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Orders & Files</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={ordersSearchTerm}
                    onChange={(e) => {
                      setOrdersSearchTerm(e.target.value);
                      setOrdersPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading orders...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No orders found
                  </div>
                ) : (
                  orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">{order.toolName}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.toolType === "conversion" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {order.toolType}
                          </span>
                          {order.isAnonymous && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Anonymous
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {order.userEmail || "Anonymous User"}
                          {order.sessionId && (
                            <span className="text-xs text-gray-400 ml-2">({order.sessionId})</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.createdAt).toLocaleString()} • {order.fileCount} file{order.fileCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingOrder(viewingOrder?.id === order.id ? null : order)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        {viewingOrder?.id === order.id ? "Hide Files" : "View Files"}
                      </Button>
                    </div>

                    {viewingOrder?.id === order.id && order.files && order.files.length > 0 && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        {order.files.map((file, fileIndex) => {
                          const InputIcon = getFileIcon(file.inputFormat);
                          const OutputIcon = getFileIcon(file.outputFormat);
                          return (
                            <div key={fileIndex} className="bg-white border rounded-lg p-4 relative">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteFile(order.id, fileIndex)}
                                className="absolute top-2 right-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete this file"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <div className="grid grid-cols-2 gap-4">
                                {/* Input File */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <InputIcon className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm font-semibold text-gray-700">Input File</span>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-600 truncate">{file.inputName}</p>
                                    {file.inputThumbnail && (
                                      <div className="border rounded overflow-hidden bg-gray-50 flex items-center justify-center" style={{ minHeight: '120px', maxHeight: '200px' }}>
                                        <img
                                          src={file.inputThumbnail.startsWith('data:') 
                                            ? file.inputThumbnail 
                                            : `data:image/jpeg;base64,${file.inputThumbnail}`}
                                          alt="Input preview"
                                          className="max-w-full h-auto object-contain"
                                          style={{ maxHeight: '200px' }}
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    )}
                                    {file.inputSize && (
                                      <p className="text-xs text-gray-500">Size: {formatSize(file.inputSize)}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Output File */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <OutputIcon className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm font-semibold text-gray-700">Output File</span>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-600 truncate">{file.outputName}</p>
                                    {file.outputThumbnail && (
                                      <div className="border rounded overflow-hidden bg-gray-50 flex items-center justify-center" style={{ minHeight: '120px', maxHeight: '200px' }}>
                                        <img
                                          src={file.outputThumbnail.startsWith('data:') 
                                            ? file.outputThumbnail 
                                            : `data:image/jpeg;base64,${file.outputThumbnail}`}
                                          alt="Output preview"
                                          className="max-w-full h-auto object-contain"
                                          style={{ maxHeight: '200px' }}
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    )}
                                    {file.outputSize && (
                                      <p className="text-xs text-gray-500">Size: {formatSize(file.outputSize)}</p>
                                    )}
                                    {file.hasOutputFileData && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadFile(file, fileIndex, order.id)}
                                        className="w-full mt-2 flex items-center gap-2"
                                      >
                                        <Download className="w-3 h-3" />
                                        Download Output
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Orders Pagination */}
              {ordersPagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600">
                    Showing {((ordersPage - 1) * 10) + 1} to{" "}
                    {Math.min(ordersPage * 10, ordersPagination.total)} of {ordersPagination.total} orders
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                      disabled={ordersPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOrdersPage((p) => Math.min(ordersPagination.totalPages, p + 1))}
                      disabled={ordersPage === ordersPagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
