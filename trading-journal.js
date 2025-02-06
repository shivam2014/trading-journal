// Add event listener for DOMContentLoaded to initialize the application
document.addEventListener('DOMContentLoaded', initializeApplication);

const csvFiles = [
  'T212_CSV_exports/from_2020-05-24_to_2020-11-05_MTczMDg0Mzk0NzY2MA.csv',
  'T212_CSV_exports/from_2020-11-06_to_2021-11-05_MTczMDg0Mzg1MTg4Mw.csv',
  'T212_CSV_exports/from_2021-11-06_to_2022-11-05_MTczMDg0MzgwNzYyMg.csv',
  'T212_CSV_exports/from_2022-11-06_to_2023-11-05_MTczMDg0MzYzODkzMw.csv',
  'T212_CSV_exports/from_2023-11-06_to_2024-11-05_MTczMDg0MzI1NDYxMA.csv',
  'T212_CSV_exports/from_2024-11-04_to_2024-12-24_MTczNTA2NDEzNjQ2OA.csv'
];

let allTrades = [];
let cumulativeReturns = [];
let currentPage = 1;
let tradesPerPage = 20;
let currentSort = { column: 'Date', direction: 'desc' };

// Define global variables at the top
const filters = {
    symbol: '',
    side: '',
    date: '',
    status: ''
};

// Chart.js default styling
Chart.defaults.color = '#9ba1ae';
Chart.defaults.borderColor = '#363c4a';
Chart.defaults.font.family = "'Inter', sans-serif";

// Common chart options with more customization
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
    },
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            backgroundColor: '#232836',
            titleColor: '#e4e6eb',
            bodyColor: '#e4e6eb',
            borderColor: '#363c4a',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
            }
        },
        crosshair: {
            line: {
                color: '#363c4a',
                width: 1
            }
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            },
            ticks: {
                color: '#9ba1ae',
                maxRotation: 45,
                minRotation: 45
            }
        },
        y: {
            grid: {
                color: '#363c4a',
                drawBorder: false
            },
            ticks: {
                color: '#9ba1ae',
                callback: (value) => formatCurrency(value),
                padding: 8
            }
        }
    },
    animation: {
        duration: 750,
        easing: 'easeInOutQuart'
    }
};

// Replace the hardcoded API key with a configuration object
const CONFIG = {
    ALPHA_VANTAGE_API_KEY: '', // User will need to set this
    CHART_DEFAULTS: {
        upColor: '#26a69a',
        downColor: '#ef5350',
        backgroundColor: '#131722'
    }
};

function formatCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(num);
}

async function loadAndParseCSV(filePath) {
  try {
    const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
        }
    const csvData = await response.text();
        const result = Papa.parse(csvData, { 
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            transform: (value) => value.trim()
        });
        
        if (result.errors.length > 0) {
            console.warn(`Parsing warnings for ${filePath}:`, result.errors);
        }
        
        return result.data;
  } catch (error) {
    console.error('Error loading CSV:', filePath, error);
    return [];
  }
}

