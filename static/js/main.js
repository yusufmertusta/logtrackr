// Main JavaScript for LogTrackr
// Global utilities and navbar management

document.addEventListener('DOMContentLoaded', function() {
    // Initialize navbar
    updateNavbar();
    
    // Check authentication status on page load
    checkAuthStatus();
    
    // Add global event listeners
    addGlobalEventListeners();
});

// Update navbar based on authentication status
function updateNavbar() {
    const navbarContent = document.getElementById('navbarContent');
    
    if (Auth.isAuthenticated()) {
        const user = Auth.getUser();
        navbarContent.innerHTML = `
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                    <i class="fas fa-user me-1"></i>${user.username || 'Kullanıcı'}
                </a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="/dashboard/"><i class="fas fa-tachometer-alt me-2"></i>Dashboard</a></li>
                    <li><a class="dropdown-item" href="/statistics/"><i class="fas fa-chart-bar me-2"></i>İstatistikler</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="logout()"><i class="fas fa-sign-out-alt me-2"></i>Çıkış Yap</a></li>
                </ul>
            </li>
        `;
    } else {
        navbarContent.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="/login/"><i class="fas fa-sign-in-alt me-2"></i>Giriş Yap</a>
            </li>
        `;
    }
}

// Check authentication status and redirect if needed
function checkAuthStatus() {
    const currentPath = window.location.pathname;
    const protectedPaths = ['/dashboard/', '/statistics/'];
    const authPaths = ['/login/'];
    
    if (protectedPaths.includes(currentPath) && !Auth.isAuthenticated()) {
        window.location.href = '/login/';
        return;
    }
    
    if (authPaths.includes(currentPath) && Auth.isAuthenticated()) {
        window.location.href = '/dashboard/';
        return;
    }
}

// Logout function
function logout() {
    Auth.logout();
    updateNavbar();
    window.location.href = '/';
}

// Add global event listeners
function addGlobalEventListeners() {
    // Handle authentication events
    window.addEventListener('authChanged', function() {
        updateNavbar();
    });
    
    // Handle API errors globally
    window.addEventListener('apiError', function(event) {
        const error = event.detail;
        if (error.status === 401) {
            Auth.logout();
            updateNavbar();
            window.location.href = '/login/';
        }
    });
    
    // Add loading state management
    document.addEventListener('fetchStart', function() {
        showGlobalLoading();
    });
    
    document.addEventListener('fetchEnd', function() {
        hideGlobalLoading();
    });
}

// Global loading management
function showGlobalLoading() {
    let loadingOverlay = document.getElementById('globalLoadingOverlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'globalLoadingOverlay';
        loadingOverlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
        loadingOverlay.style.backgroundColor = 'rgba(0,0,0,0.1)';
        loadingOverlay.style.zIndex = '9999';
        loadingOverlay.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Yükleniyor...</span>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    loadingOverlay.classList.remove('d-none');
}

function hideGlobalLoading() {
    const loadingOverlay = document.getElementById('globalLoadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('d-none');
    }
}

// Utility functions
const Utils = {
    // Format date for display
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Format severity with badge
    formatSeverity: function(severity) {
        const severityMap = {
            'low': 'success',
            'medium': 'warning',
            'high': 'danger',
            'critical': 'dark'
        };
        const badgeClass = severityMap[severity.toLowerCase()] || 'secondary';
        return `<span class="badge bg-${badgeClass}">${severity.toUpperCase()}</span>`;
    },
    
    // Show toast notification
    showToast: function(message, type = 'info') {
        const toastContainer = this.getToastContainer();
        const toastId = 'toast_' + Date.now();
        
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    },
    
    // Get or create toast container
    getToastContainer: function() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1055';
            document.body.appendChild(container);
        }
        return container;
    },
    
    // Debounce function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Validate file type and size
    validateFile: function(file, allowedTypes = ['.csv'], maxSize = 10 * 1024 * 1024) { // 10MB
        if (!file) return { valid: false, error: 'Dosya seçilmedi' };
        
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            return { valid: false, error: 'Geçersiz dosya formatı' };
        }
        
        if (file.size > maxSize) {
            return { valid: false, error: 'Dosya boyutu çok büyük (max 10MB)' };
        }
        
        return { valid: true };
    }
};

// Make Utils available globally
window.Utils = Utils;