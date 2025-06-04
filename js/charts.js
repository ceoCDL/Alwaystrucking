/**
 * Charts Manager for Always Trucking & Loading LLC Dashboard
 * Handles visualization of form submission statistics
 */

class ChartsManager {
    constructor() {
        this.charts = {};
        this.chartColors = {
            primary: '#001e44',
            secondary: '#ff0000',
            accent: '#ffb700',
            lightBlue: '#007bff',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8',
            background: [
                'rgba(0, 30, 68, 0.7)',
                'rgba(255, 0, 0, 0.7)',
                'rgba(255, 183, 0, 0.7)',
                'rgba(0, 123, 255, 0.7)',
                'rgba(40, 167, 69, 0.7)',
                'rgba(255, 193, 7, 0.7)',
                'rgba(220, 53, 69, 0.7)',
                'rgba(23, 162, 184, 0.7)'
            ],
            border: [
                'rgba(0, 30, 68, 1)',
                'rgba(255, 0, 0, 1)',
                'rgba(255, 183, 0, 1)',
                'rgba(0, 123, 255, 1)',
                'rgba(40, 167, 69, 1)',
                'rgba(255, 193, 7, 1)',
                'rgba(220, 53, 69, 1)',
                'rgba(23, 162, 184, 1)'
            ]
        };
        this.init();
    }

    init() {
        // Initialize charts when data is available
        if (window.formTracker && window.formTracker.submissions) {
            this.initializeCharts(window.formTracker.submissions);
        } else {
            // Wait for form tracker to load data
            document.addEventListener('trackingDataLoaded', (e) => {
                this.initializeCharts(e.detail.submissions);
            });
        }
    }

    initializeCharts(submissions) {
        this.initFormTypesChart(submissions);
        this.initTimelineChart(submissions);
        
        // Additional charts for the Analytics panel
        if (window.auth && window.auth.hasRole('Admin')) {
            this.initUserPerformanceChart(submissions);
            this.initTrendsChart(submissions);
            this.initDepartmentChart(submissions);
            this.initMonthlyChart(submissions);
        }
    }