async function loadData() {
    try {
        console.log('Starting data loading...');
        allTrades = [];
        
        // Create a Set to track unique trade IDs
        const processedTradeIds = new Set();
        
        // Load all CSV files
        for (const csvFile of csvFiles) {
            console.log(`Loading CSV file: ${csvFile}`);
            const trades = await loadAndParseCSV(csvFile);
            if (trades && trades.length > 0) {
                trades.forEach(trade => {
                    const tradeId = `${trade.Time}_${trade.Ticker}_${trade.Action}_${trade['No. of shares']}_${trade['Price / share']}`;
                    if (!processedTradeIds.has(tradeId)) {
                        processedTradeIds.add(tradeId);
                        allTrades.push(trade);
                    }
                });
            }
        }
        
        if (allTrades.length === 0) {
            console.error('No trades loaded from CSV files');
            return;
        }
        
        console.log(`Total trades loaded: ${allTrades.length}`);
        
        // Sort trades by date
        allTrades.sort((a, b) => new Date(a.Time) - new Date(b.Time));
        
        // Calculate cumulative returns
        cumulativeReturns = allTrades.map(trade => parseFloat(trade.Result) || 0);
        
        // Reset pagination to first page
        currentPage = 1;
        
        // Initialize UI components
        console.log('Initializing UI components...');
        initializeFilters();
        setupTableSorting();
        setupPaginationListeners();
        
        // Update UI with loaded data
        console.log('Updating dashboard...');
        await updateDashboard();
        
        // Create charts after dashboard update
        console.log('Creating charts...');
        await createCharts();
        
        console.log('Populating trades table...');
        populateTradesTable();
        
        console.log('Data loading completed successfully');
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function processTradeGroups() {
    const tickerGroups = new Map();

    // First pass: Group trades by ticker
    allTrades.forEach(trade => {
        const ticker = trade.Ticker;
        if (!tickerGroups.has(ticker)) {
            tickerGroups.set(ticker, {
                ticker,
                lastTradeDate: new Date(trade.Time),
                tradeGroups: [],
                currentGroup: null,
                totalRealizedPnL: 0,
                totalUnrealizedPnL: 0,
                totalDividends: 0,
                totalFees: 0,
                openPositions: 0
            });
        }

        const tickerData = tickerGroups.get(ticker);
        const tradeDate = new Date(trade.Time);
        if (tradeDate > tickerData.lastTradeDate) {
            tickerData.lastTradeDate = tradeDate;
        }

        // Process the trade
        const action = trade.Action.toLowerCase();
        const shares = parseFloat(trade['No. of shares']) || 0;
        const price = parseFloat(trade['Price / share']) || 0;
        const fees = (parseFloat(trade['Currency conversion fee']) || 0) + 
                    (parseFloat(trade.Commission) || 0);
        const result = parseFloat(trade.Result) || 0;
        const isDividend = action.includes('dividend');

        // Handle dividends separately
        if (isDividend) {
            if (tickerData.currentGroup) {
                tickerData.currentGroup.dividends.push({
                    date: tradeDate,
                    amount: result,
                    fees: fees
                });
            }
            tickerData.totalDividends += result;
            tickerData.totalFees += fees;
            return;
        }

        // Start a new trade group if buying and no current group or previous group is closed
        if (action.includes('buy') && (!tickerData.currentGroup || tickerData.currentGroup.netShares <= 0)) {
            tickerData.currentGroup = {
                openDate: tradeDate,
                closeDate: null,
                trades: [],
                dividends: [],
                netShares: 0,
                realizedPnL: 0,
                unrealizedPnL: 0,
                totalFees: 0,
                status: 'OPEN',
                percentClosed: 0
            };
            tickerData.tradeGroups.push(tickerData.currentGroup);
        }

        // Add trade to current group
        if (tickerData.currentGroup) {
            // Store the trade with all relevant information
            tickerData.currentGroup.trades.push({
                date: tradeDate,
                action,
                shares,
                price,
                fees,
                result
            });

            // Update group statistics
            if (action.includes('buy')) {
                tickerData.currentGroup.netShares += shares;
                tickerData.openPositions += shares;
            } else if (action.includes('sell')) {
                tickerData.currentGroup.netShares -= shares;
                tickerData.openPositions -= shares;
                // Use the actual result from Trading212
                tickerData.currentGroup.realizedPnL += result;
                tickerData.totalRealizedPnL += result;
            }

            // Update fees
            tickerData.currentGroup.totalFees += fees;
            tickerData.totalFees += fees;

            // Update group status
            if (tickerData.currentGroup.trades.length > 0) {
                const buyTrades = tickerData.currentGroup.trades.filter(t => t.action.includes('buy'));
                const totalBuyShares = buyTrades.reduce((sum, t) => sum + t.shares, 0);
                
                if (totalBuyShares > 0) {
            tickerData.currentGroup.percentClosed = 
                        ((totalBuyShares - tickerData.currentGroup.netShares) / totalBuyShares) * 100;
                }

            if (tickerData.currentGroup.netShares <= 0) {
                tickerData.currentGroup.status = 'CLOSED';
                tickerData.currentGroup.closeDate = tradeDate;
            } else if (tickerData.currentGroup.percentClosed > 0) {
                tickerData.currentGroup.status = 'PARTIALLY CLOSED';
                }
            }
        }
    });

    return Array.from(tickerGroups.values());
}

function displayGroupedTrades(groupedTrades) {
  // Display the grouped trades in a table or any other desired format
  console.table(groupedTrades);
}

function calculateDrawdownStats() {
    let peak = 0;
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let consecutiveLosses = 0;
    let maxConsecutiveLosses = 0;
    let runningTotal = 0;

    allTrades.forEach(trade => {
        const result = parseFloat(trade.Result) || 0;
        runningTotal += result;

        // Update peak if we have a new high
        if (runningTotal > peak) {
            peak = runningTotal;
            currentDrawdown = 0;
        } else {
            // Calculate current drawdown
            currentDrawdown = peak - runningTotal;
            // Update max drawdown if current drawdown is larger
            if (currentDrawdown > maxDrawdown) {
                maxDrawdown = currentDrawdown;
            }
        }

        // Track consecutive losses
        if (result < 0) {
            consecutiveLosses++;
            if (consecutiveLosses > maxConsecutiveLosses) {
                maxConsecutiveLosses = consecutiveLosses;
            }
        } else {
            consecutiveLosses = 0;
        }
    });

    return {
        peak,
        maxDrawdown,
        currentDrawdown,
        maxConsecutiveLosses
    };
}

async function updateDashboard() {
    try {
        // Calculate overall performance metrics
        const totalGain = allTrades.filter(t => parseFloat(t.Result) > 0)
            .reduce((sum, t) => sum + parseFloat(t.Result), 0);
        const totalLoss = allTrades.filter(t => parseFloat(t.Result) < 0)
            .reduce((sum, t) => sum + parseFloat(t.Result), 0);
        const winTrades = allTrades.filter(t => parseFloat(t.Result) > 0).length;
        const lossTrades = allTrades.filter(t => parseFloat(t.Result) < 0).length;
        const winRate = (winTrades / (winTrades + lossTrades) * 100).toFixed(2);

        // Calculate top symbols by P&L
        const symbolPnL = allTrades.reduce((acc, trade) => {
            const symbol = trade.Ticker;
            if (!acc[symbol]) acc[symbol] = 0;
            acc[symbol] += parseFloat(trade.Result) || 0;
            return acc;
        }, {});

        const topSymbols = Object.entries(symbolPnL)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        // Add drawdown statistics
        const drawdownStats = calculateDrawdownStats();
        
        // Update metrics display
        document.getElementById('totalReturn').textContent = formatCurrency(totalGain + totalLoss);
        document.getElementById('winRate').textContent = `${winRate}%`;
        document.getElementById('biggestWinner').textContent = formatCurrency(
            Math.max(...allTrades.map(t => parseFloat(t.Result) || 0))
        );
        document.getElementById('biggestLoser').textContent = formatCurrency(
            Math.min(...allTrades.map(t => parseFloat(t.Result) || 0))
        );

        // Update the main content HTML
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        // Keep existing filters and metrics grid
        const existingFilters = mainContent.querySelector('.filters');
        const existingMetrics = mainContent.querySelector('.metrics-grid');
        const existingCharts = mainContent.querySelector('.chart-section');
        const existingTable = mainContent.querySelector('.trades-table-container');

        // Update or create the performance metrics section
        const performanceMetrics = document.createElement('div');
        performanceMetrics.className = 'performance-metrics';
        performanceMetrics.innerHTML = `
                    <div class="metric">
                        <h3>Overall Performance</h3>
                        <div class="metric-row">
                            <span>Total Gain:</span>
                            <span class="profit">${formatCurrency(totalGain)}</span>
                            <span>${((totalGain / Math.abs(totalLoss)) * 100).toFixed(2)}%</span>
                        </div>
                        <div class="metric-row">
                            <span>Total Loss:</span>
                            <span class="loss">${formatCurrency(totalLoss)}</span>
                            <span>${((Math.abs(totalLoss) / totalGain) * 100).toFixed(2)}%</span>
                        </div>
                        <div class="metric-row">
                    <span>Gain/Loss Ratio:</span>
                            <span class="${totalGain + totalLoss > 0 ? 'profit' : 'loss'}">
                                ${((totalGain / Math.abs(totalLoss)) || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="metric">
                        <h3>Trade Statistics</h3>
                        <div class="metric-row">
                            <span>Win Rate:</span>
                            <span>${winRate}%</span>
                        </div>
                        <div class="metric-row">
                            <span>Win Trades:</span>
                            <span>${winTrades}</span>
                        </div>
                        <div class="metric-row">
                            <span>Loss Trades:</span>
                            <span>${lossTrades}</span>
                        </div>
                    </div>

                    <div class="metric">
                        <h3>Top Symbols</h3>
                        ${topSymbols.map(([symbol, pnl]) => `
                            <div class="metric-row">
                                <span>${symbol}:</span>
                                <span class="${pnl > 0 ? 'profit' : 'loss'}">${formatCurrency(pnl)}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div class="metric">
                <h3>Drawdown Statistics</h3>
                        <div class="metric-row">
                            <span>Max Drawdown:</span>
                            <span class="loss">${formatCurrency(drawdownStats.maxDrawdown)}</span>
                            <span>${((drawdownStats.maxDrawdown / drawdownStats.peak) * 100).toFixed(2)}%</span>
                        </div>
                        <div class="metric-row">
                            <span>Current Drawdown:</span>
                            <span class="${drawdownStats.currentDrawdown > 0 ? 'loss' : ''}">${formatCurrency(drawdownStats.currentDrawdown)}</span>
                            <span>${((drawdownStats.currentDrawdown / drawdownStats.peak) * 100).toFixed(2)}%</span>
                        </div>
                        <div class="metric-row">
                            <span>Max Consecutive Losses:</span>
                            <span class="loss">${drawdownStats.maxConsecutiveLosses}</span>
                </div>
            </div>
        `;

        // Insert the performance metrics after the metrics grid
        if (existingMetrics) {
            existingMetrics.insertAdjacentElement('afterend', performanceMetrics);
        }

    } catch (error) {
        console.error('Error updating dashboard:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// Update all dashboard statistics
function updateDashboardStats() {
    const stats = calculateTradeStats();
    
    // Update top stats bar
    const elements = {
        totalTrades: document.getElementById('totalTrades'),
        netPnL: document.getElementById('netPnL'),
        winRate: document.getElementById('winRate'),
        balance: document.getElementById('balance'),
        equity: document.getElementById('equity'),
        winRateDetailed: document.getElementById('winRateDetailed'),
        lossRate: document.getElementById('lossRate'),
        profitFactor: document.getElementById('profitFactor')
    };

    // Check if elements exist before updating
    if (elements.totalTrades) elements.totalTrades.textContent = stats.totalTrades;
    if (elements.netPnL) elements.netPnL.textContent = formatCurrency(stats.netPnL);
    if (elements.winRate) elements.winRate.textContent = `${(stats.winRate * 100).toFixed(1)}%`;
    if (elements.balance) elements.balance.textContent = formatCurrency(stats.balance);
    if (elements.equity) elements.equity.textContent = formatCurrency(stats.equity);

    // Update detailed stats panel
    if (elements.winRateDetailed) elements.winRateDetailed.textContent = `${(stats.winRate * 100).toFixed(1)}%`;
    if (elements.lossRate) elements.lossRate.textContent = `${(stats.lossRate * 100).toFixed(1)}%`;
    if (elements.profitFactor) elements.profitFactor.textContent = stats.profitFactor.toFixed(2);

    // Create or update main performance chart
    updatePerformanceOverview();
}

// Update performance overview chart
function updatePerformanceOverview() {
    const ctx = document.getElementById('equityCurve');
    if (!ctx) return;

    // Calculate cumulative equity curve data
    let runningBalance = 0;
    const chartData = allTrades
        .sort((a, b) => new Date(a.Time) - new Date(b.Time))
        .map(trade => {
            runningBalance += parseFloat(trade.Result) || 0;
            return {
                x: new Date(trade.Time),
                y: runningBalance
            };
        });

    // Create or update chart
    if (window.chartInstances?.equityCurve) {
        window.chartInstances.equityCurve.destroy();
    }

    window.chartInstances.equityCurve = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Portfolio Value',
                data: chartData,
                borderColor: '#00c853',
                backgroundColor: 'rgba(0, 200, 83, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Balance: ${formatCurrency(ctx.raw.y)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    grid: { display: false }
                },
                y: {
                    grid: { color: '#2a3744' },
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

// Common chart options
const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            backgroundColor: '#1c2630',
            titleColor: '#e4e8ef',
            bodyColor: '#e4e8ef',
            borderColor: '#363c4a',
            borderWidth: 1,
            padding: 10,
            displayColors: false
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            },
            ticks: {
                color: '#9ba1ae'
            }
        },
        y: {
            grid: {
                color: '#363c4a'
            },
            ticks: {
                color: '#9ba1ae'
            }
        }
    }
};

// Create equity curve chart
function createEquityCurveChart(ctx) {
    const data = calculateEquityCurveData();
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Equity',
                data: data.values,
                borderColor: '#00c853',
                backgroundColor: 'rgba(0, 200, 83, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            ...commonChartOptions,
            plugins: {
                ...commonChartOptions.plugins,
                tooltip: {
                    ...commonChartOptions.plugins.tooltip,
                    callbacks: {
                        label: (ctx) => `Equity: ${formatCurrency(ctx.raw)}`
                    }
                }
            }
        }
    });
}

// Initialize dashboard
function initDashboard() {
    console.log('Initializing dashboard...');
    
    // Update stats
    updateDashboardStats();
    
    // Add event listeners for navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}

// Global object to store chart instances
let chartInstances = {};

// Function to destroy existing charts
async function destroyCharts() {
    console.log('Destroying existing charts...');
    if (window.chartInstances) {
        for (const [id, chart] of Object.entries(window.chartInstances)) {
            if (chart && typeof chart.destroy === 'function') {
                try {
                    chart.destroy();
                    console.log(`Destroyed chart: ${id}`);
                } catch (e) {
                    console.warn(`Error destroying chart ${id}:`, e);
                }
            }
        }
        window.chartInstances = {};
    }
    // Wait for chart destruction to complete
    await new Promise(resolve => setTimeout(resolve, 100));
}

// Function to create charts
async function createCharts() {
        console.log('Starting chart creation...');
        
    try {
        if (!allTrades || allTrades.length === 0) {
            console.log('No trades data available');
            return;
        }
        
        // Destroy existing charts first
    destroyCharts();
        
        // Wait a moment for chart destruction to complete
        await new Promise(resolve => setTimeout(resolve, 100));
    
        // Get all chart contexts
        const contexts = {
            equityCurve: document.getElementById('equityCurve'),
            winLossRatio: document.getElementById('winLossRatio'),
            riskReward: document.getElementById('riskReward'),
            tradeDuration: document.getElementById('tradeDuration'),
            hourlyHeatmap: document.getElementById('hourlyHeatmap'),
            weeklyPerformance: document.getElementById('weeklyPerformance'),
            tradeEvaluation: document.getElementById('tradeEvaluation'),
            dailyPerformance: document.getElementById('dailyPerformance'),
            positionSize: document.getElementById('positionSize')
        };

        // Function to create equity curve chart
        function createEquityCurveChart(ctx) {
            const data = calculateEquityCurveData();
            return new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: 'Equity',
                        data: data,
                        borderColor: '#00c853',
                        backgroundColor: 'rgba(0, 200, 83, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        tooltip: {
                            ...commonOptions.plugins.tooltip,
                            callbacks: {
                                label: (ctx) => `Balance: ${formatCurrency(ctx.raw.y)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day',
                                displayFormats: {
                                    day: 'MMM d'
                                }
                            },
                            ...commonOptions.scales.x
                        },
                        y: {
                            ...commonOptions.scales.y,
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        // Function to create gain/loss distribution chart
        function createGainLossDistributionChart(ctx) {
            const { gains, losses } = calculateGainLossDistribution();
            return new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: gains.map((_, i) => `${i * 100}`),
                    datasets: [
                        {
                            label: 'Gains',
                            data: gains,
                            backgroundColor: 'rgba(0, 200, 83, 0.5)',
                            borderColor: '#00c853',
                        borderWidth: 1
                        },
                        {
                            label: 'Losses',
                            data: losses,
                            backgroundColor: 'rgba(255, 61, 87, 0.5)',
                            borderColor: '#ff3d57',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'P/L Range ($)',
                                color: '#9ba1ae'
                            },
                            ...commonOptions.scales.x
                        },
                        y: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Number of Trades',
                                color: '#9ba1ae'
                            },
                            ...commonOptions.scales.y
                        }
                    }
                }
            });
        }

        // Create charts one by one with proper error handling
        for (const [chartName, canvas] of Object.entries(contexts)) {
            // Skip advanced analytics charts, which will be created separately
            if (['riskReward', 'tradeDuration', 'hourlyHeatmap', 'tradeEvaluation'].includes(chartName)) {
                console.log(`Skipping advanced analytics chart ${chartName} in main loop`);
                continue;
            }
            if (!canvas) {
                console.log(`Chart element not found: ${chartName}`);
                continue;
            }
            
            try {
                // Clear any existing chart instance
                if (chartInstances[chartName]) {
                    chartInstances[chartName].destroy();
                    delete chartInstances[chartName];
                }
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.log(`Could not get context for: ${chartName}`);
                    continue;
                }

                // Create new chart based on type
                switch(chartName) {
                    case 'equityCurve':
                        chartInstances[chartName] = createEquityCurveChart(ctx);
                        break;
                    case 'winLossRatio':
                        chartInstances[chartName] = createGainLossDistributionChart(ctx);
                        break;
                    case 'weeklyPerformance':
                        chartInstances[chartName] = createGainLossDistributionChart(ctx);
                        break;
                    case 'dailyPerformance':
                        chartInstances[chartName] = createDailyPerformanceChart(ctx);
                        break;
                    case 'positionSize':
                        chartInstances[chartName] = createPositionSizeChart(ctx);
                        break;
                }
                
                // Add a small delay between chart creations
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.error(`Error creating ${chartName} chart:`, error);
            }
        }

        // Create advanced analytics charts
        chartInstances.riskReward = createRiskRewardChart();
        chartInstances.tradeDuration = createTradeDurationChart();
        chartInstances.hourlyHeatmap = createHourlyHeatmapChart();
        chartInstances.tradeEvaluation = createTradeEvaluationChart();
        
        console.log('Charts created successfully');
    } catch (error) {
        console.error('Error in chart creation process:', error);
    }
}

