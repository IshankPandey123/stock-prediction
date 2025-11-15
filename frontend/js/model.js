/**
 * Model Management
 * All model operations fetch from API dynamically
 */
// Use global API_BASE_URL directly - no local declaration to avoid conflicts
// API_BASE_URL is set in config.js (loaded first)

/**
 * Load model information
 */
async function loadModelInfo() {
    try {
        const response = await fetch(`${window.API_BASE_URL || window.location.origin}/api/model/info`);
        
        if (response.status === 404) {
            // No model trained yet
            showNoModelMessage();
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const modelInfo = await response.json();
        
        // Update UI with model info
        updateModelInfoUI(modelInfo);
        
        return modelInfo;
    } catch (error) {
        console.error('Failed to load model info:', error);
        showError('Failed to load model information.');
        return null;
    }
}

/**
 * Update model info in UI
 */
function updateModelInfoUI(modelInfo) {
    // Show the model results section
    const modelResultsEl = document.getElementById('model-results');
    if (modelResultsEl) {
        modelResultsEl.classList.remove('hidden');
    }
    
    // Model type
    const modelTypeEl = document.getElementById('model-type');
    if (modelTypeEl) {
        modelTypeEl.textContent = modelInfo.model_type || 'N/A';
    }
    
    // AIC
    const aicEl = document.getElementById('model-aic');
    if (aicEl && modelInfo.aic) {
        aicEl.textContent = modelInfo.aic.toFixed(2);
    }
    
    // Parameters
    const paramsEl = document.getElementById('model-params');
    if (paramsEl && modelInfo.parameters) {
        const params = modelInfo.parameters;
        paramsEl.textContent = `(${params.p}, ${params.d}, ${params.q})`;
    }
    
    // Training rows
    const trainingRowsEl = document.getElementById('training-rows');
    if (trainingRowsEl) {
        trainingRowsEl.textContent = modelInfo.training_rows?.toLocaleString() || '0';
    }
    
    // Testing rows
    const testingRowsEl = document.getElementById('testing-rows');
    if (testingRowsEl) {
        testingRowsEl.textContent = modelInfo.testing_rows?.toLocaleString() || '0';
    }
    
    // Features used
    const featuresUsedEl = document.getElementById('features-used');
    if (featuresUsedEl) {
        const featuresCount = modelInfo.features_used?.length || 0;
        featuresUsedEl.textContent = featuresCount;
    }
    
    // Target column
    const targetColEl = document.getElementById('target-column-display');
    if (targetColEl) {
        targetColEl.textContent = modelInfo.target_column || 'N/A';
    }
}

/**
 * Train model
 */
async function trainModel() {
    // Get train split from slider
    const trainSplitSlider = document.getElementById('train-split-slider');
    const trainSplit = trainSplitSlider ? parseFloat(trainSplitSlider.value) / 100 : 0.8;
    
    // Get target column
    const targetSelect = document.getElementById('target-column');
    const targetColumn = targetSelect ? targetSelect.value : 'VWAP';
    
    // Get selected features (if any)
    const featureCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="feature-"]:checked');
    const features = Array.from(featureCheckboxes).map(cb => {
        // Extract feature name from checkbox id (e.g., "feature-ma5" -> "MA_5")
        const id = cb.id.replace('feature-', '');
        return id;
    });
    
    try {
        showLoading('Training model... This may take a few minutes.');
        
        const formData = new FormData();
        formData.append('train_split', trainSplit);
        formData.append('target_column', targetColumn);
        if (features.length > 0) {
            features.forEach(f => formData.append('features', f));
        }
        
        const response = await fetch(`${window.API_BASE_URL || window.location.origin}/api/model/train`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Model training failed');
        }
        
        const modelInfo = await response.json();
        hideLoading();
        showSuccess('Model trained successfully!');
        
        // Update UI with new model info
        updateModelInfoUI(modelInfo);
        
        return modelInfo;
    } catch (error) {
        hideLoading();
        console.error('Error training model:', error);
        showError(`Model training failed: ${error.message}`);
        return null;
    }
}

/**
 * Update train split display
 */
function updateTrainSplitDisplay() {
    const slider = document.getElementById('train-split-slider');
    if (!slider) return;
    
    const value = parseFloat(slider.value);
    const trainPercent = value;
    const testPercent = 100 - value;
    
    // Update display values
    const trainSizeEl = document.getElementById('train-size-display');
    const testSizeEl = document.getElementById('test-size-display');
    const percentEl = document.getElementById('split-percent-display');
    
    if (trainSizeEl) {
        // Calculate approximate sizes (would need total rows from API)
        trainSizeEl.textContent = `${trainPercent}%`;
    }
    if (testSizeEl) {
        testSizeEl.textContent = `${testPercent}%`;
    }
    if (percentEl) {
        percentEl.textContent = `${trainPercent}%`;
    }
}

/**
 * Make predictions
 */
async function makePredictions(nPeriods = null) {
    try {
        showLoading('Making predictions...');
        
        const formData = new FormData();
        if (nPeriods) {
            formData.append('n_periods', nPeriods);
        }
        
        const response = await fetch(`${window.API_BASE_URL || window.location.origin}/api/predict`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Prediction failed');
        }
        
        const predictions = await response.json();
        hideLoading();
        showSuccess('Predictions generated successfully!');
        
        // Update predictions UI
        updatePredictionsUI(predictions);
        
        return predictions;
    } catch (error) {
        hideLoading();
        console.error('Error making predictions:', error);
        showError(`Prediction failed: ${error.message}`);
        return null;
    }
}

/**
 * Update predictions UI
 */
