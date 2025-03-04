/**
 * Get the ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Format a date range as a string
 */
export function formatDateRange(start: Date, end: Date): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  // If same day
  if (startDate.toDateString() === endDate.toDateString()) {
    return startDate.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  // If same month and year
  if (
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear()
  ) {
    return `${startDate.toLocaleDateString(undefined, { day: 'numeric' })} - ${
      endDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }`;
  }
  
  // If same year
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${startDate.toLocaleDateString(undefined, { 
      month: 'short',
      day: 'numeric'
    })} - ${
      endDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }`;
  }
  
  // Different years
  return `${startDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })} - ${
    endDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }`;
}

/**
 * Get start and end dates for a timeframe
 */
export function getTimeframeDates(
  date: Date,
  timeframe: 'day' | 'week' | 'month' | 'year'
): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(date);
  
  switch (timeframe) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'week':
      // Set to Monday
      start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      start.setHours(0, 0, 0, 0);
      // Set to Sunday
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(date.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }
  
  return { start, end };
}

/**
 * Check if a date is within a timeframe
 */
export function isDateInTimeframe(
  date: Date,
  timeframe: { start: Date; end: Date }
): boolean {
  const timestamp = date.getTime();
  return timestamp >= timeframe.start.getTime() && 
         timestamp <= timeframe.end.getTime();
}

/**
 * Format a date for display
 */
export function formatDate(
  date: Date,
  format: 'short' | 'long' | 'time' | 'datetime' = 'short'
): string {
  switch (format) {
    case 'short':
      return date.toLocaleDateString();
    case 'long':
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'time':
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'datetime':
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    default:
      return date.toLocaleDateString();
  }
}