// Helper functions for chart data calculations
function calculateTradeScores() {
    return allTrades.map(trade => {
            const result = parseFloat(trade.Result) || 0;
            const price = parseFloat(trade['Price / share']) || 0;
            const shares = parseFloat(trade['No. of shares']) || 0;
            const positionSize = price * shares;
        const returnPercent = positionSize !== 0 ? (result / positionSize) * 100 : 0;
            
            let score = 5; // Base score
            
        // Add points based on return percentage
        if (returnPercent > 5) score += 2;
        else if (returnPercent > 2) score += 1;
        else if (returnPercent < -5) score -= 2;
        else if (returnPercent < -2) score -= 1;

        // Add points based on position size
        if (positionSize > 1000) score += 1;
        else if (positionSize > 5000) score += 2;

        // Add points based on trade duration
        const tradeDate = new Date(trade.Time);
        const durationHours = (tradeDate - new Date(trade['Time'])) / (1000 * 60 * 60);
        if (durationHours < 1) score += 1;
        else if (durationHours < 4) score += 2;

        // Ensure score stays within bounds
        return { x: tradeDate, y: Math.min(Math.max(score, 0), 10) };
        });
}

function calculateHourlyStats() {
    const hourlyData = Array(24).fill(0);
    const hourlyTrades = Array(24).fill(0);

    allTrades.forEach(trade => {
        const hour = new Date(trade.Time).getHours();
        const result = parseFloat(trade.Result) || 0;
        hourlyData[hour] += result;
        hourlyTrades[hour]++;
    });

    return { hourlyData, hourlyTrades };
}

function calculateDailyPerformance() {
    const dailyStats = {};
    allTrades.forEach(trade => {
        const date = new Date(trade.Time).toISOString().split('T')[0];
        if (!dailyStats[date]) {
            dailyStats[date] = {
                total: 0,
                trades: 0,
                wins: 0,
                losses: 0
            };
        }
        const result = parseFloat(trade.Result) || 0;
        dailyStats[date].total += result;
        dailyStats[date].trades++;
        if (result > 0) dailyStats[date].wins++;
        else if (result < 0) dailyStats[date].losses++;
    });

    const sortedDates = Object.keys(dailyStats).sort();
    const data = sortedDates.map(date => ({
            x: new Date(date),
        y: dailyStats[date].total
        }));

    return { data, dailyStats };
}

function createReturnsCurveChart(ctx) {
    // Destroy existing chart if it exists
    if (chartInstances.returnsCurve) {
        chartInstances.returnsCurve.destroy();
    }

    let runningTotal = 0;
    const cumulativeData = allTrades
        .sort((a, b) => new Date(a.Time) - new Date(b.Time))
        .map(trade => {
            const result = parseFloat(trade.Result) || 0;
            runningTotal += result;
            return {
                x: new Date(trade.Time),
                y: runningTotal
            };
        });

    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Portfolio Performance',
                data: cumulativeData,
                borderColor: '#00c7b6',
                backgroundColor: 'rgba(0, 199, 182, 0.1)',
                fill: true,
                tension: 0.1,
                borderWidth: 2,
                pointRadius: 0,
                pointHitRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#151c24',
                    titleColor: '#e0e0e0',
                    bodyColor: '#8f9ba8',
                    borderColor: '#2a3744',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => `P&L: ${formatCurrency(ctx.raw.y)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8f9ba8',
                        maxRotation: 0
                    }
                },
                y: {
                    grid: {
                        color: '#2a3744'
                    },
                    ticks: {
                        color: '#8f9ba8',
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function createMonthlyPerformanceChart() {
    const ctx = document.getElementById('monthlyPerformance');
    if (!ctx) return null;

    // Calculate monthly performance
    const monthlyData = {};
    allTrades.forEach(trade => {
        const date = new Date(trade.Time);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + (parseFloat(trade.Result) || 0);
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const chartData = sortedMonths.map(month => monthlyData[month]);
    const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleString('default', { month: 'short', year: '2-digit' });
    });

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: chartData,
                backgroundColor: chartData.map(value => value >= 0 ? '#26a69a80' : '#ef535080'),
                borderColor: chartData.map(value => value >= 0 ? '#26a69a' : '#ef5350'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `P&L: ${formatCurrency(context.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8f9ba8',
                        maxRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: '#2a3744'
                    },
                    ticks: {
                        color: '#8f9ba8',
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });

    return chart;
}

