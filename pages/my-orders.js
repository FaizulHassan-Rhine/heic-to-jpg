import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Package, Download, Image, Video, FileText, Music, Search, Loader2, Eye, Trash2, X, File } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const TOOL_ICONS = {
  "Image Converter": Image,
  "Image Compressor": Image,
  "Video Converter": Video,
  "Video Compressor": Video,
  "Video Trimmer": Video,
  "Doc to PDF": FileText,
  "PDF to DOCX/TXT": FileText,
  "Merge PDF": FileText,
  "Compress PDF": FileText,
  "Document Scanner": FileText,
  "Extract Text (OCR)": FileText,
  "Image to PDF": Image,
  "Audio Converter": Music,
  "Text to Speech": Music,
  "Speech to Text": Music,
  "QR & Barcode": Package,
  "URL Shortener": Package,
};

export default function MyOrders() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [viewingOrder, setViewingOrder] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      toast.error("Please sign in to view your orders");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, currentPage]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/user/orders?firebaseUid=${user.uid}&page=${currentPage}&limit=20`
      );
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
        setSummary(data.summary);
        setPagination(data.pagination);
      } else {
        toast.error(data.error || "Failed to load orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) =>
    order.toolName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleViewOrder = async (orderId) => {
    try {
      const response = await fetch(`/api/user/order/${orderId}?firebaseUid=${user.uid}`);
      const data = await response.json();
      
      if (data.success) {
        setViewingOrder(data.order);
        setViewModalOpen(true);
      } else {
        toast.error(data.error || "Failed to load order details");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Failed to load order details");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!confirm("Are you sure you want to delete this order?")) {
      return;
    }

    try {
      const response = await fetch(`/api/user/order/${orderId}?firebaseUid=${user.uid}`, {
        method: "DELETE",
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success("Order deleted successfully");
        fetchOrders(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
    }
  };

  const handleDownload = (order) => {
    // For now, redirect to the tool page
    // In the future, we could implement actual file downloads if files are stored
    router.push(order.toolPath);
    toast.info("Redirecting to tool. Files are not stored, but you can use the tool again.");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Orders</h1>
          <p className="text-gray-600">View your conversion and compression history</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tools Used</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {summary.totalToolsUsed}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
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
                      {summary.totalConversions}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Download className="w-6 h-6 text-green-600" />
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
                      {summary.totalCompressions}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Download className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Tools</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {summary.totalOrders}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {filteredOrders.length === 0 && !loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No orders yet</h3>
              <p className="text-gray-600 mb-6">
                Start using our tools to see your conversion history here!
              </p>
              <Link href="/convert">
                <Button>Get Started</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const IconComponent = TOOL_ICONS[order.toolName] || Package;
                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              order.toolType === "conversion"
                                ? "bg-green-100"
                                : "bg-blue-100"
                            }`}
                          >
                            <IconComponent
                              className={`w-6 h-6 ${
                                order.toolType === "conversion" ? "text-green-600" : "text-blue-600"
                              }`}
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">{order.toolName}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-gray-500 capitalize">{order.toolType}</p>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500">
                                {order.fileCount} file{order.fileCount !== 1 ? "s" : ""}
                              </p>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString()}{" "}
                                {new Date(order.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              order.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : order.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {order.status}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrder(order.id)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(order)}
                            className="flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Link href={order.toolPath}>
                            <Button variant="outline" size="sm">
                              Use Again
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * 20) + 1} to{" "}
                  {Math.min(currentPage * 20, pagination.total)} of {pagination.total} orders
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
          </>
        )}
      </main>
      <Footer />

      {/* View Order Modal */}
      {viewModalOpen && viewingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Order Details</h2>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setViewingOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Tool Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tool:</span>
                    <span className="font-semibold text-gray-800">{viewingOrder.toolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="capitalize text-gray-800">{viewingOrder.toolType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`capitalize ${
                      viewingOrder.status === "completed" ? "text-green-600" : 
                      viewingOrder.status === "failed" ? "text-red-600" : "text-yellow-600"
                    }`}>
                      {viewingOrder.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="text-gray-800">
                      {new Date(viewingOrder.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Files Information */}
              {viewingOrder.files && viewingOrder.files.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Files ({viewingOrder.files.length})</h3>
                  <div className="space-y-3">
                    {viewingOrder.files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
                        <div className="flex items-center gap-2 text-sm">
                          <File className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-700">File {index + 1}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 mb-1">Input File</p>
                            <p className="font-medium text-gray-800 truncate">{file.inputName || "N/A"}</p>
                            {file.inputSize && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatFileSize(file.inputSize)} {file.inputFormat ? `(${file.inputFormat})` : ""}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Output File</p>
                            <p className="font-medium text-gray-800 truncate">{file.outputName || "N/A"}</p>
                            {file.outputSize && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatFileSize(file.outputSize)} {file.outputFormat ? `(${file.outputFormat})` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                        {file.inputSize && file.outputSize && (
                          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                            Size change: {file.outputSize > file.inputSize ? "+" : ""}
                            {Math.round(((file.outputSize - file.inputSize) / file.inputSize) * 100)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Files</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                    <p>File information not available for this order.</p>
                    <p className="text-xs mt-1">This is an older order that doesn't include file details.</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              {viewingOrder.metadata && Object.keys(viewingOrder.metadata).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Additional Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(viewingOrder.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleDownload(viewingOrder)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Files
                </Button>
                <Link href={viewingOrder.toolPath} className="flex-1">
                  <Button variant="default" className="w-full">
                    Use Tool Again
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
