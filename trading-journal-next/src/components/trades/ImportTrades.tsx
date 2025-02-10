"use client";

import { useState, useCallback } from "react";
import { useTrades } from "@/lib/hooks/useTrades";
import { toast } from "sonner";

export default function ImportTrades() {
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { refresh } = useTrades();

  const handleFiles = async (files: FileList) => {
    if (!files?.length) return;

    setIsImporting(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append("files", file);
      });

      console.log('Starting trade import...');
      const response = await fetch("/api/trades/import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log('Full import response:', response);
      console.log('Import result details:', result);

      if (response.ok) {
        // Use the message directly from the server since we're now handling the formatting there
        toast.success(result.message);
        
        // Log state before refresh
        console.log('Import successful with result:', {
          message: result.message,
          filesProcessed: result.filesProcessed,
          totalProcessed: result.totalProcessed
        });
        
        // Force refresh trades after successful import
        await refresh();
        console.log('Trades refreshed after import');
      } else {
        throw new Error(result.error || "Failed to import trades");
      }
    } catch (error) {
      console.error("Error importing trades:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import trades");
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFiles(files);
      // Reset file input
      event.target.value = "";
    }
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const files = event.dataTransfer.files;
      handleFiles(files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClearTrades = async () => {
    if (!confirm("Are you sure you want to clear all trades? This cannot be undone.")) {
      return;
    }

    try {
      console.log('Clearing trades...');
      const response = await fetch("/api/trades/clear", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to clear trades");
      }

      console.log('Trades cleared, refreshing...');
      // Force refresh after clearing trades
      await refresh();
      console.log('Trades refreshed after clear');
      toast.success("All trades cleared successfully");
    } catch (error) {
      console.error("Error clearing trades:", error);
      toast.error(error instanceof Error ? error.message : "Failed to clear trades");
    }
  };

  const handleLoadDemo = async () => {
    try {
      console.log('Loading demo trades...');
      const response = await fetch("/api/trades/demo", {
        method: "POST",
      });

      const result = await response.json();
      console.log('Demo import result:', result);

      if (response.ok) {
        toast.success(result.message);
        console.log('Demo data loaded, refreshing trades...');
        await refresh();
        console.log('Trades refreshed after demo load');
      } else {
        throw new Error(result.error || "Failed to load demo trades");
      }
    } catch (error) {
      console.error("Error loading demo trades:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load demo trades");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-6">
        {/* Option 1: Import CSV */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <svg 
              className="w-5 h-5 text-primary-600 dark:text-primary-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" 
              />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Import Your Trading History
            </h2>
          </div>
          <div
            className={`p-8 border-2 border-dashed rounded-lg transition-colors text-center
              ${isDragging
                ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/10"
                : "border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500"
              }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileChange}
              disabled={isImporting}
              className="hidden"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer"
            >
              <svg 
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 48 48"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2}
                  d="M24 32V16m0 0l-8 8m8-8l8 8M6 40h36a2 2 0 002-2V10a2 2 0 00-2-2H6a2 2 0 00-2 2v28a2 2 0 002 2z" 
                />
              </svg>
              <div className="mt-4 flex flex-col space-y-1">
                <span className="text-base text-gray-700 dark:text-gray-300">
                  Drag and drop your CSV files here
                </span>
                <span className="text-sm text-primary-600 dark:text-primary-400">
                  or click to select files
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Up to 5 MB per file
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* OR Separator */}
        <div className="flex items-center justify-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          <span className="px-4 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900">
            OR
          </span>
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>

        {/* Option 2: Load Demo */}
        <div className="flex justify-center">
          <button
            onClick={handleLoadDemo}
            className="group relative inline-flex items-center px-6 py-2 text-sm font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors"
            disabled={isImporting}
          >
            <svg 
              className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Load Demo Data
          </button>
        </div>

        {/* Clear All Trades Button - Small and to the side */}
        <div className="flex justify-end">
          <button
            onClick={handleClearTrades}
            className="group text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center space-x-1"
            disabled={isImporting}
          >
            <svg 
              className="h-3 w-3 transition-transform group-hover:scale-110" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
            <span>Clear all trades</span>
          </button>
        </div>
      </div>

      {isImporting && (
        <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          <svg 
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-600" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Importing trades...
        </div>
      )}

    </div>
  );
}