function createTradeEvaluationChart() {
    const ctx = document.getElementById('tradeEvaluation');
    if (!ctx) return null;

    // Calculate trade evaluation scores over time
    const evaluationData = allTrades
        .sort((a, b) => new Date(a.Time) - new Date(b.Time))
        .map(trade => {
            const date = new Date(trade.Time);
            const result = parseFloat(trade.Result) || 0;
            const price = parseFloat(trade['Price / share']) || 0;
            const shares = parseFloat(trade['No. of shares']) || 0;
            
            // Calculate score based on various factors
            let score = 5; // Base score
            const positionSize = price * shares;
            const returnPercent = (result / positionSize) * 100;
            
            // Adjust score based on return percentage
            if (result > 0) {
                score += returnPercent > 5 ? 3 : returnPercent > 2 ? 2 : 1;
            } else {
                score -= Math.abs(returnPercent) > 5 ? 3 : Math.abs(returnPercent) > 2 ? 2 : 1;
            }
            
            return {
                x: date,
                y: Math.max(0, Math.min(10, score)) // Ensure score is between 0 and 10
            };
        });

    return new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Trade Score',
                data: evaluationData,
                backgroundColor: evaluationData.map(d => d.y >= 7 ? '#26a69a80' : '#ef535080'),
                borderColor: evaluationData.map(d => d.y >= 7 ? '#26a69a' : '#ef5350'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `Score: ${context.raw.y.toFixed(1)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8f9ba8',
                        maxRotation: 45
                    }
                },
                y: {
                    min: 0,
                    max: 10,
                    grid: {
                        color: '#2a3744'
                    },
                    ticks: {
                        color: '#8f9ba8',
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createHourlyStatsChart() {
    const ctx = document.getElementById('hourlyStats');
    if (!ctx) return null;

    // Calculate hourly performance
    const hourlyData = Array(24).fill(0);
    const hourlyTrades = Array(24).fill(0);

    allTrades.forEach(trade => {
        const hour = new Date(trade.Time).getHours();
        const result = parseFloat(trade.Result) || 0;
        hourlyData[hour] += result;
        hourlyTrades[hour]++;
    });

    // Create labels for all 24 hours
    const labels = Array.from({length: 24}, (_, i) => 
        `${String(i).padStart(2, '0')}:00`
    );

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'P&L by Hour',
                data: hourlyData,
                backgroundColor: hourlyData.map(value => 
                    value >= 0 ? '#26a69a80' : '#ef535080'
                ),
                borderColor: hourlyData.map(value => 
                    value >= 0 ? '#26a69a' : '#ef5350'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => [
                            `P&L: ${formatCurrency(context.raw)}`,
                            `Trades: ${hourlyTrades[context.dataIndex]}`
                        ]
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8f9ba8'
                    }
                },
                y: {
                    grid: {
                        color: '#2a3744'
                    },
                    ticks: {
                        color: '#8f9ba8',
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function createDailyPerformanceChart() {
    const ctx = document.getElementById('dailyPerformance');
    if (!ctx) return null;

    // Calculate daily performance
    const dailyData = {};
    allTrades.forEach(trade => {
        const date = new Date(trade.Time).toISOString().split('T')[0];
        if (!dailyData[date]) {
            dailyData[date] = {
                total: 0,
                trades: 0,
                wins: 0,
                losses: 0
            };
        }
        const result = parseFloat(trade.Result) || 0;
        dailyData[date].total += result;
        dailyData[date].trades++;
        if (result > 0) dailyData[date].wins++;
        else if (result < 0) dailyData[date].losses++;
    });

    const sortedDates = Object.keys(dailyData).sort();
    const data = sortedDates.map(date => ({
        x: new Date(date),
        y: dailyData[date].total
    }));

    return new Chart(ctx, {
            type: 'bar',
            data: {
                datasets: [{
                    label: 'Daily P&L',
                data: data,
                backgroundColor: data.map(d => d.y >= 0 ? '#26a69a80' : '#ef535080'),
                borderColor: data.map(d => d.y >= 0 ? '#26a69a' : '#ef5350'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                legend: {
                    display: false
                },
                    tooltip: {
                        callbacks: {
                        label: (context) => {
                            const date = new Date(context.raw.x).toISOString().split('T')[0];
                            const stats = dailyData[date];
                            return [
                                `P&L: ${formatCurrency(context.raw.y)}`,
                                `Trades: ${stats.trades}`,
                                `Win Rate: ${((stats.wins / stats.trades) * 100).toFixed(1)}%`
                            ];
                        }
                        }
                    }
                },
                scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8f9ba8',
                        maxRotation: 45
                    }
                },
                    y: {
                        grid: {
                            color: '#2a3744'
                        },
                        ticks: {
                        color: '#8f9ba8',
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
}

// Add pattern recognition and analysis
function analyzeTradePatterns() {
    const patterns = {
        consecutiveWins: [],
        consecutiveLosses: [],
        timeOfDayPatterns: {},
        symbolPatterns: {},
        sizePatterns: {}
    };
    
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    
    allTrades.sort((a, b) => new Date(a.Time) - new Date(b.Time)).forEach(trade => {
        const result = parseFloat(trade.Result) || 0;
        const time = new Date(trade.Time);
        const hour = time.getHours();
        const symbol = trade.Ticker;
        const size = parseFloat(trade['No. of shares']) || 0;
        
        // Analyze consecutive patterns
        if (result > 0) {
            currentWinStreak++;
            if (currentLossStreak > 0) {
                patterns.consecutiveLosses.push(currentLossStreak);
                currentLossStreak = 0;
            }
        } else {
            currentLossStreak++;
            if (currentWinStreak > 0) {
                patterns.consecutiveWins.push(currentWinStreak);
                currentWinStreak = 0;
            }
        }
        
        // Analyze time of day patterns
        if (!patterns.timeOfDayPatterns[hour]) {
            patterns.timeOfDayPatterns[hour] = {
                trades: 0,
                wins: 0,
                totalPnL: 0
            };
        }
        patterns.timeOfDayPatterns[hour].trades++;
        if (result > 0) patterns.timeOfDayPatterns[hour].wins++;
        patterns.timeOfDayPatterns[hour].totalPnL += result;
        
        // Analyze symbol patterns
        if (!patterns.symbolPatterns[symbol]) {
            patterns.symbolPatterns[symbol] = {
                trades: 0,
                wins: 0,
                totalPnL: 0,
                avgSize: 0
            };
        }
        patterns.symbolPatterns[symbol].trades++;
        if (result > 0) patterns.symbolPatterns[symbol].wins++;
        patterns.symbolPatterns[symbol].totalPnL += result;
        patterns.symbolPatterns[symbol].avgSize = 
            (patterns.symbolPatterns[symbol].avgSize * (patterns.symbolPatterns[symbol].trades - 1) + size) / 
            patterns.symbolPatterns[symbol].trades;
        
        // Analyze position sizing patterns
        const sizeCategory = categorizeTrade(size);
        if (!patterns.sizePatterns[sizeCategory]) {
            patterns.sizePatterns[sizeCategory] = {
                trades: 0,
                wins: 0,
                totalPnL: 0
            };
        }
        patterns.sizePatterns[sizeCategory].trades++;
        if (result > 0) patterns.sizePatterns[sizeCategory].wins++;
        patterns.sizePatterns[sizeCategory].totalPnL += result;
    });
    
    return patterns;
}

function categorizeTrade(size) {
    if (size < 100) return 'Small (<100)';
    if (size < 500) return 'Medium (100-500)';
    if (size < 1000) return 'Large (500-1000)';
    return 'Extra Large (>1000)';
}

// Add position sizing calculator
function calculateOptimalPositionSize(accountSize, riskPerTrade, stopLoss) {
    const riskAmount = accountSize * (riskPerTrade / 100);
    const shares = Math.floor(riskAmount / stopLoss);
    
    return {
        shares,
        riskAmount,
        maxLoss: shares * stopLoss,
        riskPercentage: (shares * stopLoss / accountSize) * 100
    };
}

// Add trading session analysis
function analyzeSessionPerformance() {
    const sessions = {
        preMarket: { start: 4, end: 9.5 },
        marketOpen: { start: 9.5, end: 11 },
        midDay: { start: 11, end: 14 },
        marketClose: { start: 14, end: 16 },
        afterHours: { start: 16, end: 20 }
    };
    
    const sessionStats = Object.keys(sessions).reduce((acc, session) => {
        acc[session] = {
            trades: 0,
            wins: 0,
            losses: 0,
            totalPnL: 0,
            avgPnL: 0,
            largestWin: 0,
            largestLoss: 0
        };
        return acc;
    }, {});
    
    allTrades.forEach(trade => {
        const time = new Date(trade.Time);
        const hour = time.getHours() + time.getMinutes() / 60;
        const result = parseFloat(trade.Result) || 0;
        
        // Determine which session this trade belongs to
        const session = Object.entries(sessions).find(([, period]) => 
            hour >= period.start && hour < period.end
        );
        
        if (session) {
            const [sessionName] = session;
            const stats = sessionStats[sessionName];
            
            stats.trades++;
            stats.totalPnL += result;
            stats.avgPnL = stats.totalPnL / stats.trades;
            
            if (result > 0) {
                stats.wins++;
                stats.largestWin = Math.max(stats.largestWin, result);
            } else if (result < 0) {
                stats.losses++;
                stats.largestLoss = Math.min(stats.largestLoss, result);
            }
        }
    });
    
    return sessionStats;
}

// Add these new sections to the dashboard
function addAdvancedAnalytics() {
    const patterns = analyzeTradePatterns();
    const sessionStats = analyzeSessionPerformance();
    
    const analyticsHtml = `
        <div class="advanced-analytics">
            <div class="patterns-analysis">
                <h3>Trade Patterns</h3>
                <div class="pattern-stats">
                    <div class="pattern-metric">
                        <span>Avg Win Streak:</span>
                        <span>${(patterns.consecutiveWins.reduce((a, b) => a + b, 0) / patterns.consecutiveWins.length || 0).toFixed(1)}</span>
                    </div>
                    <div class="pattern-metric">
                        <span>Avg Loss Streak:</span>
                        <span>${(patterns.consecutiveLosses.reduce((a, b) => a + b, 0) / patterns.consecutiveLosses.length || 0).toFixed(1)}</span>
                    </div>
                </div>
                
                <div class="best-hours">
                    <h4>Best Trading Hours</h4>
                    ${Object.entries(patterns.timeOfDayPatterns)
                        .sort(([,a], [,b]) => b.totalPnL - a.totalPnL)
                        .slice(0, 5)
                        .map(([hour, stats]) => `
                            <div class="hour-stat">
                                <span>${hour}:00</span>
                                <span>${formatCurrency(stats.totalPnL)}</span>
                                <span>${((stats.wins / stats.trades) * 100).toFixed(1)}%</span>
                            </div>
                        `).join('')}
                </div>
            </div>
            
            <div class="session-analysis">
                <h3>Session Performance</h3>
                ${Object.entries(sessionStats).map(([session, stats]) => `
                    <div class="session-stat">
                        <h4>${session}</h4>
                        <div class="session-metrics">
                            <div class="metric-row">
                                <span>Win Rate:</span>
                                <span>${((stats.wins / stats.trades) * 100).toFixed(1)}%</span>
                            </div>
                            <div class="metric-row">
                                <span>Avg P&L:</span>
                                <span class="${stats.avgPnL >= 0 ? 'profit' : 'loss'}">${formatCurrency(stats.avgPnL)}</span>
                            </div>
                            <div class="metric-row">
                                <span>Largest Win:</span>
                                <span class="profit">${formatCurrency(stats.largestWin)}</span>
                            </div>
                            <div class="metric-row">
                                <span>Largest Loss:</span>
                                <span class="loss">${formatCurrency(stats.largestLoss)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="position-sizing">
                <h3>Position Sizing Calculator</h3>
                <div class="calculator-inputs">
                    <div class="input-group">
                        <label for="accountSize">Account Size:</label>
                        <input type="number" id="accountSize" value="100000">
                    </div>
                    <div class="input-group">
                        <label for="riskPerTrade">Risk per Trade (%):</label>
                        <input type="number" id="riskPerTrade" value="1" step="0.1">
                    </div>
                    <div class="input-group">
                        <label for="stopLoss">Stop Loss ($):</label>
                        <input type="number" id="stopLoss" value="0.50" step="0.01">
                    </div>
                    <button id="calculatePosition">Calculate</button>
                </div>
                <div id="positionResults" class="calculator-results"></div>
            </div>
        </div>
    `;
    
    document.querySelector('.performance-metrics').insertAdjacentHTML('beforeend', analyticsHtml);
    
    // Add event listener for position sizing calculator
    document.getElementById('calculatePosition').addEventListener('click', () => {
        const accountSize = parseFloat(document.getElementById('accountSize').value);
        const riskPerTrade = parseFloat(document.getElementById('riskPerTrade').value);
        const stopLoss = parseFloat(document.getElementById('stopLoss').value);
        
        const results = calculateOptimalPositionSize(accountSize, riskPerTrade, stopLoss);
        
        document.getElementById('positionResults').innerHTML = `
            <div class="result-row">
                <span>Recommended Shares:</span>
                <span>${results.shares}</span>
            </div>
            <div class="result-row">
                <span>Risk Amount:</span>
                <span>${formatCurrency(results.riskAmount)}</span>
            </div>
            <div class="result-row">
                <span>Max Loss:</span>
                <span>${formatCurrency(results.maxLoss)}</span>
            </div>
            <div class="result-row">
                <span>Risk %:</span>
                <span>${results.riskPercentage.toFixed(2)}%</span>
            </div>
        `;
    });
}

function calculateTradeScore(trade) {
    let score = 5; // Base score
    const result = parseFloat(trade.Result) || 0;
    const price = parseFloat(trade['Price / share']) || 0;
    const shares = parseFloat(trade['No. of shares']) || 0;

    // Adjust score based on profit/loss
    if (result > 0) {
        // Profitable trade
        const returnPercent = (result / (price * shares)) * 100;
        if (returnPercent > 5) score += 2;
        else if (returnPercent > 2) score += 1;
    } else {
        // Losing trade
        const lossPercent = (Math.abs(result) / (price * shares)) * 100;
        if (lossPercent > 5) score -= 2;
        else if (lossPercent > 2) score -= 1;
    }

    // Adjust for position sizing (assuming ideal position size is 1-2% of account)
    const accountSize = 100000; // You might want to make this configurable
    const positionSizePercent = ((price * shares) / accountSize) * 100;
    if (positionSizePercent > 5) score -= 1;
    else if (positionSizePercent < 0.5) score -= 1;

    // Ensure score stays within bounds
    return Math.max(0, Math.min(10, score));
}

function calculateTradeDuration(trade) {
    const start = new Date(trade.Time);
    const end = trade['Exit Time'] ? new Date(trade['Exit Time']) : new Date();
    const diff = end - start;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function getFilteredTrades() {
    return allTrades.filter(trade => {
        // Apply symbol filter
        if (filters.symbol && !trade.Ticker.toLowerCase().includes(filters.symbol)) {
            return false;
        }

        // Apply side filter
        if (filters.side && trade.Action.toLowerCase() !== filters.side.toLowerCase()) {
            return false;
        }

        // Apply date filter
        if (filters.date) {
            const tradeDate = new Date(trade.Time).toISOString().split('T')[0];
            if (tradeDate !== filters.date) {
                return false;
            }
        }

        // Apply status filter
        if (filters.status && trade.Status !== filters.status) {
            return false;
        }

        return true;
    }).sort((a, b) => {
        const aValue = a[currentSort.column];
        const bValue = b[currentSort.column];
        
        // Handle numeric values
        if (!isNaN(parseFloat(aValue)) && !isNaN(parseFloat(bValue))) {
            return currentSort.direction === 'asc' 
                ? parseFloat(aValue) - parseFloat(bValue)
                : parseFloat(bValue) - parseFloat(aValue);
        }
        
        // Handle dates
        if (currentSort.column === 'Time') {
            return currentSort.direction === 'asc'
                ? new Date(aValue) - new Date(bValue)
                : new Date(bValue) - new Date(aValue);
        }
        
        // Handle strings
        return currentSort.direction === 'asc'
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
    });
}

function paginateTrades(trades) {
    const startIndex = (currentPage - 1) * tradesPerPage;
    return trades.slice(startIndex, startIndex + tradesPerPage);
}

// Add this function to handle pagination
function setupPaginationListeners() {
    const prevBtn = document.querySelector('.prev-page');
    const nextBtn = document.querySelector('.next-page');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                populateTradesTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalItems = getFilteredTrades().length;
            const totalPages = Math.ceil(totalItems / tradesPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                populateTradesTable();
            }
        });
    }
}

// Add pagination click handler
function handlePaginationClick(e) {
    const target = e.target;
    if (target.classList.contains('prev-page')) {
        if (currentPage > 1) {
            currentPage--;
            populateTradesTable();
        }
    } else if (target.classList.contains('next-page')) {
        const totalItems = getFilteredTrades().length;
        const totalPages = Math.ceil(totalItems / tradesPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            populateTradesTable();
        }
    }
}

function initializeFilters() {
    // Get filter elements
    const symbolFilter = document.getElementById('symbolFilter');
    const sideFilter = document.getElementById('sideFilter');
    const dateFilter = document.getElementById('dateFilter');
    const statusFilter = document.getElementById('statusFilter');
    const clearFilterBtn = document.getElementById('clearFilter');

    // Add event listeners for filters
    if (symbolFilter) {
        symbolFilter.addEventListener('input', (e) => {
            filters.symbol = e.target.value.toLowerCase();
            currentPage = 1;
            populateTradesTable();
        });
    }

    if (sideFilter) {
        sideFilter.addEventListener('change', (e) => {
            filters.side = e.target.value;
            currentPage = 1;
            populateTradesTable();
        });
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            filters.date = e.target.value;
            currentPage = 1;
            populateTradesTable();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            filters.status = e.target.value;
            currentPage = 1;
            populateTradesTable();
        });
    }

    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', clearFilters);
    }
}