    initFormTypesChart(submissions) {
        const ctx = document.getElementById('form-types-chart');
        if (!ctx) return;

        const formTypeCounts = {};
        submissions.forEach(sub => {
            formTypeCounts[sub.formTitle] = (formTypeCounts[sub.formTitle] || 0) + 1;
        });

        // Get labels and data from the counts
        const labels = Object.keys(formTypeCounts);
        const data = Object.values(formTypeCounts);

        // Destroy existing chart if it exists
        if (this.charts.formTypes) {
            this.charts.formTypes.destroy();
        }

        // Create new chart
        this.charts.formTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Form Submissions by Type',
                    data: data,
                    backgroundColor: this.chartColors.background,
                    borderColor: this.chartColors.border,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                family: 'Roboto, sans-serif',
                                size: 12
                            },
                            color: '#555'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 30, 68, 0.8)',
                        titleFont: {
                            family: 'Montserrat, sans-serif',
                            size: 14
                        },
                        bodyFont: {
                            family: 'Roboto, sans-serif',
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                const total = context.dataset.data.reduce((acc, data) => acc + data, 0);
                                const percentage = Math.round((context.raw / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    initTimelineChart(submissions) {
        const ctx = document.getElementById('timeline-chart');
        if (!ctx) return;

        // Get last 7 days data
        const days = 7;
        const dateLabels = [];
        const counts = [];

        // Generate date labels for the last N days
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dateLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            counts.push(0);
        }

        // Count submissions by date
        submissions.forEach(sub => {
            const subDate = new Date(sub.submissionTime);
            const dayDiff = Math.floor((today - subDate) / (1000 * 60 * 60 * 24));
            if (dayDiff >= 0 && dayDiff < days) {
                counts[days - 1 - dayDiff]++;
            }
        });

        // Destroy existing chart if it exists
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        // Create new chart
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dateLabels,
                datasets: [{
                    label: 'Submissions',
                    data: counts,
                    backgroundColor: 'rgba(0, 30, 68, 0.2)',
                    borderColor: this.chartColors.primary,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: this.chartColors.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            font: {
                                family: 'Roboto, sans-serif',
                                size: 12
                            },
                            color: '#555'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Roboto, sans-serif',
                                size: 12
                            },
                            color: '#555'
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 30, 68, 0.8)',
                        titleFont: {
                            family: 'Montserrat, sans-serif',
                            size: 14
                        },
                        bodyFont: {
                            family: 'Roboto, sans-serif',
                            size: 13
                        }
                    }
                }
            }
        });
    }

    // Admin Analytics Charts
    initUserPerformanceChart(submissions) {
        const ctx = document.getElementById('user-performance-chart');
        if (!ctx) return;

        // Get submissions by user
        const userCounts = {};
        submissions.forEach(sub => {
            userCounts[sub.submittedBy] = (userCounts[sub.submittedBy] || 0) + 1;
        });

        // Get labels and data from the counts
        const labels = Object.keys(userCounts);
        const data = Object.values(userCounts);

        // Destroy existing chart if it exists
        if (this.charts.userPerformance) {
            this.charts.userPerformance.destroy();
        }

        // Create new chart
        this.charts.userPerformance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Submissions per User',
                    data: data,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    initTrendsChart(submissions) {
        const ctx = document.getElementById('trends-chart');
        if (!ctx) return;

        // Get submissions by month for the last 6 months
        const months = 6;
        const monthLabels = [];
        const monthCounts = Array(months).fill(0);

        // Generate month labels
        const today = new Date();
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setMonth(today.getMonth() - i);
            monthLabels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        }

        // Count submissions by month
        submissions.forEach(sub => {
            const subDate = new Date(sub.submissionTime);
            const monthDiff = (today.getFullYear() - subDate.getFullYear()) * 12 + (today.getMonth() - subDate.getMonth());
            if (monthDiff >= 0 && monthDiff < months) {
                monthCounts[months - 1 - monthDiff]++;
            }
        });

        // Destroy existing chart if it exists
        if (this.charts.trends) {
            this.charts.trends.destroy();
        }

        // Create new chart
        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Submissions',
                    data: monthCounts,
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderColor: this.chartColors.success,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    initDepartmentChart(submissions) {
        const ctx = document.getElementById('department-chart');
        if (!ctx) return;

        // Map form titles to departments
        const departmentMap = {
            'Job Application Form': 'HR',
            'Driver Daily Log': 'Operations',
            'Vehicle Inspection Report': 'Safety',
            'Dispatch Sheet': 'Dispatch',
            'Rate Confirmation Sheet': 'Finance',
            'Accident Report Form': 'Safety',
            'Bill of Lading': 'Documentation',
            'Proof of Delivery': 'Documentation',
            'Freight Invoice': 'Finance',
            'Delivery Receipt': 'Operations'
        };

        // Count submissions by department
        const departmentCounts = {};
        submissions.forEach(sub => {
            const department = departmentMap[sub.formTitle] || 'Other';
            departmentCounts[department] = (departmentCounts[department] || 0) + 1;
        });

        // Get labels and data from the counts
        const labels = Object.keys(departmentCounts);
        const data = Object.values(departmentCounts);

        // Destroy existing chart if it exists
        if (this.charts.department) {
            this.charts.department.destroy();
        }

        // Create new chart
        this.charts.department = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Submissions by Department',
                    data: data,
                    backgroundColor: this.chartColors.background,
                    borderColor: this.chartColors.border,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    initMonthlyChart(submissions) {
        const ctx = document.getElementById('monthly-chart');
        if (!ctx) return;

        // Get current month data by day
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        const dayLabels = Array.from({length: daysInMonth}, (_, i) => i + 1);
        const dayData = Array(daysInMonth).fill(0);

        // Count submissions by day of the month
        submissions.forEach(sub => {
            const subDate = new Date(sub.submissionTime);
            if (subDate.getFullYear() === currentYear && subDate.getMonth() === currentMonth) {
                const day = subDate.getDate() - 1;
                dayData[day]++;
            }
        });

        // Destroy existing chart if it exists
        if (this.charts.monthly) {
            this.charts.monthly.destroy();
        }

        // Create new chart
        this.charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: `Submissions for ${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                    data: dayData,
                    backgroundColor: 'rgba(23, 162, 184, 0.7)',
                    borderColor: 'rgba(23, 162, 184, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    // Public methods
    updateAllCharts(submissions) {
        this.initFormTypesChart(submissions);
        this.initTimelineChart(submissions);
        
        // Update admin charts if they exist
        if (window.auth && window.auth.hasRole('Admin')) {
            this.initUserPerformanceChart(submissions);
            this.initTrendsChart(submissions);
            this.initDepartmentChart(submissions);
            this.initMonthlyChart(submissions);
        }
    }
}

// Initialize charts manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.chartsManager = new ChartsManager();
});