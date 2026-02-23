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
import { useUserOrders, useOrderDetails, useDeleteOrder } from "../lib/queries/orders";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingOrderId, setViewingOrderId] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const router = useRouter();

  // Use TanStack Query for orders
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
  } = useUserOrders(user?.uid, currentPage, 10);

  // Use TanStack Query for order details
  const {
    data: orderDetails,
    isLoading: orderDetailsLoading,
  } = useOrderDetails(viewingOrderId, user?.uid);

  // Delete order mutation
  const deleteOrderMutation = useDeleteOrder();

  const orders = ordersData?.orders || [];
  const summary = ordersData?.summary || null;
  const pagination = ordersData?.pagination || {};

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      toast.error("Please sign in to view your orders");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (ordersError) {
      toast.error(ordersError.message || "Failed to load orders");
    }
  }, [ordersError]);

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

  const handleViewOrder = (orderId) => {
    setViewingOrderId(orderId);
    setViewModalOpen(true);
  };

  const handleDeleteClick = (orderId) => {
    setOrderToDelete(orderId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete || !user?.uid) return;

    try {
      await deleteOrderMutation.mutateAsync({
        orderId: orderToDelete,
        firebaseUid: user.uid,
      });
      toast.success("Order deleted successfully");
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete order");
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setOrderToDelete(null);
  };

  const handleDownload = async (order) => {
    if (!order) {
      toast.error("Order information not available.");
      return;
    }

    try {
      // Use cached order details if available, otherwise fetch
      let orderData = order;
      if (!order.files || order.files.length === 0) {
        try {
          const response = await fetch(`/api/user/order/${order.id}?firebaseUid=${user.uid}`);
          const data = await response.json();
          if (data.success) {
            orderData = data.order;
          }
        } catch (error) {
          console.warn("Could not fetch full order details:", error);
        }
      }

      if (!orderData.files || orderData.files.length === 0) {
        toast.error("No files found in this order.");
        return;
      }

      // Check if files have stored data (use hasOutputFileData flag from API)
      const filesWithDataIndices = orderData.files
        .map((f, index) => ({ file: f, index }))
        .filter(({ file }) => file.hasOutputFileData || file.outputFileData);
      
      console.log("Download check:", {
        totalFiles: orderData.files.length,
        filesWithData: filesWithDataIndices.length,
        firstFileHasData: !!(orderData.files[0]?.hasOutputFileData || orderData.files[0]?.outputFileData),
      });
      
      if (filesWithDataIndices.length === 0) {
        toast.error("Files are not stored for this order. This order was created before file storage was implemented.");
        return;
      }

      // If single file, download directly
      if (filesWithDataIndices.length === 1) {
        const { file, index } = filesWithDataIndices[0];
        try {
          const response = await fetch(
            `/api/user/order/${order.id}/download?firebaseUid=${user.uid}&fileIndex=${index}`
          );
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Download failed");
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.outputName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast.success("File downloaded successfully!");
        } catch (error) {
          console.error("Download error:", error);
          toast.error(error.message || "Failed to download file.");
        }
      } else {
        // Multiple files - download as ZIP
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        
        for (const { file, index } of filesWithDataIndices) {
          try {
            const response = await fetch(
              `/api/user/order/${order.id}/download?firebaseUid=${user.uid}&fileIndex=${index}`
            );
            
            if (response.ok) {
              const blob = await response.blob();
              zip.file(file.outputName, blob);
            }
          } catch (error) {
            console.warn(`Failed to download file ${file.outputName}:`, error);
          }
        }

        if (zip.files && Object.keys(zip.files).length > 0) {
          const zipBlob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `order-${orderData.id || orderData._id || Date.now()}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast.success(`Downloaded ${Object.keys(zip.files).length} file(s) as ZIP!`);
        } else {
          toast.error("Failed to download files.");
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download files.");
    }
  };

  if (authLoading || ordersLoading) {
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
                            onClick={() => handleDeleteClick(order.id)}
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
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * 10) + 1} to{" "}
                  {Math.min(currentPage * 10, pagination.total)} of {pagination.total} orders
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? "bg-blue-600 text-white" : ""}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Delete Order</h2>
            </div>
            <div className="px-6 py-6">
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this order? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleDeleteCancel}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleDeleteConfirm}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Order Details</h2>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setViewingOrderId(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {orderDetailsLoading ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading order details...</p>
              </div>
            ) : orderDetails ? (
              <div className="p-6 space-y-6">
              {/* Order Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Tool Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tool:</span>
                    <span className="font-semibold text-gray-800">{orderDetails.toolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="capitalize text-gray-800">{orderDetails.toolType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`capitalize ${
                      orderDetails.status === "completed" ? "text-green-600" : 
                      orderDetails.status === "failed" ? "text-red-600" : "text-yellow-600"
                    }`}>
                      {orderDetails.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="text-gray-800">
                      {new Date(orderDetails.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Files Information */}
              {orderDetails.files && orderDetails.files.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Files ({orderDetails.files.length})</h3>
                  <div className="space-y-3">
                    {orderDetails.files.map((file, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                        <div className="flex items-center gap-2 text-sm">
                          <File className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-700">File {index + 1}</span>
                        </div>

                        {/* Thumbnails Preview (side by side) */}
                        {(file.inputThumbnail || file.outputThumbnail) && (
                          <div className="grid grid-cols-2 gap-4">
                            {/* Input Preview */}
                            <div className="flex flex-col items-center">
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Before</p>
                              {file.inputThumbnail ? (
                                <div className="w-full bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden p-2" style={{ minHeight: '180px' }}>
                                  <img
                                    src={file.inputThumbnail.startsWith('data:') 
                                      ? file.inputThumbnail 
                                      : `data:image/jpeg;base64,${file.inputThumbnail}`}
                                    alt="Input preview"
                                    className="max-w-full h-auto object-contain rounded"
                                    style={{ maxHeight: '280px' }}
                                    onError={(e) => {
                                      console.error("Failed to load input thumbnail:", e);
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full bg-white rounded-lg border border-gray-200 flex items-center justify-center" style={{ minHeight: '180px' }}>
                                  <File className="w-8 h-8 text-gray-300" />
                                </div>
                              )}
                            </div>
                            {/* Output Preview */}
                            <div className="flex flex-col items-center">
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">After</p>
                              {file.outputThumbnail ? (
                                <div className="w-full bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden p-2" style={{ minHeight: '180px' }}>
                                  <img
                                    src={file.outputThumbnail.startsWith('data:') 
                                      ? file.outputThumbnail 
                                      : `data:image/jpeg;base64,${file.outputThumbnail}`}
                                    alt="Output preview"
                                    className="max-w-full h-auto object-contain rounded"
                                    style={{ maxHeight: '280px' }}
                                    onError={(e) => {
                                      console.error("Failed to load output thumbnail:", e);
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full bg-white rounded-lg border border-gray-200 flex items-center justify-center" style={{ minHeight: '180px' }}>
                                  <File className="w-8 h-8 text-gray-300" />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Input & Output File Info (side by side) */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Input File Info */}
                          <div className="bg-white rounded-md p-3 border border-gray-100">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Input</p>
                            <p className="text-sm font-medium text-gray-800 break-all">{file.inputName || "N/A"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {file.inputFormat && (
                                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                                  {file.inputFormat.toUpperCase()}
                                </span>
                              )}
                              {file.inputSize && (
                                <span className="text-xs text-gray-500">{formatFileSize(file.inputSize)}</span>
                              )}
                            </div>
                          </div>

                          {/* Output File Info */}
                          <div className="bg-white rounded-md p-3 border border-gray-100">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Output</p>
                            <p className="text-sm font-medium text-gray-800 break-all">{file.outputName || "N/A"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {file.outputFormat && (
                                <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded">
                                  {file.outputFormat.toUpperCase()}
                                </span>
                              )}
                              {file.outputSize && (
                                <span className="text-xs text-gray-500">{formatFileSize(file.outputSize)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Size Change */}
                        {file.inputSize && file.outputSize && (
                          <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-200">
                            <span className={`text-xs font-medium ${
                              file.outputSize <= file.inputSize ? "text-green-600" : "text-red-600"
                            }`}>
                              Size change: {file.outputSize > file.inputSize ? "+" : ""}
                              {Math.round(((file.outputSize - file.inputSize) / file.inputSize) * 100)}%
                              {file.outputSize <= file.inputSize ? " ↓" : " ↑"}
                            </span>
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
                    <p className="text-xs mt-1">This is an older order that doesn&apos;t include file details.</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              {orderDetails.metadata && Object.keys(orderDetails.metadata).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Additional Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(orderDetails.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleDownload(orderDetails)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Files
                </Button>
                <Link href={orderDetails.toolPath} className="flex-1">
                  <Button variant="default" className="w-full">
                    Use Tool Again
                  </Button>
                </Link>
              </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