function clearFilters() {
    // Reset filter values
    filters.symbol = '';
    filters.side = '';
    filters.date = '';
    filters.status = '';

    // Reset filter UI elements
    const symbolFilter = document.getElementById('symbolFilter');
    const sideFilter = document.getElementById('sideFilter');
    const dateFilter = document.getElementById('dateFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (symbolFilter) symbolFilter.value = '';
    if (sideFilter) sideFilter.value = '';
    if (dateFilter) dateFilter.value = '';
    if (statusFilter) statusFilter.value = '';

    // Reset to first page and update table
    currentPage = 1;
    populateTradesTable();
}

function setupTableSorting() {
    const headers = document.querySelectorAll('th[data-sortable]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column.toLowerCase();
            
            // Toggle sort direction if clicking the same column
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }

            // Update sort indicators
            headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            header.classList.add(`sort-${currentSort.direction}`);

            // Update table with new sort
            populateTradesTable();
        });
    });
}

// Update the trade metrics calculation function
function calculateTradeStats() {
    // Calculate total trades
    const totalTradeCount = allTrades.length;
    
    // Calculate net P&L
    const totalPnL = allTrades.reduce((sum, trade) => sum + (parseFloat(trade.Result) || 0), 0);
    
    // Calculate win/loss metrics
    const profitableTrades = allTrades.filter(t => parseFloat(t.Result) > 0);
    const unprofitableTrades = allTrades.filter(t => parseFloat(t.Result) < 0);
    
    const winningRate = profitableTrades.length / totalTradeCount;
    const losingRate = unprofitableTrades.length / totalTradeCount;
    
    // Calculate profit factor
    const grossProfit = profitableTrades.reduce((sum, t) => sum + parseFloat(t.Result), 0);
    const grossLoss = Math.abs(unprofitableTrades.reduce((sum, t) => sum + parseFloat(t.Result), 0));
    const profitabilityFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
    
    // Calculate balance and equity
    const currentBalance = totalPnL;
    const currentEquity = currentBalance;
    
    // Calculate R-multiple
    const winningTrade = allTrades.reduce((max, trade) =>
        parseFloat(trade.Result) > max.result ? {result: parseFloat(trade.Result)} : max,
        {result: -Infinity}
    );
    const losingTrade = allTrades.reduce((min, trade) =>
        parseFloat(trade.Result) < min.result ? {result: parseFloat(trade.Result)} : min,
        {result: Infinity}
    );
    const rMultiple = Math.abs(losingTrade.result) > 0 ?
        Math.abs(winningTrade.result / losingTrade.result) : 0;

    return {
        totalTrades: totalTradeCount,
        netPnL: totalPnL,
        winRate: winningRate,
        lossRate: losingRate,
        profitFactor: profitabilityFactor,
        balance: currentBalance,
        equity: currentEquity,
        rMultiple: rMultiple
    };

    // Calculate holding periods for completed trades
    const holdingPeriods = [];
    let completedTrades = 0;
    let winningTrades = 0;

    // Match buy trades with corresponding sell trades
    let remainingShares = 0;
    let firstBuyDate = null;
    let weightedHoldingDays = 0;
    let totalTradeValue = 0;

    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedTrades.forEach(trade => {
        if (trade.action.includes('buy')) {
            if (!firstBuyDate) firstBuyDate = new Date(trade.date);
            remainingShares += trade.shares;
        } else if (trade.action.includes('sell')) {
            const sellDate = new Date(trade.date);
            const holdingDays = (sellDate - firstBuyDate) / (1000 * 60 * 60 * 24);
            holdingPeriods.push(holdingDays);
            
            // Weight the holding period by the trade value
            const tradeValue = trade.shares * trade.price;
            weightedHoldingDays += holdingDays * tradeValue;
            totalTradeValue += tradeValue;
            
            completedTrades++;
            if (trade.result > 0) winningTrades++;
            
            remainingShares -= trade.shares;
            if (remainingShares <= 0) firstBuyDate = null;
        }
    });

    // Calculate average holding period (weighted by trade value) with additional safeguards
    let avgHoldingPeriod = 0;
    try {
        avgHoldingPeriod = totalTradeValue > 0 && weightedHoldingDays ? weightedHoldingDays / totalTradeValue : 0;
    } catch (error) {
        console.warn('Error calculating average holding period:', error);
        avgHoldingPeriod = 0;
    }
    
    // Calculate win rate
    const winRate = completedTrades > 0 ? (winningTrades / completedTrades) * 100 : 0;

    // Removed duplicate R-multiple calculation as it's now handled in the main return object

    // Calculate volatility (standard deviation of returns)
    const returns = trades
        .filter(t => t.action.includes('sell'))
        .map(t => (t.result / (t.shares * t.price)) * 100);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    return {
        avgBuyPrice,
        avgSellPrice,
        totalPnL,
        returnPercent,
        totalBuyShares,
        totalSellShares,
        avgHoldingPeriod,
        winRate,
        completedTrades,
        volatility
    };
}

