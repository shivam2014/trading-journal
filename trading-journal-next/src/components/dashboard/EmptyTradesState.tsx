import Link from "next/link";
import Image from "next/image";

interface Props {
  title?: string;
}

export default function EmptyTradesState({ title }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="relative h-32 w-32">
        <Image
          src="/trading212.svg"
          alt="Trading"
          fill
          className="opacity-30 transition-opacity hover:opacity-40"
          style={{ objectFit: "contain" }}
        />
      </div>
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          {title || "Welcome to Your Trading Journal"}
        </h3>
        <div className="space-y-2">
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Track, analyze, and improve your trading performance
          </p>
          <p className="max-w-md text-gray-500 dark:text-gray-400">
            Import your trading history to unlock powerful features:
          </p>
          <ul className="mt-2 space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <li>• Visual equity curve tracking</li>
            <li>• Detailed performance analytics</li>
            <li>• Monthly profit breakdown</li>
            <li>• Win rate and trade statistics</li>
          </ul>
        </div>
      </div>
      <div className="space-y-4">
        <Link
          href="/import"
          className="group relative inline-flex items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 text-base font-medium text-white transition-all hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          Get Started
          <svg
            className="h-5 w-5 transform transition-transform group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}