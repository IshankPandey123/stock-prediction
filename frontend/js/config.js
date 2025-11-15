/**
 * Configuration Loader
 * Fetches all configuration values dynamically from API
 * No hardcoded values
 */
let appConfig = null;
// Set API_BASE_URL once globally - this is the ONLY place it's declared
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = window.location.origin;
}

/**
 * Load configuration from API
 */
async function loadConfiguration() {
    try {
        const response = await fetch(`${window.API_BASE_URL || window.location.origin}/api/config`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        appConfig = await response.json();
        
        console.log('Configuration loaded:', appConfig);
        
        // Populate UI with config values
        populateFeatureConfig();
        populateModelConfig();
        populateDataConfig();
        
        return appConfig;
    } catch (error) {
        console.error('Failed to load configuration:', error);
        showError('Failed to load configuration. Please refresh the page.');
        return null;
    }
}

/**
 * Populate feature configuration in UI
 */
function populateFeatureConfig() {
    if (!appConfig) return;
    
    // Set window sizes from config
    const window1Input = document.getElementById('window-size-1');
    const window2Input = document.getElementById('window-size-2');
    
    if (window1Input) {
        window1Input.value = appConfig.features.default_window1;
    }
    if (window2Input) {
        window2Input.value = appConfig.features.default_window2;
    }
    
    // Populate column options dynamically
    const select = document.getElementById('columns');
    if (select && appConfig.data.numeric_columns) {
        // Keep the default "-- Select a column --" option
        const defaultOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (defaultOption) {
            select.appendChild(defaultOption);
        } else {
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = '-- Select a column --';
            select.appendChild(defaultOpt);
        }
        
        appConfig.data.numeric_columns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            select.appendChild(option);
        });
        
        // Pre-select default columns from lag_features
        const selectedColumnsDiv = document.getElementById('selected-columns');
        if (selectedColumnsDiv && appConfig.features.lag_features) {
            selectedColumnsDiv.innerHTML = '';
            appConfig.features.lag_features.forEach(col => {
                if (appConfig.data.numeric_columns.includes(col)) {
                    addColumnChip(col);
                }
            });
        }
    }
}

/**
 * Add a column chip to the selected columns display
 */
function addColumnChip(columnName) {
    const selectedColumnsDiv = document.getElementById('selected-columns');
    if (!selectedColumnsDiv) return;
    
    // Check if column is already added
    const existingChip = selectedColumnsDiv.querySelector(`[data-column="${columnName}"]`);
    if (existingChip) {
        return; // Already added
    }
    
    // Create chip element
    const chip = document.createElement('div');
    chip.className = 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2';
    chip.dataset.column = columnName;
    chip.innerHTML = `
        <span>${columnName}</span>
        <button onclick="removeColumnChip('${columnName}')" class="text-blue-600 hover:text-blue-800 font-bold">×</button>
    `;
    
    selectedColumnsDiv.appendChild(chip);
}

/**
 * Remove a column chip
 */
function removeColumnChip(columnName) {
    const selectedColumnsDiv = document.getElementById('selected-columns');
    if (!selectedColumnsDiv) return;
    
    const chip = selectedColumnsDiv.querySelector(`[data-column="${columnName}"]`);
    if (chip) {
        chip.remove();
    }
}

/**
 * Add selected column from dropdown
 */
function addSelectedColumn() {
    const select = document.getElementById('columns');
    if (!select) return;
    
    const selectedValue = select.value;
    if (!selectedValue) {
        // Show error or just return
        return;
    }
    
    addColumnChip(selectedValue);
    
    // Reset dropdown to default
    select.value = '';
}

/**
 * Populate model configuration in UI
 */
function populateModelConfig() {
    if (!appConfig) return;
    
    // Populate target column select with options
    const targetSelect = document.getElementById('target-column');
    if (targetSelect && appConfig.data.numeric_columns) {
        // Clear existing options
        targetSelect.innerHTML = '';
        
        // Add options from numeric columns
        appConfig.data.numeric_columns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            targetSelect.appendChild(option);
        });
        
        // Set default value from config
        const defaultTarget = appConfig.model.target_column;
        if (defaultTarget && appConfig.data.numeric_columns.includes(defaultTarget)) {
            targetSelect.value = defaultTarget;
        } else if (appConfig.data.numeric_columns.length > 0) {
            // Fallback to first available column
            targetSelect.value = appConfig.data.numeric_columns[0];
        }
    }
    
    // Set default train split
    const trainSplitSlider = document.getElementById('train-split-slider');
    if (trainSplitSlider) {
        trainSplitSlider.value = appConfig.model.default_train_split * 100;
        if (typeof updateTrainSplitDisplay === 'function') {
            updateTrainSplitDisplay();
        }
    }
}

/**
 * Populate data configuration in UI
 */
function populateDataConfig() {
    if (!appConfig) return;
    
    // This can be used to show available columns, etc.
    console.log('Data config:', appConfig.data);
}

/**
 * Show error message
 */
function showError(message) {
    // Create or update error element
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message';
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    // Create or update success element
    let successDiv = document.getElementById('success-message');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'success-message';
        successDiv.className = 'success-message';
        document.body.insertBefore(successDiv, document.body.firstChild);
    }
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Expose functions globally IMMEDIATELY
if (typeof window !== 'undefined') {
    window.loadConfiguration = loadConfiguration;
    window.populateFeatureConfig = populateFeatureConfig;
    window.populateModelConfig = populateModelConfig;
    window.populateDataConfig = populateDataConfig;
    
    // Note: showError and showSuccess are in utils.js
    console.log('✅ Config functions exposed to window:', {
        loadConfiguration: typeof window.loadConfiguration
    });
    
    // Expose column management functions
    window.addSelectedColumn = addSelectedColumn;
    window.addColumnChip = addColumnChip;
    window.removeColumnChip = removeColumnChip;
}

// Load config when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfiguration);
} else {
    loadConfiguration();
}


