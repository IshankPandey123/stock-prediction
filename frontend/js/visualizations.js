/**
 * Visualizations
 * All chart data fetched dynamically from API
 */
// Use global window.API_BASE_URL || window.location.origin directly - no local declaration to avoid conflicts
// window.API_BASE_URL || window.location.origin is set in config.js (loaded first)

/**
 * Load VWAP chart
 */
async function loadVWAPChart(limit = null) {
    try {
        const url = limit 
            ? `${window.API_BASE_URL || window.location.origin}/api/visualizations/vwap?limit=${limit}`
            : `${window.API_BASE_URL || window.location.origin}/api/visualizations/vwap`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const chartData = await response.json();
        
        if (chartData.error) {
            console.error('Chart error:', chartData.error);
            return;
        }
        
        updateVWAPChart(chartData);
        
    } catch (error) {
        console.error('Failed to load VWAP chart:', error);
    }
}

/**
 * Update VWAP chart
 */
function updateVWAPChart(chartData) {
    if (typeof ApexCharts === 'undefined') return;
    
    const chartEl = document.getElementById('vwap-chart');
    if (!chartEl) return;
    
    const timestamps = chartData.dates.map(d => new Date(d).getTime());
    const data = chartData.values.map((val, idx) => [timestamps[idx], val]);
    
    if (window.vwapChart) {
        window.vwapChart.destroy();
    }
    
    const options = {
        chart: {
            type: 'line',
            height: 350,
            toolbar: { show: true }
        },
        series: [{
            name: 'VWAP',
            data: data
        }],
        xaxis: {
            type: 'datetime',
            title: { text: 'Date' }
        },
        yaxis: {
            title: { text: 'VWAP ($)' }
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        colors: ['#137fec']
    };
    
    window.vwapChart = new ApexCharts(chartEl, options);
    window.vwapChart.render();
}

/**
 * Load candlestick chart
 */
async function loadCandlestickChart(limit = 50, startDate = null, endDate = null) {
    try {
        let url = `${window.API_BASE_URL || window.location.origin}/api/visualizations/candlestick?limit=${limit}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const chartData = await response.json();
        
        if (chartData.error) {
            console.error('Chart error:', chartData.error);
            return;
        }
        
        updateCandlestickChart(chartData);
        
    } catch (error) {
        console.error('Failed to load candlestick chart:', error);
    }
}

/**
 * Update candlestick chart
 */
function updateCandlestickChart(chartData) {
    if (typeof ApexCharts === 'undefined') return;
    
    const chartEl = document.getElementById('candlestick-chart');
    if (!chartEl) return;
    
    const data = chartData.dates.map((date, idx) => ({
        x: new Date(date),
        y: [
            chartData.open[idx],
            chartData.high[idx],
            chartData.low[idx],
            chartData.close[idx]
        ]
    }));
    
    if (window.candlestickChart) {
        window.candlestickChart.destroy();
    }
    
    const options = {
        chart: {
            type: 'candlestick',
            height: 350,
            toolbar: { show: false }
        },
        series: [{
            data: data
        }],
        xaxis: {
            type: 'datetime'
        },
        yaxis: {
            title: { text: 'Price' }
        },
        plotOptions: {
            candlestick: {
                colors: {
                    upward: '#16a34a',
                    downward: '#ef4444'
                }
            }
        }
    };
    
    window.candlestickChart = new ApexCharts(chartEl, options);
    window.candlestickChart.render();
}

/**
 * Load price trends chart
 */
async function loadPriceTrendsChart(limit = null) {
    try {
        const url = limit
            ? `${window.API_BASE_URL || window.location.origin}/api/visualizations/price-trends?limit=${limit}`
            : `${window.API_BASE_URL || window.location.origin}/api/visualizations/price-trends`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const chartData = await response.json();
        
        if (chartData.error) {
            console.error('Chart error:', chartData.error);
            return;
        }
        
        updatePriceTrendsChart(chartData);
        
    } catch (error) {
        console.error('Failed to load price trends chart:', error);
    }
}

/**
 * Update price trends chart
 */
function updatePriceTrendsChart(chartData) {
    if (typeof ApexCharts === 'undefined') return;
    
    const chartEl = document.getElementById('price-trends-chart');
    if (!chartEl) return;
    
    const timestamps = chartData.dates.map(d => new Date(d).getTime());
    const series = [];
    const colors = ['#137fec', '#16a34a', '#ef4444', '#f97316'];
    
    ['open', 'high', 'low', 'close'].forEach((col, idx) => {
        if (chartData[col]) {
            series.push({
                name: col.charAt(0).toUpperCase() + col.slice(1),
                data: chartData[col].map((val, i) => [timestamps[i], val])
            });
        }
    });
    
    if (window.priceTrendsChart) {
        window.priceTrendsChart.destroy();
    }
    
    const options = {
        chart: {
            type: 'line',
            height: 350,
            toolbar: { show: true }
        },
        series: series,
        xaxis: {
            type: 'datetime',
            title: { text: 'Date' }
        },
        yaxis: {
            title: { text: 'Price ($)' }
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        colors: colors.slice(0, series.length)
    };
    
    window.priceTrendsChart = new ApexCharts(chartEl, options);
    window.priceTrendsChart.render();
}

/**
 * Load VWAP distribution chart
 */
async function loadVWAPDistribution() {
    try {
        const response = await fetch(`${window.API_BASE_URL || window.location.origin}/api/visualizations/vwap-distribution`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const chartData = await response.json();
        
        if (chartData.error) {
            console.error('Chart error:', chartData.error);
            return;
        }
        
        updateVWAPDistributionChart(chartData);
        
    } catch (error) {
        console.error('Failed to load VWAP distribution:', error);
    }
}

/**
 * Update VWAP distribution chart
 */
function updateVWAPDistributionChart(chartData) {
    if (typeof ApexCharts === 'undefined') return;
    
    const chartEl = document.getElementById('vwap-distribution-chart');
    if (!chartEl) return;
    
    if (window.vwapDistChart) {
        window.vwapDistChart.destroy();
    }
    
    const options = {
        chart: {
            type: 'histogram',
            height: 350
        },
        series: [{
            name: 'Frequency',
            data: chartData.values
        }],
        xaxis: {
            title: { text: 'VWAP Bins' }
        },
        yaxis: {
            title: { text: 'Frequency' }
        },
        colors: ['#137fec']
    };
    
    window.vwapDistChart = new ApexCharts(chartEl, options);
    window.vwapDistChart.render();
}

// Auto-load charts when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadVWAPChart();
        loadCandlestickChart();
        loadPriceTrendsChart();
        loadVWAPDistribution();
    });
} else {
    loadVWAPChart();
    loadCandlestickChart();
    loadPriceTrendsChart();
    loadVWAPDistribution();
}

