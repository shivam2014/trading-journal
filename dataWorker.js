// Web Worker for processing trade data
self.onmessage = function(e) {
    if (e.data.type === 'processTrades') {
        const trades = e.data.trades;
        const processedData = processTradeData(trades);
        self.postMessage({ type: 'processedData', data: processedData });
    }
};

function processTradeData(trades) {
    return {
        equityCurve: calculateEquityCurve(trades),
        winLoss: calculateWinLoss(trades),
        positionSize: calculatePositionSizes(trades),
        dailyPerformance: calculateDailyPerformance(trades),
        monthlyPerformance: calculateMonthlyPerformance(trades),
        riskReward: calculateRiskReward(trades),
        tradeDuration: calculateTradeDuration(trades),
        hourlyStats: calculateHourlyStats(trades)
    };
}

function calculateEquityCurve(trades) {
    const sortedTrades = trades.sort((a, b) => new Date(a.Time) - new Date(b.Time));
    let balance = 0;
    const dates = [];
    const values = [];

    sortedTrades.forEach(trade => {
        const pnl = calculateTradePnL(trade);
        balance += pnl;
        dates.push(new Date(trade.Time).toLocaleDateString());
        values.push(balance);
    });

    return { dates, values };
}

function calculateWinLoss(trades) {
    let wins = 0, losses = 0;
    trades.forEach(trade => {
        const pnl = calculateTradePnL(trade);
        if (pnl > 0) wins++;
        else if (pnl < 0) losses++;
    });
    return { wins, losses };
}

function calculatePositionSizes(trades) {
    const sizeMap = new Map();
    trades.forEach(trade => {
        const size = Math.abs(parseFloat(trade['No. of shares']));
        const sizeRange = Math.floor(size / 100) * 100;
        sizeMap.set(sizeRange, (sizeMap.get(sizeRange) || 0) + 1);
    });

    const sortedSizes = Array.from(sizeMap.entries())
        .sort(([a], [b]) => a - b);

    return {
        sizes: sortedSizes.map(([size]) => `${size}-${size + 99}`),
        frequencies: sortedSizes.map(([, freq]) => freq)
    };
}

function calculateDailyPerformance(trades) {
    const dailyPnL = new Map();
    trades.forEach(trade => {
        const date = new Date(trade.Time).toLocaleDateString();
        const pnl = calculateTradePnL(trade);
        dailyPnL.set(date, (dailyPnL.get(date) || 0) + pnl);
    });

    const sortedDays = Array.from(dailyPnL.entries())
        .sort(([a], [b]) => new Date(a) - new Date(b));

    return {
        dates: sortedDays.map(([date]) => date),
        returns: sortedDays.map(([, pnl]) => pnl)
    };
}

function calculateMonthlyPerformance(trades) {
    const monthlyPnL = new Map();
    trades.forEach(trade => {
        const date = new Date(trade.Time);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const pnl = calculateTradePnL(trade);
        monthlyPnL.set(monthKey, (monthlyPnL.get(monthKey) || 0) + pnl);
    });

    const sortedMonths = Array.from(monthlyPnL.entries())
        .sort(([a], [b]) => a.localeCompare(b));

    return {
        months: sortedMonths.map(([month]) => month),
        returns: sortedMonths.map(([, pnl]) => pnl)
    };
}

function calculateRiskReward(trades) {
    const ratioMap = new Map();
    trades.forEach(trade => {
        const risk = Math.abs(parseFloat(trade['Stop loss']));
        const reward = Math.abs(parseFloat(trade['Take profit']));
        if (risk && reward) {
            const ratio = (reward / risk).toFixed(2);
            ratioMap.set(ratio, (ratioMap.get(ratio) || 0) + 1);
        }
    });

    const sortedRatios = Array.from(ratioMap.entries())
        .sort(([a], [b]) => parseFloat(a) - parseFloat(b));

    return {
        ratios: sortedRatios.map(([ratio]) => ratio),
        frequencies: sortedRatios.map(([, freq]) => freq)
    };
}

function calculateTradeDuration(trades) {
    const durationMap = new Map();
    trades.forEach(trade => {
        if (trade.Time && trade['Close Time']) {
            const duration = calculateDurationInMinutes(trade.Time, trade['Close Time']);
            const durationRange = Math.floor(duration / 60); // Group by hours
            durationMap.set(durationRange, (durationMap.get(durationRange) || 0) + 1);
        }
    });

    const sortedDurations = Array.from(durationMap.entries())
        .sort(([a], [b]) => a - b);

    return {
        durations: sortedDurations.map(([duration]) => `${duration}h`),
        frequencies: sortedDurations.map(([, freq]) => freq)
    };
}

function calculateHourlyStats(trades) {
    const hourlyMap = new Map();
    for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, 0);
    }

    trades.forEach(trade => {
        const hour = new Date(trade.Time).getHours();
        hourlyMap.set(hour, hourlyMap.get(hour) + 1);
    });

    const sortedHours = Array.from(hourlyMap.entries())
        .sort(([a], [b]) => a - b);

    return {
        hours: sortedHours.map(([hour]) => `${hour}:00`),
        frequencies: sortedHours.map(([, freq]) => freq)
    };
}

function calculateTradePnL(trade) {
    const quantity = parseFloat(trade['No. of shares']);
    const price = parseFloat(trade['Price / share']);
    const totalValue = quantity * price;
    return trade.Action === 'buy' ? -totalValue : totalValue;
}

function calculateDurationInMinutes(startTime, endTime) {
    return Math.round((new Date(endTime) - new Date(startTime)) / (1000 * 60));
}