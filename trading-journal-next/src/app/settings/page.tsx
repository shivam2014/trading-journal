"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";

export default function SettingsPage() {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResetData = async () => {
    try {
      setIsResetting(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch("/api/trades/demo", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reset data");
      }

      setSuccessMessage("Your data has been reset to demo mode. Redirecting to trade log...");
      router.refresh();

      // Redirect to trades page after a short delay
      setTimeout(() => {
        router.push("/trades");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearTrades = async () => {
    try {
      setIsClearing(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch("/api/trades/clear", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to clear trades");
      }

      setSuccessMessage("All trades have been cleared successfully");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Settings"
        description="Manage your trading journal settings"
      />

      <div className="mt-8 space-y-6">
        {successMessage && (
          <Alert
            type="success"
            title="Success"
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
          />
        )}

        {error && (
          <Alert
            type="error"
            title="Error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Clear All Trades
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                <p>
                  Remove all trades from your journal. This will delete all existing trades
                  without adding any demo data. This action cannot be undone.
                </p>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleClearTrades}
                  disabled={isClearing}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isClearing ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    "Clear All Trades"
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Reset Data
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                <p>
                  Reset your trade data to demo mode. This will remove all existing trades
                  and replace them with demo data. This action cannot be undone.
                </p>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleResetData}
                  disabled={isResetting}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResetting ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset to Demo Data"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}