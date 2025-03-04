"use client";

import { useMemo } from "react";
import EmptyTradesState from "./EmptyTradesState";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { useTrades } from "@/lib/hooks/useTrades";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { TradeFilters } from "@/types/trade";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  variant?: "line" | "monthly" | "winRate" | "distribution";
  filters?: TradeFilters;
}

export default function EquityChart({ variant = "line", filters }: Props) {
  const { trades, isLoading, error } = useTrades({ filter: filters });

  const { labels, data, formatValue = formatCurrency } = useMemo(() => {
    if (!trades || trades.length === 0) {
      return { labels: [], data: [] };
    }

    if (variant === "monthly") {
      // Group trades by month
      const monthlyData = trades.reduce((acc, trade) => {
        const date = new Date(trade.timestamp);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!acc[key]) {
          acc[key] = 0;
        }
        acc[key] += trade.result ?? 0;
        return acc;
      }, {} as Record<string, number>);

      const sortedMonths = Object.keys(monthlyData).sort();
      return {
        labels: sortedMonths.map(month => {
          const [year, monthNum] = month.split("-");
          return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString("default", {
            month: "short",
            year: "2-digit",
          });
        }),
        data: sortedMonths.map(month => monthlyData[month]),
      };
    }

    if (variant === "winRate") {
      // Calculate win rate by instrument
      const winRates = trades.reduce((acc, trade) => {
        if (!trade.ticker) return acc;
        if (!acc[trade.ticker]) {
          acc[trade.ticker] = { wins: 0, total: 0 };
        }
        if (trade.result && trade.result > 0) {
          acc[trade.ticker].wins++;
        }
        acc[trade.ticker].total++;
        return acc;
      }, {} as Record<string, { wins: number; total: number }>);

      const sortedSymbols = Object.entries(winRates)
        .map(([ticker, { wins, total }]) => ({
          ticker,
          winRate: (wins / total) * 100,
        }))
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 10); // Top 10 instruments

      return {
        labels: sortedSymbols.map(item => item.ticker),
        data: sortedSymbols.map(item => item.winRate),
        formatValue: formatPercent,
      };
    }

    if (variant === "distribution") {
      // Calculate trade result distribution
      const distribution = trades.reduce((acc, trade) => {
        if (!trade.result) return acc;
        const key = trade.result >= 0 ? "Profitable" : "Loss";
        if (!acc[key]) {
          acc[key] = 0;
        }
        acc[key]++;
        return acc;
      }, {} as Record<string, number>);

      return {
        labels: Object.keys(distribution),
        data: Object.values(distribution),
      };
    }

    // Default: equity curve
    let equity = 0;
    const equityData = trades
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(trade => {
        equity += trade.result ?? 0;
        return {
          date: new Date(trade.timestamp).toLocaleDateString("default", {
            month: "short",
            day: "numeric",
          }),
          value: equity,
        };
      });

    return {
      labels: equityData.map(d => d.date),
      data: equityData.map(d => d.value),
    };
  }, [trades, variant]);

  const options: ChartOptions<"line" | "bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => formatValue(context.parsed.y),
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          callback: (value) => formatValue(value as number),
        },
      },
    },
  };

  if (data.length === 0) {
    return (
      <EmptyTradesState
        title={
          variant === "monthly"
            ? "Track Your Monthly Performance"
            : variant === "winRate"
            ? "Analyze Win Rates by Instrument"
            : variant === "distribution"
            ? "Understand Your Trade Distribution"
            : "Visualize Your Equity Growth"
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading chart data...</p>
      </div>
    );
  }

  // Only show error if we have data but failed to load it
  if (error && data.length > 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-600 dark:text-red-400">Error loading chart data</p>
      </div>
    );
  }

  const chartColors = {
    line: {
      borderColor: "rgb(0, 200, 83)",
      backgroundColor: "rgba(0, 200, 83, 0.1)",
    },
    bar: {
      positive: {
        backgroundColor: "rgba(0, 200, 83, 0.5)",
        borderColor: "rgb(0, 200, 83)",
      },
      negative: {
        backgroundColor: "rgba(255, 61, 87, 0.5)",
        borderColor: "rgb(255, 61, 87)",
      },
    },
  };

  if (variant === "monthly" || variant === "winRate" || variant === "distribution") {
    return (
      <Bar
        data={{
          labels,
          datasets: [
            {
              data,
              backgroundColor: variant === "distribution"
                ? [chartColors.bar.positive.backgroundColor, chartColors.bar.negative.backgroundColor]
                : data.map(value =>
                    value >= 0 ? chartColors.bar.positive.backgroundColor : chartColors.bar.negative.backgroundColor
                  ),
              borderColor: variant === "distribution"
                ? [chartColors.bar.positive.borderColor, chartColors.bar.negative.borderColor]
                : data.map(value =>
                    value >= 0 ? chartColors.bar.positive.borderColor : chartColors.bar.negative.borderColor
                  ),
              borderWidth: 1,
            },
          ],
        }}
        options={options}
      />
    );
  }

  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            data,
            borderColor: chartColors.line.borderColor,
            backgroundColor: chartColors.line.backgroundColor,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      }}
      options={options}
    />
  );
}