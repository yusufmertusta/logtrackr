// statistics.js - Statistics page functionality for LogTrackr

class StatisticsManager {
    constructor() {
        this.chartManager = new ChartManager();
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.refreshButton = document.querySelector('button[onclick="refreshCharts()"]');
        this.init();
    }

    init() {
        this.chartManager.initializeCharts();
        this.loadStatistics();
        this.bindEvents();
    }

    bindEvents() {
        // Refresh button click event
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => {
                this.refreshCharts();
            });
        }

        // Auto refresh every 5 minutes
        setInterval(() => {
            this.loadStatistics();
        }, 5 * 60 * 1000);
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('d-none');
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('d-none');
        }
    }

    async loadStatistics() {
        this.showLoading();
        
        try {
            // Fetch statistics data from backend API
            const response = await fetch('/api/statistics/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.updateStatistics(data);
            
        } catch (error) {
            console.error('Error loading statistics:', error);
            this.showError('İstatistikler yüklenirken bir hata oluştu.');
        } finally {
            this.hideLoading();
        }
    }

    updateStatistics(data) {
        // Update summary cards
        this.updateSummaryCards(data.summary || {});
        
        // Update charts
        this.updateCharts(data.charts || {});
        
        // Update detailed tables
        this.updateDetailedTables(data.details || {});
    }

    updateSummaryCards(summary) {
        const cards = {
            statTotalLogs: summary.total_logs || 0,
            statCriticalLogs: summary.critical_logs || 0,
            statUniqueIPs: summary.unique_ips || 0,
            statThreatTypes: summary.threat_types || 0
        };

        Object.entries(cards).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                this.animateCounter(element, parseInt(element.textContent) || 0, value);
            }
        });
    }

    updateCharts(charts) {
        // Update severity distribution chart
        if (charts.severity) {
            this.chartManager.updateChart('severity', {
                values: [
                    charts.severity.critical || 0,
                    charts.severity.high || 0,
                    charts.severity.medium || 0,
                    charts.severity.low || 0,
                    charts.severity.info || 0
                ]
            });
        }

        // Update IP chart
        if (charts.top_ips) {
            this.chartManager.updateChart('ip', {
                labels: charts.top_ips.map(item => item.ip),
                values: charts.top_ips.map(item => item.count)
            });
        }

        // Update hourly activity chart
        if (charts.hourly_activity) {
            this.chartManager.updateChart('hourly', {
                values: charts.hourly_activity
            });
        }

        // Update threat types chart
        if (charts.threat_types) {
            this.chartManager.updateChart('threat', {
                labels: charts.threat_types.map(item => item.type),
                values: charts.threat_types.map(item => item.count)
            });
        }
    }

    updateDetailedTables(details) {
        // Update IP statistics table
        if (details.ip_stats) {
            this.updateIpStatsTable(details.ip_stats);
        }

        // Update threat statistics table
        if (details.threat_stats) {
            this.updateThreatStatsTable(details.threat_stats);
        }
    }

    updateIpStatsTable(ipStats) {
        const tableBody = document.getElementById('ipStatsTable');
        if (!tableBody) return;

        const total = ipStats.reduce((sum, item) => sum + item.count, 0);
        
        tableBody.innerHTML = ipStats.map(item => {
            const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
            return `
                <tr>
                    <td><code>${item.ip}</code></td>
                    <td><span class="badge bg-primary">${item.count}</span></td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }).join('');
    }

    updateThreatStatsTable(threatStats) {
        const tableBody = document.getElementById('threatStatsTable');
        if (!tableBody) return;

        const total = threatStats.reduce((sum, item) => sum + item.count, 0);
        
        tableBody.innerHTML = threatStats.map(item => {
            const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
            const badgeClass = this.getThreatBadgeClass(item.type);
            
            return `
                <tr>
                    <td>${item.type}</td>
                    <td><span class="badge ${badgeClass}">${item.count}</span></td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }).join('');
    }

    getThreatBadgeClass(threatType) {
        const type = threatType.toLowerCase();
        if (type.includes('malware') || type.includes('virus')) return 'bg-danger';
        if (type.includes('phishing') || type.includes('fraud')) return 'bg-warning';
        if (type.includes('spam')) return 'bg-secondary';
        if (type.includes('intrusion') || type.includes('attack')) return 'bg-dark';
        return 'bg-info';
    }

    animateCounter(element, start, end, duration = 1000) {
        const range = end - start;
        const minTimer = 50;
        const stepTime = Math.abs(Math.floor(duration / range));
        const timer = Math.max(stepTime, minTimer);
        
        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (range * progress));
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        requestAnimationFrame(updateCounter);
    }

    refreshCharts() {
        this.loadStatistics();
        this.chartManager.refreshCharts();
    }

    getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }

    showError(message) {
        // Create or update error toast
        const toastContainer = this.getOrCreateToastContainer();
        
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-danger border-0';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-exclamation-triangle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast element after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    getOrCreateToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }
        return container;
    }

    // Export statistics data
    async exportStatistics(format = 'json') {
        try {
            const response = await fetch(`/api/statistics/export/?format=${format}`, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': this.getCsrfToken()
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `logtrackr_statistics_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error exporting statistics:', error);
            this.showError('İstatistikler dışa aktarılırken bir hata oluştu.');
        }
    }
}

// Global functions for template onclick handlers
function refreshCharts() {
    if (window.statisticsManager) {
        window.statisticsManager.refreshCharts();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.statisticsManager = new StatisticsManager();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && window.statisticsManager) {
        // Refresh data when page becomes visible
        window.statisticsManager.loadStatistics();
    }
});

// Handle window resize for responsive charts
window.addEventListener('resize', function() {
    if (window.statisticsManager) {
        setTimeout(() => {
            window.statisticsManager.chartManager.refreshCharts();
        }, 300);
    }
});