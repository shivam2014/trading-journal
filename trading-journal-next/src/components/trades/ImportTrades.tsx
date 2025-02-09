'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export default function ImportTrades() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingType, setLoadingType] = useState<'file' | 'demo' | null>(null);
  const router = useRouter();

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File ${file.name} exceeds 5MB limit`);
      toast.error(`File ${file.name} exceeds 5MB limit`);
      return false;
    }

    // Check if file is CSV
    if (!file.name.endsWith('.csv')) {
      setError(`File ${file.name} is not a CSV file`);
      toast.error(`File ${file.name} is not a CSV file`);
      return false;
    }

    return true;
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files.length) return;

    setIsLoading(true);
    setLoadingType('file');
    setError(null);

    const validFiles = Array.from(files).filter(validateFile);
    
    if (validFiles.length === 0) {
      setIsLoading(false);
      setLoadingType(null);
      return;
    }

    const progressToast = toast.loading(`Importing ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}...`);

    try {
      const formData = new FormData();
      validFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      const response = await fetch('/api/trades/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to import trades');
      }

      const result = await response.json();
      
      const message = result.skippedDuplicates > 0
        ? `${result.message} (${result.skippedDuplicates} duplicates skipped)`
        : result.message;

      toast.success(message, {
        id: progressToast,
        duration: 5000,
      });
      
      // Refresh the page to show new data
      router.refresh();
      
      // Optional: Redirect to trades page
      router.push('/trades');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while importing trades';
      setError(errorMessage);
      toast.error(errorMessage, {
        id: progressToast,
      });
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  const loadDemoTrades = async () => {
    setIsLoading(true);
    setLoadingType('demo');
    setError(null);

    const progressToast = toast.loading('Loading demo trades...');

    try {
      const response = await fetch('/api/trades/demo', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load demo trades');
      }

      const result = await response.json();
      
      toast.success('Demo trades loaded successfully!', {
        id: progressToast,
      });
      
      // Refresh the page to show new data
      router.refresh();
      
      // Optional: Redirect to trades page
      router.push('/trades');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while loading demo trades';
      setError(errorMessage);
      toast.error(errorMessage, {
        id: progressToast,
      });
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files?.length) handleFileUpload(files);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files?.length) handleFileUpload(files);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 border border-zinc-800 rounded-lg bg-zinc-900/50 shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2 text-zinc-200">Import Trades</h2>
        <p className="text-zinc-400">
          Upload your Trading 212 CSV export files or load demo trades to get started
        </p>
      </div>

      <div className="flex flex-col w-full gap-6">
        <div>
          <label
            className={`
              flex flex-col items-center justify-center w-full
              h-32 border-2 border-dashed rounded-lg
              cursor-pointer bg-black/60
              hover:bg-black/40
              transition-all duration-300
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              ${isDragging ? 'border-primary-400 bg-black/30' : ''}
            `}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-8 h-8 mb-4 text-primary-600/70"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                />
              </svg>
              <p className="mb-2 text-sm font-medium text-zinc-300">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-zinc-500">CSV files only (max 5MB per file)</p>
            </div>
            <input
              id="dropzone-file"
              type="file"
              className="hidden"
              accept=".csv"
              multiple
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </label>
        </div>

        <div className="flex flex-col items-center gap-4">
          <span className="text-xs uppercase text-zinc-500 font-medium">
            or
          </span>

          <button
            onClick={loadDemoTrades}
            disabled={isLoading}
            className={`
              w-full max-w-md py-2.5 px-4 rounded-md
              bg-primary-700/80 text-zinc-200
              hover:bg-primary-600/80 active:bg-primary-800/80
              disabled:opacity-50 disabled:cursor-not-allowed
              border border-primary-600/20
              text-sm font-medium tracking-wide
              flex items-center justify-center gap-2.5
              shadow-sm transition-all duration-300
              hover:shadow-md hover:shadow-primary-900/20 hover:scale-[1.02]
              focus:outline-none focus:ring-2 focus:ring-primary-700/30
            `}
          >
            <svg
              className="w-5 h-5 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Load Demo Trades
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-400 border-b-transparent"></div>
          <span className="text-sm font-medium text-zinc-400">
            {loadingType === 'demo' ? 'Loading demo trades...' : 'Importing trades...'}
          </span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}