function updatePredictionsUI(predictions) {
    // Update predictions table
    if (predictions.dates && predictions.values) {
        populatePredictionsTable(predictions);
    }
    
    // Update predictions chart
    if (predictions.actual && predictions.predicted) {
        updatePredictionsChart(predictions);
    }
}

/**
 * Populate predictions table
 */
function populatePredictionsTable(predictions) {
    const tableBody = document.getElementById('predictions-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const dates = predictions.dates || [];
    const predicted = predictions.values || [];
    const actual = predictions.actual || [];
    
    // Store all rows data for later use
    const allRows = [];
    
    dates.forEach((date, index) => {
        const row = document.createElement('tr');
        row.className = 'prediction-row'; // Add class for easy selection
        
        // Date
        const dateCell = document.createElement('td');
        dateCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
        dateCell.textContent = new Date(date).toLocaleDateString();
        row.appendChild(dateCell);
        
        // Actual
        const actualCell = document.createElement('td');
        actualCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
        if (actual[index] !== undefined) {
            actualCell.textContent = `$${actual[index].toFixed(2)}`;
        } else {
            actualCell.textContent = 'N/A';
        }
        row.appendChild(actualCell);
        
        // Predicted
        const predCell = document.createElement('td');
        predCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
        predCell.textContent = `$${predicted[index].toFixed(2)}`;
        row.appendChild(predCell);
        
        // Error
        const errorCell = document.createElement('td');
        errorCell.className = 'px-6 py-4 whitespace-nowrap text-sm';
        if (actual[index] !== undefined) {
            const error = predicted[index] - actual[index];
            errorCell.textContent = error >= 0 ? `+$${error.toFixed(2)}` : `-$${Math.abs(error).toFixed(2)}`;
            errorCell.className += error >= 0 ? ' text-red-500' : ' text-green-500';
        } else {
            errorCell.textContent = 'N/A';
        }
        row.appendChild(errorCell);
        
        // Error %
        const errorPercentCell = document.createElement('td');
        errorPercentCell.className = 'px-6 py-4 whitespace-nowrap text-sm';
        if (actual[index] !== undefined && actual[index] !== 0) {
            const errorPercent = ((predicted[index] - actual[index]) / actual[index]) * 100;
            errorPercentCell.textContent = `${errorPercent >= 0 ? '+' : ''}${errorPercent.toFixed(2)}%`;
            errorPercentCell.className += errorPercent >= 0 ? ' text-red-500' : ' text-green-500';
        } else {
            errorPercentCell.textContent = 'N/A';
        }
        row.appendChild(errorPercentCell);
        
        allRows.push(row);
    });
    
    // Show only first 5 rows initially
    const INITIAL_ROWS = 5;
    allRows.forEach((row, index) => {
        if (index < INITIAL_ROWS) {
            tableBody.appendChild(row);
        } else {
            row.style.display = 'none'; // Hide but keep in DOM
            tableBody.appendChild(row);
        }
    });
    
    // Add or update "Show More" button
    let showMoreBtn = document.getElementById('show-more-predictions-btn');
    if (allRows.length > INITIAL_ROWS) {
        if (!showMoreBtn) {
            // Create button if it doesn't exist
            showMoreBtn = document.createElement('button');
            showMoreBtn.id = 'show-more-predictions-btn';
            showMoreBtn.className = 'mt-4 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2';
            showMoreBtn.innerHTML = 'Show More <span class="text-lg">↓</span>';
            showMoreBtn.onclick = togglePredictionsTable;
            
            // Insert button after the table
            const tableContainer = document.getElementById('predictions-table');
            if (tableContainer && tableContainer.parentNode) {
                tableContainer.parentNode.insertBefore(showMoreBtn, tableContainer.nextSibling);
            }
        }
        showMoreBtn.style.display = 'block';
        showMoreBtn.dataset.expanded = 'false';
    } else if (showMoreBtn) {
        // Hide button if there are 5 or fewer rows
        showMoreBtn.style.display = 'none';
    }
}

/**
 * Toggle showing all predictions or just first 5
 */
function togglePredictionsTable() {
    const btn = document.getElementById('show-more-predictions-btn');
    if (!btn) return;
    
    const isExpanded = btn.dataset.expanded === 'true';
    const rows = document.querySelectorAll('.prediction-row');
    const INITIAL_ROWS = 5;
    
    if (isExpanded) {
        // Collapse: show only first 5
        rows.forEach((row, index) => {
            if (index >= INITIAL_ROWS) {
                row.style.display = 'none';
            }
        });
        btn.innerHTML = 'Show More <span class="text-lg">↓</span>';
        btn.dataset.expanded = 'false';
    } else {
        // Expand: show all rows
        rows.forEach((row) => {
            row.style.display = '';
        });
        btn.innerHTML = 'Show Less <span class="text-lg">↑</span>';
        btn.dataset.expanded = 'true';
    }
}

/**
 * Show no model message
 */
function showNoModelMessage() {
    const messageEl = document.getElementById('no-model-message');
    if (messageEl) {
        messageEl.style.display = 'block';
    }
}

// Expose functions globally IMMEDIATELY
if (typeof window !== 'undefined') {
    window.trainModel = trainModel;
    window.makePredictions = makePredictions;
    window.loadModelInfo = loadModelInfo;
    window.updateModelInfoUI = updateModelInfoUI;
    window.updatePredictionsUI = updatePredictionsUI;
    window.populatePredictionsTable = populatePredictionsTable;
    window.togglePredictionsTable = togglePredictionsTable;
    
    console.log('✅ Model functions exposed to window:', {
        trainModel: typeof window.trainModel,
        makePredictions: typeof window.makePredictions,
        loadModelInfo: typeof window.loadModelInfo
    });
}

// Auto-load model info on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadModelInfo);
} else {
    loadModelInfo();
}

