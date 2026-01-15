/**
 * UX Enhancement Utilities
 * Loading skeletons, animations, empty states, confirmations
 */

/**
 * Creates a loading skeleton for stat cards
 */
function createStatSkeleton() {
    return `
        <div class="stat-card skeleton">
            <div class="skeleton-icon"></div>
            <div class="skeleton-label"></div>
            <div class="skeleton-value"></div>
        </div>
    `;
}

/**
 * Shows loading state for stats grid
 */
function showStatsLoading() {
    const statsGrid = document.querySelector('.stats-grid');
    if (!statsGrid) return;
    
    statsGrid.innerHTML = Array(8).fill(createStatSkeleton()).join('');
}

/**
 * Enhanced toast notification with icons and auto-dismiss
 */
function showToast(message, type = 'success', duration = 5000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    // Remove existing classes
    toast.className = 'toast';
    
    // Add type class
    toast.classList.add(type);
    
    // Set icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    // Set content with icon
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.success}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.classList.remove('show')">×</button>
    `;
    
    // Show toast
    toast.classList.add('show');
    
    // Auto-dismiss
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

/**
 * Success animation with checkmark
 */
function showSuccessAnimation(element, message = 'Success!') {
    if (!element) return;
    
    const originalContent = element.innerHTML;
    const originalBg = element.style.background;
    
    // Create checkmark animation
    element.innerHTML = '<span class="success-checkmark">✓</span>';
    element.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
    element.style.color = 'white';
    element.style.transform = 'scale(1.1)';
    
    // Animate
    setTimeout(() => {
        element.style.transform = 'scale(1)';
        showToast(message, 'success');
    }, 300);
    
    // Restore after animation
    setTimeout(() => {
        element.innerHTML = originalContent;
        element.style.background = originalBg;
        element.style.color = '';
        element.style.transform = '';
    }, 2000);
}

/**
 * Confirmation modal
 */
function showConfirmationModal(options = {}) {
    const {
        title = 'Confirm Action',
        message = 'Are you sure you want to proceed?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm = () => {},
        onCancel = () => {},
        danger = false
    } = options;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content ${danger ? 'danger' : ''}">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove(); (${onCancel.toString()})()">${cancelText}</button>
                <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" onclick="this.closest('.modal-overlay').remove(); (${onConfirm.toString()})()">${confirmText}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on ESC key
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            onCancel();
        }
    });
}

/**
 * Empty state component
 */
function showEmptyState(container, options = {}) {
    const {
        icon = '📭',
        title = 'No data yet',
        message = 'Get started by uploading your first screenshot',
        actionText = 'Upload Screenshot',
        onAction = () => {}
    } = options;
    
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <h3 class="empty-title">${title}</h3>
            <p class="empty-message">${message}</p>
            ${actionText ? `<button class="btn btn-primary" onclick="(${onAction.toString()})()">${actionText}</button>` : ''}
        </div>
    `;
}

/**
 * Debounce function for search inputs
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Smooth page transition
 */
function transitionToPage(url) {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s';
    
    setTimeout(() => {
        window.location.href = url;
    }, 300);
}

/**
 * Ripple effect for buttons
 */
function addRippleEffect(button) {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

// Add ripple to all buttons on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.btn').forEach(btn => {
            addRippleEffect(btn);
        });
    });
}













