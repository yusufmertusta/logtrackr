// charts.js - Chart.js configurations and utilities for LogTrackr

class ChartManager {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#0d6efd',
            danger: '#dc3545',
            warning: '#ffc107',
            success: '#198754',
            info: '#0dcaf0',
            dark: '#212529',
            light: '#f8f9fa'
        };
    }

    // Initialize all charts
    initializeCharts() {
        this.createSeverityChart();
        this.createIpChart();
        this.createHourlyChart();
        this.createThreatChart();
    }

    // Severity Distribution Pie Chart
    createSeverityChart() {
        const ctx = document.getElementById('severityChart');
        if (!ctx) return;

        this.charts.severity = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low', 'Info'],
                datasets: [{
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        this.colors.danger,
                        '#ff6b6b',
                        this.colors.warning,
                        this.colors.success,
                        this.colors.info
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Top Active IPs Bar Chart
    createIpChart() {
        const ctx = document.getElementById('ipChart');
        if (!ctx) return;

        this.charts.ip = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Log Sayısı',
                    data: [],
                    backgroundColor: this.colors.primary,
                    borderColor: this.colors.primary,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    // Hourly Activity Line Chart
    createHourlyChart() {
        const ctx = document.getElementById('hourlyChart');
        if (!ctx) return;

        // Generate 24 hour labels
        const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

        this.charts.hourly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Log Sayısı',
                    data: new Array(24).fill(0),
                    borderColor: this.colors.primary,
                    backgroundColor: this.colors.primary + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        ticks: {
                            maxTicksLimit: 12
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    // Threat Types Doughnut Chart
    createThreatChart() {
        const ctx = document.getElementById('threatChart');
        if (!ctx) return;

        this.charts.threat = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        this.colors.danger,
                        this.colors.warning,
                        this.colors.success,
                        this.colors.info,
                        this.colors.primary,
                        '#6f42c1',
                        '#fd7e14'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // Update chart data
    updateChart(chartName, data) {
        const chart = this.charts[chartName];
        if (!chart) return;

        switch (chartName) {
            case 'severity':
                chart.data.datasets[0].data = data.values;
                break;
            case 'ip':
                chart.data.labels = data.labels;
                chart.data.datasets[0].data = data.values;
                break;
            case 'hourly':
                chart.data.datasets[0].data = data.values;
                break;
            case 'threat':
                chart.data.labels = data.labels;
                chart.data.datasets[0].data = data.values;
                break;
        }
        
        chart.update();
    }

    // Destroy all charts
    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    // Refresh all charts
    refreshCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.update();
            }
        });
    }

    // Get chart colors
    getChartColors(count) {
        const baseColors = Object.values(this.colors);
        const colors = [];
        
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        
        return colors;
    }

    // Generate gradient colors
    generateGradient(ctx, color1, color2) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
    }
}

// Export for use in other files
window.ChartManager = ChartManager;