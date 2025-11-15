/**
 * Data Management
 * All data operations fetch from API dynamically
 */
// Use global API_BASE_URL directly - no local declaration to avoid conflicts
// API_BASE_URL is set in config.js (loaded first)

/**
 * Load dataset information
 */
async function loadDatasetInfo() {
    try {
        const response = await fetch(`${window.API_BASE_URL || window.location.origin}/api/data/info`);
        
        if (response.status === 404) {
            // No data loaded yet
            showNoDataMessage();
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const info = await response.json();
        
        // Update UI dynamically
        updateDatasetInfoUI(info);
        
        return info;
    } catch (error) {
        console.error('Failed to load dataset info:', error);
        showError('Failed to load dataset information.');
        return null;
    }
}

/**
 * Update dataset info in UI
 */
function updateDatasetInfoUI(info) {
    // Show the dataset info section
    const datasetInfoEl = document.getElementById('dataset-info');
    if (datasetInfoEl) {
        datasetInfoEl.classList.remove('hidden');
    }
    
    // Update total rows
    const totalRowsEl = document.getElementById('total-rows');
    if (totalRowsEl) {
        totalRowsEl.textContent = info.total_rows?.toLocaleString() || '0';
    }
    
    // Update total columns
    const totalColsEl = document.getElementById('total-columns');
    if (totalColsEl) {
        totalColsEl.textContent = info.total_columns || '0';
    }
    
    // Update date range
    if (info.date_range) {
        const dateStartEl = document.getElementById('date-start');
        const dateEndEl = document.getElementById('date-end');
        
        if (dateStartEl && info.date_range.start) {
            dateStartEl.textContent = new Date(info.date_range.start).toLocaleDateString();
        }
        if (dateEndEl && info.date_range.end) {
            dateEndEl.textContent = new Date(info.date_range.end).toLocaleDateString();
        }
    }
    
    // Populate columns table
    if (info.columns) {
        populateColumnsTable(info.columns, info.missing_values);
    }
    
    // Update target column select with actual numeric columns from dataset
    if (info.numeric_columns && info.numeric_columns.length > 0) {
        const targetSelect = document.getElementById('target-column');
        if (targetSelect) {
            // Clear existing options
            targetSelect.innerHTML = '';
            
            // Add options from actual numeric columns
            info.numeric_columns.forEach(col => {
                const option = document.createElement('option');
                option.value = col;
                option.textContent = col;
                targetSelect.appendChild(option);
            });
            
            // Set default to VWAP if available, otherwise first column
            if (info.numeric_columns.includes('VWAP')) {
                targetSelect.value = 'VWAP';
            } else {
                targetSelect.value = info.numeric_columns[0];
            }
        }
    }
}

/**
 * Populate columns table dynamically
 */
function populateColumnsTable(columns, missingValues) {
    const tableBody = document.getElementById('columns-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    columns.forEach(col => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = col;
        row.appendChild(nameCell);
        
        const missingCell = document.createElement('td');
        missingCell.textContent = missingValues?.[col] || 0;
        row.appendChild(missingCell);
        
        tableBody.appendChild(row);
    });
}

/**
 * Upload CSV file
 */
