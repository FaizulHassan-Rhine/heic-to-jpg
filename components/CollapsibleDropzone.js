import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Upload, Plus } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import Dropzone from "./Dropzone";
import { cn } from "@/lib/utils";

export default function CollapsibleDropzone({
  files = [],
  setFiles,
  resetResults,
  accept,
  title,
  description,
  disabled,
  onDisabledClick,
  className,
  borderColor = "border-gray-300",
  hoverColor = "hover:border-blue-500",
  maxFiles, // Pass through to Dropzone
  currentFileCount, // Pass through to Dropzone
}) {
  const [isExpanded, setIsExpanded] = useState(files.length === 0);
  const [userManuallyExpanded, setUserManuallyExpanded] = useState(false);
  const prevFileCountRef = useRef(files.length);
  const hasFiles = files.length > 0;

  // Auto-minimize when NEW files are uploaded (not when manually expanded)
  useEffect(() => {
    const currentFileCount = files.length;
    const prevFileCount = prevFileCountRef.current;

    if (currentFileCount === 0) {
      // No files - always expanded
      setIsExpanded(true);
      setUserManuallyExpanded(false);
      prevFileCountRef.current = 0;
    } else if (currentFileCount > prevFileCount) {
      // Files increased - check if we should auto-minimize
      if (!userManuallyExpanded) {
        // Only auto-minimize if user didn't manually expand
        const timer = setTimeout(() => {
          setIsExpanded(false);
        }, 800); // 800ms delay for smooth transition
        prevFileCountRef.current = currentFileCount;
        return () => clearTimeout(timer);
      } else {
        // User manually expanded, just update count
        prevFileCountRef.current = currentFileCount;
      }
    } else if (currentFileCount < prevFileCount) {
      // Files decreased, update count
      prevFileCountRef.current = currentFileCount;
    } else {
      // Same count, just update ref to be safe
      prevFileCountRef.current = currentFileCount;
    }
  }, [files.length, userManuallyExpanded]);

  const handleManualExpand = () => {
    setUserManuallyExpanded(true);
    setIsExpanded(true);
  };

  const handleManualCollapse = () => {
    setUserManuallyExpanded(false);
    setIsExpanded(false);
  };

  return (
    <Card className={cn(
      "border-2 border-dashed bg-white shadow-sm overflow-hidden",
      borderColor,
      hasFiles && !isExpanded ? hoverColor : "",
      hasFiles && isExpanded ? "border-gray-300" : "",
      "transition-all duration-500 ease-in-out"
    )}>
      {/* Collapsed state - always rendered but hidden when expanded */}
      <div 
        className={cn(
          "transition-all duration-500 ease-in-out overflow-hidden",
          hasFiles && !isExpanded 
            ? "max-h-24 opacity-100" 
            : "max-h-0 opacity-0"
        )}
      >
        <CardContent className="p-3">
          <div
            onClick={handleManualExpand}
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                  {title || "Upload Files"}
                </div>
                <div className="text-xs text-gray-500">
                  {files.length} file{files.length !== 1 ? 's' : ''} uploaded • Click to add more
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleManualExpand();
                }}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors text-gray-600 hover:text-blue-600"
                title="Add more files"
              >
                <Plus className="w-4 h-4" />
              </button>
              <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        </CardContent>
      </div>

      {/* Expanded state - always rendered but hidden when collapsed */}
      <div 
        className={cn(
          "transition-all duration-500 ease-in-out overflow-hidden",
          !hasFiles || isExpanded
            ? "max-h-[800px] opacity-100" 
            : "max-h-0 opacity-0"
        )}
      >
        <CardContent className="p-0">
          {hasFiles && (
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="font-medium">{files.length} file{files.length !== 1 ? 's' : ''} ready</span>
              </div>
              <button
                onClick={handleManualCollapse}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-all duration-200 text-gray-500 hover:text-gray-700"
                title="Minimize"
              >
                <ChevronUp className="w-4 h-4 transition-transform duration-200" />
              </button>
            </div>
          )}
          <div className={hasFiles ? "px-4 pb-4" : ""}>
            <Dropzone
              setFiles={setFiles}
              resetResults={resetResults}
              accept={accept}
              title={title}
              description={description}
              disabled={disabled}
              onDisabledClick={onDisabledClick}
              className={cn(hasFiles ? "p-6" : "p-10", className)}
              maxFiles={maxFiles}
              currentFileCount={currentFileCount}
            />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