// Update the trade group HTML generation
function generateTradeGroupHTML(group) {
    const metrics = calculateTradeStats();
    const hasCompletedTrades = group.trades.filter(t => t.action.includes('sell')).length > 0;
    
    return `
        <div class="trade-group ${group.status.toLowerCase()}" 
             role="region" 
             aria-label="Trade group for ${group.symbol}">
            <div class="trade-group-header" role="button" tabindex="0">
                <div class="group-info">
                    <button class="expand-legs-btn collapsed" 
                            aria-label="Toggle trade details" 
                            aria-expanded="false">
                        <span aria-hidden="true">▶</span>
                    </button>
                    <div class="group-date-status">
                        <span class="group-date" role="text">
                            ${group.openDate.toLocaleDateString()} - 
                            ${group.closeDate ? group.closeDate.toLocaleDateString() : 'Open'}
                        </span>
                        <span class="status-badge ${group.status?.toLowerCase() || ''}" role="status">
                            ${group.status || 'Unknown'}${group.status === 'PARTIALLY CLOSED' && group.percentClosed != null ?
                            ` (${formatNumber(group.percentClosed, { isPercentage: true })})` : ''}
                        </span>
                    </div>
                </div>
                <div class="group-summary" role="group" aria-label="Trade summary">
                    <div class="summary-item">
                        <span class="summary-label" id="position-${group.id}">Position:</span>
                        <span class="summary-value" aria-labelledby="position-${group.id}">
                            ${formatNumber(metrics.totalBuyShares, { isShares: true })} shares
                        </span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label" id="avgprice-${group.id}">Avg Price:</span>
                        <span class="summary-value" aria-labelledby="avgprice-${group.id}">
                            ${formatNumber(metrics.avgBuyPrice, { isCurrency: true })}
                        </span>
                    </div>
                    ${hasCompletedTrades ? `
                        <div class="summary-item">
                            <span class="summary-label" id="return-${group.id}">Return:</span>
                            <span class="summary-value ${metrics.returnPercent >= 0 ? 'profit' : 'loss'}" 
                                  aria-labelledby="return-${group.id}">
                                ${formatNumber(metrics.returnPercent, { isPercentage: true })}
                            </span>
                        </div>
                    ` : ''}
                    <div class="summary-item">
                        <span class="summary-label" id="pnl-${group.id}">P&L:</span>
                        <span class="summary-value ${group.realizedPnL !== 0 ? (group.realizedPnL > 0 ? 'profit' : 'loss') : ''}"
                              aria-labelledby="pnl-${group.id}">
                            ${formatNumber(group.realizedPnL, { isCurrency: true })}
                        </span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label" id="holdtime-${group.id}">Hold Time:</span>
                        <span class="summary-value" aria-labelledby="holdtime-${group.id}">
                            ${(metrics.avgHoldingPeriod || 0).toFixed(1)}d
                        </span>
                    </div>
                </div>
            </div>
            <div class="trade-details hidden" 
                 role="region" 
                 aria-label="Detailed trade metrics"
                 aria-expanded="false">
                <div class="metrics-grid">
                    <div class="metrics-section" role="group" aria-label="Price Analysis">
                        <h4>Price Analysis</h4>
                        <div class="metric-item">
                            <span class="metric-label" id="avgbuy-${group.id}">Avg Buy Price:</span>
                            <span class="metric-value" aria-labelledby="avgbuy-${group.id}">
                                ${formatNumber(metrics.avgBuyPrice, { isCurrency: true })}
                            </span>
                        </div>
                        ${hasCompletedTrades ? `
                            <div class="metric-item">
                                <span class="metric-label" id="avgsell-${group.id}">Avg Sell Price:</span>
                                <span class="metric-value" aria-labelledby="avgsell-${group.id}">
                                    ${formatNumber(metrics.avgSellPrice, { isCurrency: true })}
                                </span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label" id="detailreturn-${group.id}">Return:</span>
                                <span class="metric-value ${metrics.returnPercent >= 0 ? 'profit' : 'loss'}"
                                      aria-labelledby="detailreturn-${group.id}">
                                    ${formatNumber(metrics.returnPercent, { isPercentage: true })}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="metrics-section" role="group" aria-label="Performance Stats">
                        <h4>Performance Stats</h4>
                        <div class="metric-item">
                            <span class="metric-label" id="winrate-${group.id}">Win Rate:</span>
                            <span class="metric-value ${metrics.winRate >= 50 ? 'profit' : 'loss'}"
                                  aria-labelledby="winrate-${group.id}">
                                ${formatNumber(metrics.winRate, { isPercentage: true })}
                            </span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label" id="riskreward-${group.id}">Risk/Reward:</span>
                            <span class="metric-value" aria-labelledby="riskreward-${group.id}">
                                ${metrics.rMultiple.toFixed(2)}
                            </span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label" id="volatility-${group.id}">Volatility:</span>
                            <span class="metric-value" aria-labelledby="volatility-${group.id}">
                                ${formatNumber(metrics.volatility, { isPercentage: true })}
                            </span>
                        </div>
                    </div>
                    <div class="metrics-section" role="group" aria-label="Trade Summary">
                        <h4>Trade Summary</h4>
                        <div class="metric-item">
                            <span class="metric-label" id="totalpnl-${group.id}">Total P&L:</span>
                            <span class="metric-value ${group.realizedPnL >= 0 ? 'profit' : 'loss'}"
                                  aria-labelledby="totalpnl-${group.id}">
                                ${formatNumber(group.realizedPnL, { isCurrency: true })}
                            </span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label" id="dividends-${group.id}">Dividends:</span>
                            <span class="metric-value profit" aria-labelledby="dividends-${group.id}">
                                ${formatNumber(group.dividends.reduce((sum, d) => sum + d.amount, 0), { isCurrency: true })}
                            </span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label" id="fees-${group.id}">Fees:</span>
                            <span class="metric-value loss" aria-labelledby="fees-${group.id}">
                                ${formatNumber(group.totalFees, { isCurrency: true })}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="trade-legs" role="table" aria-label="Trade details">
                    <table class="nested-trades-table">
                        <thead>
                            <tr>
                                <th scope="col">Date</th>
                                <th scope="col">Action</th>
                                <th scope="col">Shares</th>
                                <th scope="col">Price</th>
                                <th scope="col">Result</th>
                                <th scope="col">Return %</th>
                                <th scope="col">Fees</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.trades.map(trade => {
                                const tradeReturn = trade.action.includes('sell') && metrics.avgBuyPrice > 0 ? 
                                    ((trade.price - metrics.avgBuyPrice) / metrics.avgBuyPrice) * 100 : null;
                                
                                return `
                                    <tr class="${trade.action.includes('buy') ? 'buy-row' : 'sell-row'}"
                                        role="row">
                                        <td role="cell">${new Date(trade.date).toLocaleDateString()}</td>
                                        <td role="cell">
                                            <span class="trade-action ${trade.action.includes('buy') ? 'buy-action' : 'sell-action'}">
                                                ${trade.action.toUpperCase()}
                                            </span>
                                        </td>
                                        <td role="cell">${formatNumber(trade.shares, { isShares: true })}</td>
                                        <td role="cell">${formatNumber(trade.price, { isCurrency: true })}</td>
                                        <td role="cell" class="${trade.result !== 0 ? (trade.result > 0 ? 'profit' : 'loss') : ''}">
                                            ${formatNumber(trade.result, { isCurrency: true })}
                                        </td>
                                        <td role="cell" class="${tradeReturn ? (tradeReturn >= 0 ? 'profit' : 'loss') : ''}">
                                            ${tradeReturn ? formatNumber(tradeReturn, { isPercentage: true }) : '-'}
                                        </td>
                                        <td role="cell" class="${trade.fees > 0 ? 'loss' : ''}">
                                            ${formatNumber(trade.fees, { isCurrency: true })}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${group.dividends.map(div => `
                                <tr class="dividend-row" role="row">
                                    <td role="cell">${new Date(div.date).toLocaleDateString()}</td>
                                    <td role="cell">
                                        <span class="trade-action dividend-action">DIVIDEND</span>
                                    </td>
                                    <td role="cell">-</td>
                                    <td role="cell">-</td>
                                    <td role="cell" class="profit">
                                        ${formatNumber(div.amount, { isCurrency: true })}
                                    </td>
                                    <td role="cell">-</td>
                                    <td role="cell" class="${div.fees > 0 ? 'loss' : ''}">
                                        ${formatNumber(div.fees, { isCurrency: true })}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Update the populateTradesTable function
function populateTradesTable() {
    const tableBody = document.getElementById('tradesTableBody');
    if (!tableBody) return;

    // Process trades into groups
    let tickerGroups = processTradeGroups();
    
    // Apply sorting
    tickerGroups = sortTickerGroups(tickerGroups);
    
    // Clear existing rows
    tableBody.innerHTML = '';

    // Add ticker group rows
    tickerGroups.forEach(tickerData => {
        // Create main ticker row
        const tickerRow = document.createElement('tr');
        tickerRow.className = 'ticker-row';
        tickerRow.innerHTML = `
            <td>
                <button class="expand-ticker-btn collapsed" 
                        aria-label="Toggle ticker details"
                        aria-expanded="false">
                    <span aria-hidden="true">▶</span>
                </button>
            </td>
            <td>${tickerData.ticker}</td>
            <td>${tickerData.lastTradeDate.toLocaleDateString()}</td>
            <td>${tickerData.tradeGroups.length}</td>
            <td class="${tickerData.totalUnrealizedPnL !== 0 ? (tickerData.totalUnrealizedPnL > 0 ? 'profit' : 'loss') : ''}">
                ${formatNumber(tickerData.totalUnrealizedPnL, { isCurrency: true })}
            </td>
            <td class="${tickerData.totalRealizedPnL !== 0 ? (tickerData.totalRealizedPnL > 0 ? 'profit' : 'loss') : ''}">
                ${formatNumber(tickerData.totalRealizedPnL, { isCurrency: true })}
            </td>
            <td class="${tickerData.totalDividends > 0 ? 'profit' : ''}">
                ${formatNumber(tickerData.totalDividends, { isCurrency: true })}
            </td>
            <td class="${tickerData.totalFees > 0 ? 'loss' : ''}">
                ${formatNumber(tickerData.totalFees, { isCurrency: true })}
            </td>
            <td>${formatNumber(tickerData.openPositions, { isShares: true })}</td>
            <td>
                <button class="action-btn view-details-btn">
                    <span class="btn-icon">📊</span>
                    <span class="btn-text">View Details</span>
                </button>
            </td>
        `;
        tableBody.appendChild(tickerRow);

        // Create container for trade groups
        const groupsContainer = document.createElement('tr');
        groupsContainer.className = 'trade-groups-container hidden';
        groupsContainer.innerHTML = `
            <td colspan="10">
                <div class="trade-groups">
                    ${tickerData.tradeGroups.map(group => generateTradeGroupHTML(group)).join('')}
                </div>
            </td>
        `;
        tableBody.appendChild(groupsContainer);

        // Add click handler for ticker expansion
        const expandTickerBtn = tickerRow.querySelector('.expand-ticker-btn');
        expandTickerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCollapsed = expandTickerBtn.classList.contains('collapsed');
            const newState = !isCollapsed;
            
            // Update button state
            expandTickerBtn.setAttribute('aria-expanded', newState.toString());
            expandTickerBtn.innerHTML = `<span aria-hidden="true">${newState ? '▼' : '▶'}</span>`;
            expandTickerBtn.classList.toggle('collapsed');
            
            // Toggle groups container
            groupsContainer.classList.toggle('hidden');
            
            // Announce state change to screen readers
            const announcement = document.createElement('div');
            announcement.setAttribute('role', 'status');
            announcement.setAttribute('aria-live', 'polite');
            announcement.className = 'sr-only';
            announcement.textContent = `Ticker details ${newState ? 'expanded' : 'collapsed'}`;
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 1000);
        });

        // Add keyboard support for ticker expansion
        expandTickerBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                expandTickerBtn.click();
            }
        });

        // Ensure trade legs are collapsed by default
        groupsContainer.querySelectorAll('.trade-group').forEach(group => {
            const tradeDetails = group.querySelector('.trade-details');
            const expandBtn = group.querySelector('.expand-legs-btn');
            if (tradeDetails && expandBtn) {
                tradeDetails.classList.add('hidden');
                expandBtn.classList.add('collapsed');
                expandBtn.setAttribute('aria-expanded', 'false');
                expandBtn.innerHTML = '<span aria-hidden="true">▶</span>';
            }
        });

        // Add click handlers for trade legs expansion
        groupsContainer.querySelectorAll('.expand-legs-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = btn.classList.contains('collapsed');
                const newState = !isCollapsed;
                
                // Update button state
                btn.setAttribute('aria-expanded', newState.toString());
                btn.innerHTML = `<span aria-hidden="true">${newState ? '▼' : '▶'}</span>`;
                btn.classList.toggle('collapsed');
                
                // Update details section
                const tradeGroup = btn.closest('.trade-group');
                const tradeDetails = tradeGroup.querySelector('.trade-details');
                tradeDetails.classList.toggle('hidden');
                tradeDetails.setAttribute('aria-expanded', newState.toString());
                
                // Announce state change to screen readers
                const announcement = document.createElement('div');
                announcement.setAttribute('role', 'status');
                announcement.setAttribute('aria-live', 'polite');
                announcement.className = 'sr-only';
                announcement.textContent = `Trade details ${newState ? 'expanded' : 'collapsed'}`;
                document.body.appendChild(announcement);
                setTimeout(() => announcement.remove(), 1000);
            });
            
            // Add keyboard support
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });
    });
}

