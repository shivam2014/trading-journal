export default function ChartSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      {/* Y-axis labels */}
      <div className="flex h-full">
        <div className="flex w-12 flex-col justify-between py-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>

        {/* Chart area */}
        <div className="relative flex-1 p-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-[200px] w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-12 py-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-4 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
    </div>
  );
}