import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { 
  Users, Mail, Activity, TrendingUp, LogOut, Search, Download, Package, 
  Clock, Eye, FileImage, FileVideo, FileAudio, FileText, Image, Trash2,
  LayoutDashboard, BarChart3, Menu, X, Settings as SettingsIcon, Save
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const SIDEBAR_ITEMS = [
  { id: "stats", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "orders", label: "Orders", icon: Package },
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "features", label: "Features", icon: SettingsIcon, href: "/admin/features" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("stats");
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  // Local state for input values (as strings to allow clearing)
  const [inputValues, setInputValues] = useState({});
  const router = useRouter();
  const queryClient = useQueryClient();

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
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [currentPage, searchTerm, activeTab]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    }
  }, [ordersPage, ordersSearchTerm, activeTab]);

  useEffect(() => {
    if (activeTab === "settings") {
      fetchSettings();
    }
  }, [activeTab]);

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
      console.log("Orders API response:", data);
      if (data.success) {
        console.log(`Fetched ${data.orders?.length || 0} orders, total: ${data.pagination?.total || 0}`);
        console.log("Orders array:", data.orders);
        setOrders(data.orders || []);
        setOrdersPagination(data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 });
      } else {
        console.error("Failed to fetch orders:", data.error);
        toast.error(data.error || "Failed to load orders");
        setOrders([]);
        setOrdersPagination({ total: 0, page: 1, limit: 10, totalPages: 0 });
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
      const response = await fetch(`/api/admin/orders/${orderId}/delete-file?fileIndex=${fileIndex}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
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

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await fetch("/api/admin/settings", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
        // Initialize input values from settings (convert bytes to MB)
        setInputValues({
          imageMaxSize: (data.settings.imageMaxSize / (1024 * 1024)).toString(),
          imageMaxFiles: data.settings.imageMaxFiles.toString(),
          documentMaxSize: (data.settings.documentMaxSize / (1024 * 1024)).toString(),
          documentMaxFiles: data.settings.documentMaxFiles.toString(),
          pdfMaxSize: (data.settings.pdfMaxSize / (1024 * 1024)).toString(),
          pdfMaxFiles: data.settings.pdfMaxFiles.toString(),
          videoMaxSize: (data.settings.videoMaxSize / (1024 * 1024)).toString(),
          videoMaxFiles: data.settings.videoMaxFiles.toString(),
          audioMaxSize: (data.settings.audioMaxSize / (1024 * 1024)).toString(),
          audioMaxFiles: data.settings.audioMaxFiles.toString(),
          generalMaxSize: (data.settings.generalMaxSize / (1024 * 1024)).toString(),
          generalMaxFiles: data.settings.generalMaxFiles.toString(),
        });
      } else {
        toast.error("Failed to load settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      // Build settings object from current input values to ensure we send the latest values
      // Convert MB values from inputValues to bytes for the API
      // ALWAYS use inputValues if they exist, otherwise fall back to current settings
      const imageMaxSizeMB = inputValues.imageMaxSize !== undefined && inputValues.imageMaxSize !== "" 
        ? parseFloat(inputValues.imageMaxSize) 
        : (settings.imageMaxSize / (1024 * 1024));
      const imageMaxSizeBytes = imageMaxSizeMB * 1024 * 1024;

      const settingsToSave = {
        imageMaxSize: imageMaxSizeBytes,
        imageMaxFiles: inputValues.imageMaxFiles !== undefined && inputValues.imageMaxFiles !== ""
          ? parseInt(inputValues.imageMaxFiles)
          : settings.imageMaxFiles,
        documentMaxSize: inputValues.documentMaxSize !== undefined && inputValues.documentMaxSize !== ""
          ? parseFloat(inputValues.documentMaxSize) * 1024 * 1024
          : settings.documentMaxSize,
        documentMaxFiles: inputValues.documentMaxFiles !== undefined && inputValues.documentMaxFiles !== ""
          ? parseInt(inputValues.documentMaxFiles)
          : settings.documentMaxFiles,
        pdfMaxSize: inputValues.pdfMaxSize !== undefined && inputValues.pdfMaxSize !== ""
          ? parseFloat(inputValues.pdfMaxSize) * 1024 * 1024
          : settings.pdfMaxSize,
        pdfMaxFiles: inputValues.pdfMaxFiles !== undefined && inputValues.pdfMaxFiles !== ""
          ? parseInt(inputValues.pdfMaxFiles)
          : settings.pdfMaxFiles,
        videoMaxSize: inputValues.videoMaxSize !== undefined && inputValues.videoMaxSize !== ""
          ? parseFloat(inputValues.videoMaxSize) * 1024 * 1024
          : settings.videoMaxSize,
        videoMaxFiles: inputValues.videoMaxFiles !== undefined && inputValues.videoMaxFiles !== ""
          ? parseInt(inputValues.videoMaxFiles)
          : settings.videoMaxFiles,
        audioMaxSize: inputValues.audioMaxSize !== undefined && inputValues.audioMaxSize !== ""
          ? parseFloat(inputValues.audioMaxSize) * 1024 * 1024
          : settings.audioMaxSize,
        audioMaxFiles: inputValues.audioMaxFiles !== undefined && inputValues.audioMaxFiles !== ""
          ? parseInt(inputValues.audioMaxFiles)
          : settings.audioMaxFiles,
        generalMaxSize: inputValues.generalMaxSize !== undefined && inputValues.generalMaxSize !== ""
          ? parseFloat(inputValues.generalMaxSize) * 1024 * 1024
          : settings.generalMaxSize,
        generalMaxFiles: inputValues.generalMaxFiles !== undefined && inputValues.generalMaxFiles !== ""
          ? parseInt(inputValues.generalMaxFiles)
          : settings.generalMaxFiles,
        // Include features if they exist
        ...(settings.features && { features: settings.features }),
      };

      console.log("Saving settings:", {
        inputValue: inputValues.imageMaxSize,
        inputValueMB: imageMaxSizeMB,
        calculatedBytes: imageMaxSizeBytes,
        calculatedMB: imageMaxSizeBytes / (1024 * 1024),
        sendingToAPI: settingsToSave.imageMaxSize,
      });

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(settingsToSave),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Settings saved successfully");
        setSettings(data.settings);
        // Update input values to match the saved settings (convert bytes to MB)
        setInputValues({
          imageMaxSize: (data.settings.imageMaxSize / (1024 * 1024)).toString(),
          imageMaxFiles: data.settings.imageMaxFiles.toString(),
          documentMaxSize: (data.settings.documentMaxSize / (1024 * 1024)).toString(),
          documentMaxFiles: data.settings.documentMaxFiles.toString(),
          pdfMaxSize: (data.settings.pdfMaxSize / (1024 * 1024)).toString(),
          pdfMaxFiles: data.settings.pdfMaxFiles.toString(),
          videoMaxSize: (data.settings.videoMaxSize / (1024 * 1024)).toString(),
          videoMaxFiles: data.settings.videoMaxFiles.toString(),
          audioMaxSize: (data.settings.audioMaxSize / (1024 * 1024)).toString(),
          audioMaxFiles: data.settings.audioMaxFiles.toString(),
          generalMaxSize: (data.settings.generalMaxSize / (1024 * 1024)).toString(),
          generalMaxFiles: data.settings.generalMaxFiles.toString(),
        });
        // Clear cache so all pages get updated settings immediately
        queryClient.invalidateQueries({ queryKey: ["settings"] });
        queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
      } else {
        toast.error(data.error || data.details || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error?.message ? `Failed to save settings: ${error.message}` : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white border-r shadow-sm transition-all duration-300 z-40",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="flex flex-col h-screen">
          {/* Sidebar Header */}
          <div className="p-4 border-b flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h2 className="text-lg font-bold text-foreground">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">ConvertMastery</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              // If item has href, use Link, otherwise use button for tabs
              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      "text-foreground hover:bg-muted/40"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                  </Link>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    activeTab === item.id
                      ? "bg-brand-sky/50 text-brand-navy font-semibold"
                      : "text-foreground hover:bg-muted/40"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm">{item.label}</span>}
                </button>
              );
            })}
          </nav>

        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {SIDEBAR_ITEMS.find((item) => item.id === activeTab)?.label || "Dashboard"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === "stats" && "Overview of your platform statistics"}
                  {activeTab === "users" && "Manage and view all registered users"}
                  {activeTab === "orders" && "View and manage all orders and files"}
                {activeTab === "settings" && "Configure file upload limits and system settings"}
                </p>
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
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Tab */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              {/* Main Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                        <p className="text-3xl font-bold text-foreground mt-2">
                          {stats?.totalUsers || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-brand-sky rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Users (30d)</p>
                        <p className="text-3xl font-bold text-foreground mt-2">
                          {stats?.activeUsers || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-brand-sky rounded-full flex items-center justify-center">
                        <Activity className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Conversions</p>
                        <p className="text-3xl font-bold text-foreground mt-2">
                          {stats?.totalConversions || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-brand-sky/60 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Compressions</p>
                        <p className="text-3xl font-bold text-foreground mt-2">
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                        <p className="text-3xl font-bold text-foreground mt-2">
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
                        <p className="text-sm font-medium text-muted-foreground">Orders (24h)</p>
                        <p className="text-3xl font-bold text-foreground mt-2">
                          {stats?.ordersLast24Hours || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-brand-sky rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Conversion Orders</p>
                        <p className="text-3xl font-bold text-foreground mt-2">
                          {stats?.conversionOrders || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-brand-sky rounded-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Compression Orders</p>
                        <p className="text-3xl font-bold text-foreground mt-2">
                          {stats?.compressionOrders || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-brand-sky/60 rounded-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground">New Users (7d)</p>
                    <p className="text-2xl font-bold text-foreground mt-2">
                      {stats?.newUsersLastWeek || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground">Google Sign-ins</p>
                    <p className="text-2xl font-bold text-foreground mt-2">
                      {stats?.googleUsers || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground">Email Sign-ups</p>
                    <p className="text-2xl font-bold text-foreground mt-2">
                      {stats?.emailUsers || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Users</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
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
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Provider</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Conversions</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Compressions</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Tools Used</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Created</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-8 text-muted-foreground">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-muted/40">
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
                                    ? "bg-brand-sky text-brand-navy"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                {user.provider}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">{user.totalConversions}</td>
                            <td className="py-3 px-4 text-sm">{user.totalCompressions}</td>
                            <td className="py-3 px-4 text-sm">{user.totalToolsUsed}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground">
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
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Orders & Files</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search orders..."
                        value={ordersSearchTerm}
                        onChange={(e) => {
                          setOrdersSearchTerm(e.target.value);
                          setOrdersPage(1);
                        }}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">Loading orders...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No orders found
                      </div>
                    ) : (
                      orders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4 hover:bg-muted/40">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">{order.toolName}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  order.toolType === "conversion" 
                                    ? "bg-brand-sky text-brand-navy" 
                                    : "bg-brand-sky text-brand-navy"
                                }`}>
                                  {order.toolType}
                                </span>
                                {order.isAnonymous && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                                    Anonymous
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {order.userEmail || "Anonymous User"}
                                {order.sessionId && (
                                  <span className="text-xs text-muted-foreground ml-2">({order.sessionId})</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
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
                                          <InputIcon className="w-4 h-4 text-muted-foreground" />
                                          <span className="text-sm font-semibold text-foreground">Input File</span>
                                        </div>
                                        <div className="space-y-2">
                                          <p className="text-xs text-muted-foreground truncate">{file.inputName}</p>
                                          {file.inputThumbnail && (
                                            <div className="border rounded overflow-hidden bg-muted/40 flex items-center justify-center" style={{ minHeight: '120px', maxHeight: '200px' }}>
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
                                            <p className="text-xs text-muted-foreground">Size: {formatSize(file.inputSize)}</p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Output File */}
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <OutputIcon className="w-4 h-4 text-muted-foreground" />
                                          <span className="text-sm font-semibold text-foreground">Output File</span>
                                        </div>
                                        <div className="space-y-2">
                                          <p className="text-xs text-muted-foreground truncate">{file.outputName}</p>
                                          {file.outputThumbnail && (
                                            <div className="border rounded overflow-hidden bg-muted/40 flex items-center justify-center" style={{ minHeight: '120px', maxHeight: '200px' }}>
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
                                            <p className="text-xs text-muted-foreground">Size: {formatSize(file.outputSize)}</p>
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
                        <p className="text-sm text-muted-foreground">
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
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>File Upload Settings</CardTitle>
                  <Button
                    onClick={saveSettings}
                    disabled={savingSettings || settingsLoading}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {savingSettings ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">Loading settings...</p>
                    </div>
                  </div>
                ) : settings ? (
                  <div className="space-y-8">
                    {/* Image Settings */}
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <FileImage className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Image Files</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum File Size (MB)
                          </label>
                          <input
                            type="number"
                            value={inputValues.imageMaxSize || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, imageMaxSize: value });
                              const mb = parseFloat(value);
                              if (!isNaN(mb) && mb > 0) {
                                setSettings({
                                  ...settings,
                                  imageMaxSize: mb * 1024 * 1024,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const mb = parseFloat(e.target.value);
                              if (isNaN(mb) || mb <= 0) {
                                // Reset to current setting if invalid
                                setInputValues({
                                  ...inputValues,
                                  imageMaxSize: (settings.imageMaxSize / (1024 * 1024)).toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="0.1"
                            step="0.1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Current: {formatSize(settings.imageMaxSize)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum Files Per Upload (Batch Limit)
                          </label>
                          <input
                            type="number"
                            value={inputValues.imageMaxFiles || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, imageMaxFiles: value });
                              const num = parseInt(value);
                              if (!isNaN(num) && num > 0) {
                                setSettings({
                                  ...settings,
                                  imageMaxFiles: num,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const num = parseInt(e.target.value);
                              if (isNaN(num) || num <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  imageMaxFiles: settings.imageMaxFiles.toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Users can upload up to {settings.imageMaxFiles} images at once
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Document Settings */}
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Document Files (DOC, DOCX, TXT)</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum File Size (MB)
                          </label>
                          <input
                            type="number"
                            value={inputValues.documentMaxSize || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, documentMaxSize: value });
                              const mb = parseFloat(value);
                              if (!isNaN(mb) && mb > 0) {
                                setSettings({
                                  ...settings,
                                  documentMaxSize: mb * 1024 * 1024,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const mb = parseFloat(e.target.value);
                              if (isNaN(mb) || mb <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  documentMaxSize: (settings.documentMaxSize / (1024 * 1024)).toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="0.1"
                            step="0.1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Current: {formatSize(settings.documentMaxSize)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum Files Per Upload (Batch Limit)
                          </label>
                          <input
                            type="number"
                            value={inputValues.documentMaxFiles || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, documentMaxFiles: value });
                              const num = parseInt(value);
                              if (!isNaN(num) && num > 0) {
                                setSettings({
                                  ...settings,
                                  documentMaxFiles: num,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const num = parseInt(e.target.value);
                              if (isNaN(num) || num <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  documentMaxFiles: settings.documentMaxFiles.toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Users can upload up to {settings.documentMaxFiles} documents at once
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PDF Settings */}
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-5 h-5 text-red-600" />
                        <h3 className="text-lg font-semibold text-foreground">PDF Files</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum File Size (MB)
                          </label>
                          <input
                            type="number"
                            value={inputValues.pdfMaxSize || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, pdfMaxSize: value });
                              const mb = parseFloat(value);
                              if (!isNaN(mb) && mb > 0) {
                                setSettings({
                                  ...settings,
                                  pdfMaxSize: mb * 1024 * 1024,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const mb = parseFloat(e.target.value);
                              if (isNaN(mb) || mb <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  pdfMaxSize: (settings.pdfMaxSize / (1024 * 1024)).toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="0.1"
                            step="0.1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Current: {formatSize(settings.pdfMaxSize)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum Files Per Upload (Batch Limit)
                          </label>
                          <input
                            type="number"
                            value={inputValues.pdfMaxFiles || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, pdfMaxFiles: value });
                              const num = parseInt(value);
                              if (!isNaN(num) && num > 0) {
                                setSettings({
                                  ...settings,
                                  pdfMaxFiles: num,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const num = parseInt(e.target.value);
                              if (isNaN(num) || num <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  pdfMaxFiles: settings.pdfMaxFiles.toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Users can upload up to {settings.pdfMaxFiles} PDF files at once
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Video Settings */}
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <FileVideo className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Video Files</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum File Size (MB)
                          </label>
                          <input
                            type="number"
                            value={inputValues.videoMaxSize || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, videoMaxSize: value });
                              const mb = parseFloat(value);
                              if (!isNaN(mb) && mb > 0) {
                                setSettings({
                                  ...settings,
                                  videoMaxSize: mb * 1024 * 1024,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const mb = parseFloat(e.target.value);
                              if (isNaN(mb) || mb <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  videoMaxSize: (settings.videoMaxSize / (1024 * 1024)).toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="0.1"
                            step="0.1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Current: {formatSize(settings.videoMaxSize)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum Files Per Upload (Batch Limit)
                          </label>
                          <input
                            type="number"
                            value={inputValues.videoMaxFiles || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, videoMaxFiles: value });
                              const num = parseInt(value);
                              if (!isNaN(num) && num > 0) {
                                setSettings({
                                  ...settings,
                                  videoMaxFiles: num,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const num = parseInt(e.target.value);
                              if (isNaN(num) || num <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  videoMaxFiles: settings.videoMaxFiles.toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Users can upload up to {settings.videoMaxFiles} videos at once
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Audio Settings */}
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <FileAudio className="w-5 h-5 text-pink-600" />
                        <h3 className="text-lg font-semibold text-foreground">Audio Files</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum File Size (MB)
                          </label>
                          <input
                            type="number"
                            value={inputValues.audioMaxSize || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, audioMaxSize: value });
                              const mb = parseFloat(value);
                              if (!isNaN(mb) && mb > 0) {
                                setSettings({
                                  ...settings,
                                  audioMaxSize: mb * 1024 * 1024,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const mb = parseFloat(e.target.value);
                              if (isNaN(mb) || mb <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  audioMaxSize: (settings.audioMaxSize / (1024 * 1024)).toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="0.1"
                            step="0.1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Current: {formatSize(settings.audioMaxSize)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum Files Per Upload (Batch Limit)
                          </label>
                          <input
                            type="number"
                            value={inputValues.audioMaxFiles || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, audioMaxFiles: value });
                              const num = parseInt(value);
                              if (!isNaN(num) && num > 0) {
                                setSettings({
                                  ...settings,
                                  audioMaxFiles: num,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const num = parseInt(e.target.value);
                              if (isNaN(num) || num <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  audioMaxFiles: settings.audioMaxFiles.toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Users can upload up to {settings.audioMaxFiles} audio files at once
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* General Settings */}
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <SettingsIcon className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold text-foreground">General Files (Other Types)</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum File Size (MB)
                          </label>
                          <input
                            type="number"
                            value={inputValues.generalMaxSize || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, generalMaxSize: value });
                              const mb = parseFloat(value);
                              if (!isNaN(mb) && mb > 0) {
                                setSettings({
                                  ...settings,
                                  generalMaxSize: mb * 1024 * 1024,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const mb = parseFloat(e.target.value);
                              if (isNaN(mb) || mb <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  generalMaxSize: (settings.generalMaxSize / (1024 * 1024)).toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="0.1"
                            step="0.1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Current: {formatSize(settings.generalMaxSize)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum Files Per Upload (Batch Limit)
                          </label>
                          <input
                            type="number"
                            value={inputValues.generalMaxFiles || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValues({ ...inputValues, generalMaxFiles: value });
                              const num = parseInt(value);
                              if (!isNaN(num) && num > 0) {
                                setSettings({
                                  ...settings,
                                  generalMaxFiles: num,
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const num = parseInt(e.target.value);
                              if (isNaN(num) || num <= 0) {
                                setInputValues({
                                  ...inputValues,
                                  generalMaxFiles: settings.generalMaxFiles.toString(),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-mid focus:border-transparent"
                            min="1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Users can upload up to {settings.generalMaxFiles} files at once
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Failed to load settings
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
