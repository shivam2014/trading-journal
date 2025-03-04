export default function TableSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-8 w-32 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
        <div className="h-8 w-24 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
      </div>
      
      <div className="rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-6 gap-4 border-b border-gray-200 p-4 dark:border-gray-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-4 border-b border-gray-200 p-4 last:border-0 dark:border-gray-800"
          >
            {Array.from({ length: 6 }).map((_, j) => (
              <div
                key={j}
                className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-900"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}