"use client";

import { useTradeStats } from "@/lib/hooks/useTradeStats";
import EmptyTradesState from "./EmptyTradesState";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import type { TradeFilters } from "@/types/trade";

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  trend?: "up" | "down" | "neutral";
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {value}
        </p>
      </div>
      <div
        className={`rounded-full p-2 ${
          trend === "up"
            ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
            : trend === "down"
            ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

interface StatsGridProps {
  filters?: TradeFilters;
}

export default function StatsGrid({ filters }: StatsGridProps) {
  const { stats, isLoading, error } = useTradeStats({ filters });

  // For new users, show welcome message instead of error
  if (!stats || stats.totalTrades === 0) {
    return <EmptyTradesState title="Welcome to Your Trading Dashboard" />;
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">Loading stats...</p>
      </div>
    );
  }

  // Only show error if we have existing trades but failed to load them
  if (error && stats?.totalTrades > 0) {
    return (
      <div className="rounded-lg border border-red-200 p-4 dark:border-red-900">
        <p className="text-red-600 dark:text-red-400">Error loading stats: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total P&L"
        value={formatCurrency(stats.totalPnL)}
        icon={CurrencyDollarIcon}
        trend={stats.totalPnL > 0 ? "up" : stats.totalPnL < 0 ? "down" : "neutral"}
      />
      <StatCard
        title="Win Rate"
        value={formatPercent(stats.winRate)}
        icon={ChartBarIcon}
        trend={stats.winRate > 50 ? "up" : stats.winRate < 50 ? "down" : "neutral"}
      />
      <StatCard
        title="Biggest Win"
        value={formatCurrency(stats.biggestWin)}
        icon={ArrowTrendingUpIcon}
        trend="up"
      />
      <StatCard
        title="Biggest Loss"
        value={formatCurrency(Math.abs(stats.biggestLoss))}
        icon={ArrowTrendingDownIcon}
        trend="down"
      />
    </div>
  );
}