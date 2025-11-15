/**
 * Metrics Management
 * All metrics are calculated dynamically from predictions
 */
// Use global API_BASE_URL directly - no local declaration to avoid conflicts
// API_BASE_URL is set in config.js (loaded first)

/**
 * Load metrics
 */
async function loadMetrics() {
    try {
        const response = await fetch(`${window.API_BASE_URL || window.location.origin}/api/metrics`);
        
        if (response.status === 404 || response.status === 400) {
            showNoMetricsMessage();
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const metrics = await response.json();
        
        // Update UI with metrics
        updateMetricsUI(metrics);
        
        // Load chart data
        await loadMetricsCharts();
        
        return metrics;
    } catch (error) {
        console.error('Failed to load metrics:', error);
        showError('Failed to load metrics.');
        return null;
    }
}

/**
 * Update metrics UI
 */
function updateMetricsUI(metrics) {
    // MSE
    const mseEl = document.getElementById('mse-value');
    if (mseEl && metrics.mse !== undefined) {
        mseEl.textContent = metrics.mse.toFixed(6);
    }
    
    // RMSE
    const rmseEl = document.getElementById('rmse-value');
    if (rmseEl && metrics.rmse !== undefined) {
        rmseEl.textContent = metrics.rmse.toFixed(6);
    }
    
    // MAE
    const maeEl = document.getElementById('mae-value');
    if (maeEl && metrics.mae !== undefined) {
        maeEl.textContent = metrics.mae.toFixed(6);
    }
    
    // MAPE
    const mapeEl = document.getElementById('mape-value');
    if (mapeEl && metrics.mape !== undefined) {
        mapeEl.textContent = `${metrics.mape.toFixed(2)}%`;
    }
    
    // Directional Accuracy
    const dirAccEl = document.getElementById('directional-accuracy-value');
    if (dirAccEl && metrics.directional_accuracy !== undefined) {
        dirAccEl.textContent = `${metrics.directional_accuracy.toFixed(2)}%`;
    }
}

/**
 * Load metrics charts
 */
async function loadMetricsCharts() {
    try {
        // Load predictions chart data
        const chartResponse = await fetch(`${window.API_BASE_URL || window.location.origin}/api/visualizations/predictions`);
        
        if (chartResponse.ok) {
            const chartData = await chartResponse.json();
            updatePredictionsChart(chartData);
        }
        
        // Load error analysis charts
        await loadErrorAnalysisCharts();
        
    } catch (error) {
        console.error('Failed to load metrics charts:', error);
    }
}

/**
 * Update predictions chart
 */
function updatePredictionsChart(chartData) {
    if (!chartData.dates || !chartData.predicted) {
        return;
    }
    
    // Convert dates to timestamps for ApexCharts
    const dates = chartData.dates.map(d => new Date(d).getTime());
    
    const series = [{
        name: 'Predicted',
        data: chartData.predicted.map((val, idx) => [dates[idx], val])
    }];
    
    if (chartData.actual) {
        series.push({
            name: 'Actual',
            data: chartData.actual.map((val, idx) => [dates[idx], val])
        });
    }
    
    // Update ApexCharts if available
    if (typeof ApexCharts !== 'undefined') {
        const chartEl = document.getElementById('predictions-chart');
        if (chartEl) {
            // Destroy existing chart if any
            if (window.predictionsChart) {
                window.predictionsChart.destroy();
            }
            
            const options = {
                chart: {
                    type: 'line',
                    height: 350,
                    toolbar: { show: true }
                },
                series: series,
                xaxis: {
                    type: 'datetime'
                },
                yaxis: {
                    title: { text: 'Price' }
                },
                stroke: {
                    curve: 'smooth',
                    width: 2
                }
            };
            
            window.predictionsChart = new ApexCharts(chartEl, options);
            window.predictionsChart.render();
        }
    }
}

/**
 * Load error analysis charts
 */
async function loadErrorAnalysisCharts() {
    try {
        const chartResponse = await fetch(`${window.API_BASE_URL || window.location.origin}/api/visualizations/predictions`);
        
        if (chartResponse.ok) {
            const chartData = await chartResponse.json();
            
            if (chartData.actual && chartData.predicted) {
                // Calculate errors
                const errors = chartData.actual.map((actual, idx) => 
                    actual - chartData.predicted[idx]
                );
                
                // Update error over time chart
                updateErrorOverTimeChart(chartData.dates, errors);
                
                // Update residuals chart
                updateResidualsChart(chartData.predicted, errors);
            }
        }
    } catch (error) {
        console.error('Failed to load error analysis charts:', error);
    }
}

/**
 * Update error over time chart
 */
function updateErrorOverTimeChart(dates, errors) {
    if (typeof ApexCharts === 'undefined') return;
    
    const chartEl = document.getElementById('error-over-time-chart');
    if (!chartEl) return;
    
    const timestamps = dates.map(d => new Date(d).getTime());
    const data = errors.map((err, idx) => [timestamps[idx], err]);
    
    if (window.errorChart) {
        window.errorChart.destroy();
    }
    
    const options = {
        chart: {
            type: 'line',
            height: 350
        },
        series: [{
            name: 'Error',
            data: data
        }],
        xaxis: {
            type: 'datetime'
        },
        yaxis: {
            title: { text: 'Error' }
        },
        stroke: {
            width: 2
        }
    };
    
    window.errorChart = new ApexCharts(chartEl, options);
    window.errorChart.render();
}

/**
 * Update residuals chart
 */
function updateResidualsChart(predicted, residuals) {
    if (typeof ApexCharts === 'undefined') return;
    
    const chartEl = document.getElementById('residuals-chart');
    if (!chartEl) return;
    
    const data = predicted.map((pred, idx) => [pred, residuals[idx]]);
    
    if (window.residualsChart) {
        window.residualsChart.destroy();
    }
    
    const options = {
        chart: {
            type: 'scatter',
            height: 350
        },
        series: [{
            name: 'Residuals',
            data: data
        }],
        xaxis: {
            title: { text: 'Predicted Values' }
        },
        yaxis: {
            title: { text: 'Residuals' }
        }
    };
    
    window.residualsChart = new ApexCharts(chartEl, options);
    window.residualsChart.render();
}

/**
 * Show no metrics message
 */
function showNoMetricsMessage() {
    const messageEl = document.getElementById('no-metrics-message');
    if (messageEl) {
        messageEl.style.display = 'block';
    }
}

// Expose functions globally IMMEDIATELY
if (typeof window !== 'undefined') {
    window.loadMetrics = loadMetrics;
    window.updateMetricsUI = updateMetricsUI;
    
    console.log('✅ Metrics functions exposed to window:', {
        loadMetrics: typeof window.loadMetrics
    });
}

// Auto-load metrics on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMetrics);
} else {
    loadMetrics();
}