// Add sorting function for ticker groups
function sortTickerGroups(groups) {
    return groups.sort((a, b) => {
        const aValue = getSortValue(a);
        const bValue = getSortValue(b);
        
        if (currentSort.direction === 'asc') {
            return compareValues(aValue, bValue);
        } else {
            return compareValues(bValue, aValue);
        }
    });
}

function getSortValue(tickerData) {
    switch (currentSort.column) {
        case 'ticker':
            return tickerData.ticker.toLowerCase(); // Case-insensitive sorting for tickers
        case 'lasttradedate':
            return tickerData.lastTradeDate;
        case 'groupcount':
            return tickerData.tradeGroups.length;
        case 'unrealizedpnl':
            return tickerData.totalUnrealizedPnL || 0; // Handle null/undefined values
        case 'realizedpnl':
            return tickerData.totalRealizedPnL || 0;
        case 'dividends':
            return tickerData.totalDividends || 0;
        case 'fees':
            return tickerData.totalFees || 0;
        case 'openpositions':
            return tickerData.openPositions || 0;
        default:
            return tickerData.ticker.toLowerCase();
    }
}

function compareValues(a, b) {
    // Handle null/undefined values
    if (a === null || a === undefined) return 1;
    if (b === null || b === undefined) return -1;
    
    // Handle dates
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime();
    }
    
    // Handle strings (case-insensitive)
    if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
    }
    
    // Handle numbers
    if (typeof a === 'number' && typeof b === 'number') {
        if (isNaN(a)) return 1;
        if (isNaN(b)) return -1;
        return a - b;
    }
    
    // Convert to strings as fallback
    return String(a).localeCompare(String(b));
}

// Add this helper function for number formatting
function formatNumber(value, options = {}) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';

    // Handle very small numbers (close to 0)
    if (Math.abs(num) < 1e-10) return '0';

    // For share quantities, show up to 4 decimal places if it's a partial share
    if (options.isShares) {
        if (Number.isInteger(num)) return num.toString();
        return num.toFixed(4);
    }

    // For currency values
    if (options.isCurrency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    }

    // For percentages
    if (options.isPercentage) {
        return `${num.toFixed(2)}%`;
    }

    return num.toString();
}

// Single performance chart initialization function
// Remove redundant function as createCharts now handles all chart initialization

// Single initialization function
async function initializeApplication() {
    console.log('DOM loaded, initializing application...');
    await loadData();
    await initDashboard();
    initializePerformanceCharts();
}

// Single event listener for initialization
document.addEventListener('DOMContentLoaded', initializeApplication);

// Ensure initDashboard is defined
function initDashboard() {
    const trades = window.tradeData; // Use global tradeData from loadData()
    if (!trades) return;

    updateMetrics(trades);
    renderCharts(trades);
}

// Single application initialization function
async function initializeApplication() {
    console.log('DOM loaded, initializing application...');
    try {
        // Initialize chartInstances if not exists
        window.chartInstances = window.chartInstances || {};
        
        // Load data first
        await loadData();
        
        // Update dashboard stats
        updateDashboardStats();
        
        // Wait for DOM updates
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during application initialization:', error);
    }
}

// Helper function to calculate equity curve data
function calculateEquityCurveData() {
    let equity = 0;
    return allTrades.map(trade => {
        equity += parseFloat(trade.Result || 0);
        return {
            x: new Date(trade.Time),
            y: equity
        };
    }).sort((a, b) => a.x - b.x);
}

