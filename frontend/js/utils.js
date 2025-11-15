/**
 * Utility functions for error handling and UI feedback
 * These are loaded first to ensure they're available
 */

/**
 * Show error message
 */
function showError(message) {
    console.error('Error:', message);
    // Create or update error element
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message';
        document.body.appendChild(errorDiv);
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
    console.log('Success:', message);
    // Create or update success element
    let successDiv = document.getElementById('success-message');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'success-message';
        successDiv.className = 'success-message';
        document.body.appendChild(successDiv);
    }
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
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

// Expose immediately
window.showError = showError;
window.showSuccess = showSuccess;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

