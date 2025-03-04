import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-6 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
        <h2 className="mt-4 text-2xl font-bold">Unauthorized Access</h2>
        <p className="mt-2 text-gray-400">
          You don't have permission to access this page. Please contact an administrator
          if you believe this is a mistake.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}