// Function to create equity curve chart
function createEquityCurveChart(ctx) {
    const data = calculateEquityCurveData();
    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Equity Curve',
                data: data,
                borderColor: '#00c853',
                backgroundColor: 'rgba(0, 200, 83, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Balance: ${formatCurrency(ctx.raw.y)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    grid: { display: false }
                },
                y: {
                    grid: { color: '#2a3744' },
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

// Helper function to get ISO week number
function getWeekNumber(date) {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}

// Helper function to get week start date
function getWeekStartDate(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Function to calculate weekly performance
function calculateWeeklyPerformance() {
    const weeklyData = {};
    
    allTrades.forEach(trade => {
        const date = new Date(trade.Time);
        const weekStart = getWeekStartDate(date);
        const weekKey = `${weekStart.getFullYear()}-W${getWeekNumber(date)}`;
        
        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
                total: 0,
                date: weekStart
            };
        }
        
        weeklyData[weekKey].total += parseFloat(trade.Result || 0);
    });
    
    // Convert to arrays for charting
    const sortedWeeks = Object.keys(weeklyData).sort();
    const values = sortedWeeks.map(week => weeklyData[week].total);
    const labels = sortedWeeks.map(week => {
        const date = weeklyData[week].date;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    return { labels, values };
}

// Function to create weekly performance chart
function createWeeklyPerformanceChart(ctx) {
    const weeklyData = calculateWeeklyPerformance();
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeklyData.labels,
            datasets: [{
                label: 'Weekly P/L',
                data: weeklyData.values,
                backgroundColor: weeklyData.values.map(value => 
                    value >= 0 ? 'rgba(0, 200, 83, 0.5)' : 'rgba(255, 61, 87, 0.5)'
                ),
                borderColor: weeklyData.values.map(value => 
                    value >= 0 ? '#00c853' : '#ff3d57'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                callbacks: {
                        label: (ctx) => `P/L: ${formatCurrency(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9ba1ae'
                    }
                },
                y: {
                    grid: {
                        color: '#363c4a'
                    },
                    ticks: {
                        color: '#9ba1ae',
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function createMonthlyPerformanceChart() {
    const ctx = document.getElementById('monthlyPerformance');
    if (!ctx) return null;

    // Calculate monthly performance
    const monthlyData = {};
    allTrades.forEach(trade => {
        const date = new Date(trade.Time);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + (parseFloat(trade.Result) || 0);
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const chartData = sortedMonths.map(month => monthlyData[month]);
    const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleString('default', { month: 'short', year: '2-digit' });
    });

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: chartData,
                backgroundColor: chartData.map(value => value >= 0 ? '#26a69a80' : '#ef535080'),
                borderColor: chartData.map(value => value >= 0 ? '#26a69a' : '#ef5350'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `P&L: ${formatCurrency(context.raw)}`
                }
            }
        },
        scales: {
            x: {
                grid: {
                        display: false
                },
                ticks: {
                    color: '#8f9ba8',
                        maxRotation: 45
                }
            },
            y: {
                grid: {
                        color: '#2a3744'
                },
                ticks: {
                    color: '#8f9ba8',
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });

    return chart;
}

function createTradeEvaluationChart() {
    const ctx = document.getElementById('tradeEvaluation');
    if (!ctx) return null;

    // Calculate trade evaluation scores over time
    const evaluationData = allTrades
        .sort((a, b) => new Date(a.Time) - new Date(b.Time))
        .map(trade => {
            const date = new Date(trade.Time);
            const result = parseFloat(trade.Result) || 0;
            const price = parseFloat(trade['Price / share']) || 0;
            const shares = parseFloat(trade['No. of shares']) || 0;
            
            // Calculate score based on various factors
            let score = 5; // Base score
            const positionSize = price * shares;
            const returnPercent = (result / positionSize) * 100;
            
            // Adjust score based on return percentage
            if (result > 0) {
                score += returnPercent > 5 ? 3 : returnPercent > 2 ? 2 : 1;
            } else {
                score -= Math.abs(returnPercent) > 5 ? 3 : Math.abs(returnPercent) > 2 ? 2 : 1;
            }
            
            return {
                x: date,
                y: Math.max(0, Math.min(10, score)) // Ensure score is between 0 and 10
            };
        });

    return new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Trade Score',
                data: evaluationData,
                backgroundColor: evaluationData.map(d => d.y >= 7 ? '#26a69a80' : '#ef535080'),
                borderColor: evaluationData.map(d => d.y >= 7 ? '#26a69a' : '#ef5350'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `Score: ${context.raw.y.toFixed(1)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8f9ba8',
                        maxRotation: 45
                    }
                },
                y: {
                    min: 0,
                    max: 10,
                    grid: {
                        color: '#2a3744'
                    },
                    ticks: {
                        color: '#8f9ba8',
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createWinLossRatioChart(ctx) {
    if (!ctx) return null;

    const stats = calculateTradeStats();
    const winCount = Math.round(stats.totalTrades * stats.winRate);
    const lossCount = stats.totalTrades - winCount;

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Winning Trades', 'Losing Trades'],
            datasets: [{
                data: [winCount, lossCount],
                backgroundColor: ['rgba(38, 166, 154, 0.8)', 'rgba(239, 83, 80, 0.8)'],
                borderColor: ['#26a69a', '#ef5350'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9ba1ae'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw;
                            const percentage = ((value / stats.totalTrades) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createHourlyStatsChart() {
    const ctx = document.getElementById('hourlyStats');
    if (!ctx) return null;

    // Calculate hourly performance
    const hourlyData = Array(24).fill(0);
    const hourlyTrades = Array(24).fill(0);

    allTrades.forEach(trade => {
        const hour = new Date(trade.Time).getHours();
        const result = parseFloat(trade.Result) || 0;
        hourlyData[hour] += result;
        hourlyTrades[hour]++;
    });

    // Create labels for all 24 hours
    const labels = Array.from({length: 24}, (_, i) => 
        `${String(i).padStart(2, '0')}:00`
    );

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'P&L by Hour',
                data: hourlyData,
                backgroundColor: hourlyData.map(value => 
                    value >= 0 ? '#26a69a80' : '#ef535080'
                ),
                borderColor: hourlyData.map(value => 
                    value >= 0 ? '#26a69a' : '#ef5350'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => [
                            `P&L: ${formatCurrency(context.raw)}`,
                            `Trades: ${hourlyTrades[context.dataIndex]}`
                        ]
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8f9ba8'
                    }
                },
                y: {
                    grid: {
                        color: '#2a3744'
                    },
                    ticks: {
                        color: '#8f9ba8',
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function createDailyPerformanceChart() {
    const ctx = document.getElementById('dailyPerformance');
    if (!ctx) return null;

    // Calculate daily performance
    const dailyData = {};
    allTrades.forEach(trade => {
        const date = new Date(trade.Time).toISOString().split('T')[0];
        if (!dailyData[date]) {
            dailyData[date] = {
                total: 0,
                trades: 0,
                wins: 0,
                losses: 0
            };
        }
        const result = parseFloat(trade.Result) || 0;
        dailyData[date].total += result;
        dailyData[date].trades++;
        if (result > 0) dailyData[date].wins++;
        else if (result < 0) dailyData[date].losses++;
    });

    const sortedDates = Object.keys(dailyData).sort();
    const data = sortedDates.map(date => ({
        x: new Date(date),
        y: dailyData[date].total
    }));

    return new Chart(ctx, {
            type: 'bar',
        data: {
            datasets: [{
                    label: 'Daily P&L',
                data: data,
                backgroundColor: data.map(d => d.y >= 0 ? '#26a69a80' : '#ef535080'),
                borderColor: data.map(d => d.y >= 0 ? '#26a69a' : '#ef5350'),
                    borderWidth: 1
            }]
        },
        options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                legend: {
                    display: false
                },
                    tooltip: {
                        callbacks: {
                        label: (context) => {
                            const date = new Date(context.raw.x).toISOString().split('T')[0];
                            const stats = dailyData[date];
                            return [
                                `P&L: ${formatCurrency(context.raw.y)}`,
                                `Trades: ${stats.trades}`,
                                `Win Rate: ${((stats.wins / stats.trades) * 100).toFixed(1)}%`
                            ];
                        }
                        }
                    }
                },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8f9ba8',
                        maxRotation: 45
                    }
                },
                    y: {
                        grid: {
                            color: '#2a3744'
                        },
                        ticks: {
                        color: '#8f9ba8',
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
}

// Add missing functions and fix weekly performance calculation
function calculateGainLossDistribution() {
    const gains = Array(10).fill(0); // 10 buckets for gains
    const losses = Array(10).fill(0); // 10 buckets for losses
    
    allTrades.forEach(trade => {
        const result = parseFloat(trade.Result || 0);
        if (result > 0) {
            const bucket = Math.min(Math.floor(result / 100), 9);
            gains[bucket]++;
        } else if (result < 0) {
            const bucket = Math.min(Math.floor(Math.abs(result) / 100), 9);
            losses[bucket]++;
        }
    });
    
    return { gains, losses };
}

function calculateWinLossRatio() {
    const stats = {
        wins: 0,
        losses: 0
    };
    
    allTrades.forEach(trade => {
        const result = parseFloat(trade.Result || 0);
        if (result > 0) stats.wins++;
        else if (result < 0) stats.losses++;
    });
    
    return stats;
}

function calculateRiskReward() {
    return allTrades.map(trade => ({
        risk: parseFloat(trade.Risk || 0),
        reward: parseFloat(trade.Result || 0)
    }));
}

function calculateTradeDuration() {
    const durations = {
        '<1h': 0,
        '1-4h': 0,
        '4-24h': 0,
        '>24h': 0
    };
    
    allTrades.forEach(trade => {
        const entryTime = new Date(trade.Time);
        const exitTime = new Date(trade.ExitTime || trade.Time);
        const duration = (exitTime - entryTime) / (1000 * 60 * 60); // Duration in hours
        
        if (duration < 1) durations['<1h']++;
        else if (duration <= 4) durations['1-4h']++;
        else if (duration <= 24) durations['4-24h']++;
        else durations['>24h']++;
    });
    
    return durations;
}

function calculateHourlyPerformance() {
    const hourlyData = Array(24).fill(0);
    const hourlyTrades = Array(24).fill(0);

    allTrades.forEach(trade => {
        const hour = new Date(trade.Time).getHours();
        const result = parseFloat(trade.Result) || 0;
        hourlyData[hour] += result;
        hourlyTrades[hour]++;
    });

    return { hourlyData, hourlyTrades };
}

async function createCharts() {
    console.log('Starting chart creation...');
    
    // First destroy all existing charts
    if (window.chartInstances) {
        for (const [id, chart] of Object.entries(window.chartInstances)) {
            if (chart && typeof chart.destroy === 'function') {
                try {
                    chart.destroy();
                    console.log(`Destroyed existing chart: ${id}`);
                } catch (e) {
                    console.warn(`Error destroying chart ${id}:`, e);
                }
            }
        }
    }
    
    // Reset chart instances
    window.chartInstances = {};

    // Wait for chart destruction to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const charts = [
        {
            id: 'equityCurve',
            create: createEquityCurveChart,
            title: 'Performance Overview',
            priority: 1
        },
        {
            id: 'winLossRatio',
            create: createWinLossRatioChart,
            title: 'Win/Loss Distribution',
            priority: 2
        },
        {
            id: 'positionSize',
            create: createPositionSizeChart,
            title: 'Position Size Analysis',
            priority: 2
        },
        {
            id: 'dailyPerformance',
            create: createDailyPerformanceChart,
            title: 'Daily Performance',
            priority: 2
        },
        {
            id: 'monthlyPerformance',
            create: createMonthlyPerformanceChart,
            title: 'Monthly Performance',
            priority: 2
        },
        {
            id: 'riskReward',
            create: createRiskRewardChart,
            title: 'Risk/Reward Analysis',
            priority: 3
        },
        {
            id: 'tradeDuration',
            create: createTradeDurationChart,
            title: 'Trade Duration Analysis',
            priority: 3
        },
        {
            id: 'hourlyStats',
            create: createHourlyStatsChart,
            title: 'Trading Hours Analysis',
            priority: 3
        }
    ];

    // Sort charts by priority
    charts.sort((a, b) => a.priority - b.priority);

    // Create charts sequentially with proper error handling
    for (const chart of charts) {
        try {
            const canvas = document.getElementById(chart.id);
            if (!canvas) {
                console.warn(`Canvas not found for ${chart.id}`);
                continue;
            }

            // Update chart title and container styling
            const container = canvas.closest('.chart-card, .chart-container');
            if (container) {
                const titleEl = container.querySelector('h4') || container.querySelector('[data-title]');
                if (titleEl) {
                    titleEl.textContent = chart.title;
                }
                container.classList.remove('chart-error');
                container.removeAttribute('data-error');
            }

            // Ensure clean canvas
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
            }

            // Create new chart with loading state
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.opacity = '0';
            
            console.log(`Creating chart: ${chart.id}`);
            window.chartInstances[chart.id] = chart.create(ctx);
            
            // Fade in chart
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    canvas.style.transition = 'opacity 0.3s ease-in-out';
                    canvas.style.opacity = '1';
                    setTimeout(resolve, 300);
                });
            });

            // Small delay between chart creations
            await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
            console.error(`Error creating ${chart.id} chart:`, error);
            // Show error state in the chart container
            const container = document.getElementById(chart.id)?.closest('.chart-card, .chart-container');
            if (container) {
                container.classList.add('chart-error');
                container.setAttribute('data-error', `Failed to load ${chart.title}`);
            }
        }
    }


    console.log('Charts created successfully');
}

// Function to create position size chart
function createPositionSizeChart(ctx) {
    if (!ctx) return null;

    // Calculate position sizes and results
    const positionSizeData = allTrades.map(trade => {
        const price = parseFloat(trade['Price / share'] || 0);
        const shares = parseFloat(trade['No. of shares'] || 0);
        const result = parseFloat(trade.Result || 0);
        return {
            size: price * shares, // Position size
            pnl: result // P/L
        };
    });

    // Sort by position size for better visualization
    positionSizeData.sort((a, b) => a.size - b.size);

    return new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Position Size vs P/L',
                data: positionSizeData.map(d => ({ x: d.size, y: d.pnl })),
                backgroundColor: positionSizeData.map(d => 
                    d.pnl >= 0 ? 'rgba(0, 200, 83, 0.5)' : 'rgba(255, 61, 87, 0.5)'
                ),
                borderColor: positionSizeData.map(d => 
                    d.pnl >= 0 ? '#00c853' : '#ff3d57'
                ),
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => [
                            `Position Size: ${formatCurrency(ctx.raw.x)}`,
                            `P/L: ${formatCurrency(ctx.raw.y)}`
                        ]
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Position Size',
                        color: '#9ba1ae'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9ba1ae',
                        callback: (value) => formatCurrency(value)
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Profit/Loss',
                        color: '#9ba1ae'
                    },
                    grid: {
                        color: '#363c4a'
                    },
                    ticks: {
                        color: '#9ba1ae',
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

// --- New Advanced Analytics Chart Functions with Canvas Check ---

function createRiskRewardChart() {
    const canvas = document.getElementById('riskReward');
    if (!canvas) { console.warn('Canvas not found for riskReward.'); return null; }
    // Check if a chart already exists on this canvas and destroy it
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Risk', 'Reward'],
            datasets: [{
                label: 'Risk/Reward Ratio',
                data: [1.5, 2.5],
                backgroundColor: ['rgba(255, 61, 87, 0.6)', 'rgba(0, 199, 182, 0.6)'],
                borderColor: ['rgba(255, 61, 87, 1)', 'rgba(0, 199, 182, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function createTradeDurationChart() {
    const canvas = document.getElementById('tradeDuration');
    if (!canvas) { console.warn('Canvas not found for tradeDuration.'); return null; }
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Short', 'Medium', 'Long'],
            datasets: [{
                label: 'Average Trade Duration (days)',
                data: [5, 15, 30],
                borderColor: '#2962FF',
                backgroundColor: 'rgba(41, 98, 255, 0.2)',
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function createHourlyHeatmapChart() {
    const canvas = document.getElementById('hourlyHeatmap');
    if (!canvas) { console.warn('Canvas not found for hourlyHeatmap.'); return null; }
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    const ctx = canvas.getContext('2d');
    // Simulate a heatmap using a bar chart across 24 hours
    const hours = Array.from({ length: 24 }, (_, i) => i + ':00');
    const dataValues = Array.from({ length: 24 }, () => Math.floor(Math.random() * 10));
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [{
                label: 'Trades per Hour',
                data: dataValues,
                backgroundColor: 'rgba(0, 199, 182, 0.6)',
                borderColor: '#00c7b6',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            }
        }
    });
}

// Remove duplicate function