async function uploadDataFile(file) {
    // Use window functions with fallback
    const showErr = window.showError || alert;
    const showSucc = window.showSuccess || alert;
    const showLoad = window.showLoading || console.log;
    const hideLoad = window.hideLoading || (() => {});
    
    if (!file) {
        showErr('Please select a file to upload.');
        return;
    }
    
    if (!file.name.endsWith('.csv')) {
        showErr('Only CSV files are allowed.');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        showLoad('Uploading file...');
        
        const response = await fetch(`${window.API_BASE_URL || window.location.origin}/api/data/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }
        
        const result = await response.json();
        hideLoad();
        showSucc('File uploaded successfully!');
        
        // Reload dataset info
        if (typeof window.loadDatasetInfo === 'function') {
            await window.loadDatasetInfo();
        }
        
        return result;
    } catch (error) {
        hideLoad();
        console.error('Error uploading file:', error);
        showErr(`Upload failed: ${error.message}`);
        return null;
    }
}

/**
 * Generate rolling features
 */
async function generateFeatures() {
    // Get selected columns from the chips/display area
    const selectedColumnsDiv = document.getElementById('selected-columns');
    if (!selectedColumnsDiv) {
        showError('Feature selection not found.');
        return;
    }
    
    // Extract column values from the chips
    const columnChips = selectedColumnsDiv.querySelectorAll('[data-column]');
    const columns = Array.from(columnChips).map(chip => chip.dataset.column);
    
    if (columns.length === 0) {
        showError('Please select at least one column.');
        return;
    }
    
    const window1 = parseInt(document.getElementById('window-size-1')?.value || '3');
    const window2 = parseInt(document.getElementById('window-size-2')?.value || '7');
    
    try {
        showLoading('Generating features...');
        
        const formData = new FormData();
        columns.forEach(col => formData.append('columns', col));
        formData.append('window1', window1);
        formData.append('window2', window2);
        
        const response = await fetch(`${window.API_BASE_URL || window.location.origin}/api/features/generate`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Feature generation failed');
        }
        
        const result = await response.json();
        hideLoading();
        showSuccess(`Generated ${result.feature_count} features!`);
        
        // Update UI with feature info
        updateFeatureInfoUI(result);
        
        return result;
    } catch (error) {
        hideLoading();
        console.error('Error generating features:', error);
        showError(`Feature generation failed: ${error.message}`);
        return null;
    }
}

/**
 * Update feature info in UI
 */
function updateFeatureInfoUI(featureInfo) {
    // Show the feature results section
    const featureResultsEl = document.getElementById('feature-results');
    if (featureResultsEl) {
        featureResultsEl.classList.remove('hidden');
    }
    
    // Update feature count
    const featureCountEl = document.getElementById('feature-count');
    if (featureCountEl) {
        featureCountEl.textContent = featureInfo.feature_count || 0;
    }
    
    // Update feature names
    if (featureInfo.feature_names) {
        populateFeatureNames(featureInfo.feature_names);
    }
    
    // Update data preview
    if (featureInfo.preview) {
        populateDataPreview(featureInfo.preview);
    }
}

/**
 * Populate feature names in UI
 */
function populateFeatureNames(featureNames) {
    const container = document.getElementById('feature-names-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    featureNames.forEach(featureName => {
        const span = document.createElement('span');
        span.className = 'bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full';
        span.textContent = featureName;
        container.appendChild(span);
    });
}

/**
 * Populate data preview table
 */
function populateDataPreview(preview) {
    const tableBody = document.getElementById('data-preview-body');
    if (!tableBody || !preview || preview.length === 0) return;
    
    tableBody.innerHTML = '';
    
    // Get column names from first row
    const columns = Object.keys(preview[0]);
    
    // Create header if needed
    const table = tableBody.closest('table');
    if (table && !table.querySelector('thead')) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.insertBefore(thead, tableBody);
    }
    
    // Populate rows
    preview.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            const value = row[col];
            td.textContent = value !== null && value !== undefined ? value : 'NaN';
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

/**
 * Show no data message
 */
function showNoDataMessage() {
    const messageEl = document.getElementById('no-data-message');
    if (messageEl) {
        messageEl.style.display = 'block';
    }
}

/**
 * Show loading indicator
 */
function showLoading(message) {
    let loadingEl = document.getElementById('loading-indicator');
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'loading-indicator';
        loadingEl.className = 'loading-indicator';
        document.body.appendChild(loadingEl);
    }
    loadingEl.textContent = message || 'Loading...';
    loadingEl.style.display = 'block';
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

// Expose functions globally IMMEDIATELY - Do this at the END of the file
// This ensures all functions are defined before exposure
(function() {
    'use strict';
    if (typeof window !== 'undefined') {
        // Expose all functions
        window.uploadDataFile = uploadDataFile;
        window.generateFeatures = generateFeatures;
        window.loadDatasetInfo = loadDatasetInfo;
        window.updateDatasetInfoUI = updateDatasetInfoUI;
        window.updateFeatureInfoUI = updateFeatureInfoUI;
        window.populateFeatureNames = populateFeatureNames;
        window.populateDataPreview = populateDataPreview;
        window.populateColumnsTable = populateColumnsTable;
        
        // Verify exposure
        console.log('✅ Data functions exposed to window:', {
            uploadDataFile: typeof window.uploadDataFile,
            generateFeatures: typeof window.generateFeatures,
            loadDatasetInfo: typeof window.loadDatasetInfo
        });
        
        // Double-check critical function
        if (typeof window.uploadDataFile === 'function') {
            console.log('✅ uploadDataFile is ready!');
        } else {
            console.error('❌ uploadDataFile failed to expose!');
        }
    }
})();

// Auto-load dataset info on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDatasetInfo);
} else {
    loadDatasetInfo();
}

