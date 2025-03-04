'use client';

import { useRouter } from 'next/navigation';

export default function WelcomeOptions() {
  const router = useRouter();

  const handleImportClick = () => {
    router.push('/import');
  };

  const handleDemoClick = async () => {
    // Simple transition to trades page since demo data initialization
    // is handled automatically on the main page
    router.push('/trades');
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Trading Journal</h1>
        <p className="text-xl text-muted-foreground">
          Get started by choosing one of the options below
        </p>
      </div>

      <div className="flex gap-6">
        <button
          onClick={handleImportClick}
          className="flex flex-col items-center p-6 rounded-lg border-2 hover:border-primary transition-colors"
        >
          <svg
            className="w-12 h-12 mb-4 text-muted-foreground"
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
          <h2 className="text-xl font-semibold mb-2">Import Your Trades</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Upload your Trading 212 CSV export file to get started with your actual trading data
          </p>
        </button>

        <button
          onClick={handleDemoClick}
          className="flex flex-col items-center p-6 rounded-lg border-2 hover:border-primary transition-colors"
        >
          <svg
            className="w-12 h-12 mb-4 text-muted-foreground"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
            />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Try Demo Mode</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Explore the app with sample trading data to see how it works
          </p>
        </button>
      </div>
    </div>
  );
}