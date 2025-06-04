/**
 * Dashboard Manager for Always Trucking & Loading LLC
 * Handles core dashboard functionality, panel switching, and UI interaction
 */

class DashboardManager {
    constructor() {
        this.activePanel = 'forms-panel';
        this.init();
    }

    init() {
        this.bindEvents();
        this.initPanels();
        this.setupDynamicElements();
    }

    bindEvents() {
        // Navigation panel switching
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(button => {
            button.addEventListener('click', this.handleNavigation.bind(this));
        });

        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const dashboardNav = document.querySelector('.dashboard-nav');
        
        if (mobileMenuToggle && dashboardNav) {
            mobileMenuToggle.addEventListener('click', () => {
                dashboardNav.classList.toggle('mobile-visible');
            });
        }

        // Listen for form modal close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeFormModal();
            }
        });

        // Window resize event
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    initPanels() {
        // Get last active panel from localStorage or default to forms
        const lastActivePanel = localStorage.getItem('active_panel') || 'forms-panel';
        this.switchToPanel(lastActivePanel);
    }

    setupDynamicElements() {
        // Modal setup
        this.formModal = document.getElementById('form-modal');
        
        // Initialize the loading overlay
        this.loadingOverlay = document.getElementById('loading-overlay');
        
        // Hide loading overlay initially
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    handleNavigation(event) {
        const button = event.currentTarget;
        const panelId = button.getAttribute('data-panel');
        
        if (panelId) {
            this.switchToPanel(panelId);
        }
    }

    switchToPanel(panelId) {
        // Check if user has access to this panel
        if (!window.auth.hasAccessToPanel(panelId)) {
            console.warn(`Access denied to panel: ${panelId}`);
            return;
        }
        
        // Hide all panels
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            panel.classList.remove('active-panel');
            panel.classList.add('hidden-panel');
        });
        
        // Show the selected panel
        const selectedPanel = document.getElementById(panelId);
        if (selectedPanel) {
            selectedPanel.classList.add('active-panel');
            selectedPanel.classList.remove('hidden-panel');
            this.activePanel = panelId;
            
            // Update active state in navigation
            const navButtons = document.querySelectorAll('.nav-btn');
            navButtons.forEach(button => {
                if (button.getAttribute('data-panel') === panelId) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });
            
            // Save active panel to localStorage
            localStorage.setItem('active_panel', panelId);
            
            // Initialize panel-specific functionality
            this.initializeActivePanel();
        }
    }

    initializeActivePanel() {
        switch (this.activePanel) {
            case 'forms-panel':
                // Nothing special needed
                break;
            case 'tracker-panel':
                if (window.formTracker) {
                    window.formTracker.refreshStats();
                    window.formTracker.refreshTable();
                    window.formTracker.updateCharts();
                }
                break;
            case 'analytics-panel':
                if (window.analytics) {
                    window.analytics.refreshAnalytics();
                }
                break;
            case 'settings-panel':
                if (window.settings) {
                    window.settings.loadSettings();
                }
                break;
        }
    }

    handleResize() {
        // Handle responsive adjustments
        this.updateModalPosition();
        
        // Toggle navigation visibility based on screen size
        const dashboardNav = document.querySelector('.dashboard-nav');
        if (dashboardNav) {
            if (window.innerWidth >= 992) {
                // On desktop, always show nav regardless of mobile toggle
                dashboardNav.classList.remove('mobile-visible');
            } else {
                // On mobile, hide nav by default
                if (!dashboardNav.classList.contains('mobile-visible')) {
                    dashboardNav.style.display = 'none';
                }
            }
        }
    }

    updateModalPosition() {
        if (this.formModal && this.formModal.style.display === 'block') {
            // Adjust modal for responsive views if needed
        }
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    openFormModal(title, content) {
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (modalTitle && modalBody) {
            modalTitle.textContent = title;
            modalBody.innerHTML = content;
            this.formModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
        }
    }

    closeFormModal() {
        this.formModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    showMessage(message, type = 'info') {
        // Create a toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${this.getIconForMessageType(type)}"></i>
                <p>${message}</p>
            </div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Add animations
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 5000);
        
        // Handle close button
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                toast.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            });
        }
    }

    getIconForMessageType(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'info':
            default: return 'fa-info-circle';
        }
    }

    // Public methods that can be called from other modules
    getCurrentPanel() {
        return this.activePanel;
    }

    refreshCurrentPanel() {
        this.initializeActivePanel();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new DashboardManager();
});