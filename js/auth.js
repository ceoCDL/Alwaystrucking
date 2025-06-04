/**
 * Authentication Module for Always Trucking & Loading LLC Dashboard
 * Handles login, logout, role-based access control, and user session management
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = {
            // Demo users - In production, this would be handled by a backend
            'admin': {
                password: 'admin123',
                role: 'Admin',
                permissions: ['all'],
                name: 'Administrator'
            },
            'dispatcher': {
                password: 'dispatch123',
                role: 'Dispatcher',
                permissions: ['forms', 'tracking', 'reports'],
                name: 'Dispatch Manager'
            },
            'driver': {
                password: 'driver123',
                role: 'Driver',
                permissions: ['forms'],
                name: 'Driver'
            }
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkExistingSession();
    }

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');

        // Clear previous errors
        errorElement.textContent = '';

        // Validate credentials
        if (!username || !password) {
            this.showError('Please enter both username and password.');
            return;
        }

        // Check credentials
        const user = this.users[username.toLowerCase()];
        if (!user || user.password !== password) {
            this.showError('Invalid username or password.');
            return;
        }

        // Successful login
        this.currentUser = {
            username: username.toLowerCase(),
            role: user.role,
            permissions: user.permissions,
            name: user.name,
            loginTime: new Date().toISOString()
        };

        // Save session
        this.saveSession();
        
        // Update UI
        this.showDashboard();
        
        // Log activity
        this.logActivity('login', `User ${username} logged in successfully`);
    }

    handleLogout() {
        if (this.currentUser) {
            this.logActivity('logout', `User ${this.currentUser.username} logged out`);
        }
        
        this.currentUser = null;
        this.clearSession();
        this.showLogin();
    }

    showLogin() {
        const loginSection = document.getElementById('login-section');
        const dashboardSection = document.getElementById('dashboard-section');
        
        if (loginSection && dashboardSection) {
            loginSection.classList.remove('hidden-section');
            loginSection.classList.add('active-section');
            dashboardSection.classList.add('hidden-section');
            dashboardSection.classList.remove('active-section');
        }
        
        // Clear form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.reset();
        }
        
        // Clear error messages
        const errorElement = document.getElementById('login-error');
        if (errorElement) {
            errorElement.textContent = '';
        }
    }

    showDashboard() {
        const loginSection = document.getElementById('login-section');
        const dashboardSection = document.getElementById('dashboard-section');
        
        if (loginSection && dashboardSection) {
            loginSection.classList.add('hidden-section');
            loginSection.classList.remove('active-section');
            dashboardSection.classList.remove('hidden-section');
            dashboardSection.classList.add('active-section');
        }
        
        // Update user info display
        this.updateUserDisplay();
        
        // Apply role-based permissions
        this.applyRolePermissions();
        
        // Initialize dashboard components
        if (window.dashboard) {
            window.dashboard.init();
        }
    }

    updateUserDisplay() {
        const loggedUserElement = document.getElementById('logged-user');
        const userRoleElement = document.getElementById('user-role');
        
        if (loggedUserElement && this.currentUser) {
            loggedUserElement.textContent = this.currentUser.name;
        }
        
        if (userRoleElement && this.currentUser) {
            userRoleElement.textContent = this.currentUser.role;
        }
    }

    applyRolePermissions() {
        if (!this.currentUser) return;

        const role = this.currentUser.role;
        
        // Show/hide elements based on role
        this.toggleElementsByRole('.admin-only', role === 'Admin');
        this.toggleElementsByRole('.admin-dispatcher-only', role === 'Admin' || role === 'Dispatcher');
        this.toggleElementsByRole('.driver-only', role === 'Driver');
        
        // Update navigation buttons
        this.updateNavigationAccess();
    }

    toggleElementsByRole(selector, shouldShow) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (shouldShow) {
                element.style.display = '';
                element.classList.remove('hidden');
            } else {
                element.style.display = 'none';
                element.classList.add('hidden');
            }
        });
    }

    updateNavigationAccess() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(button => {
            const panel = button.getAttribute('data-panel');
            const hasAccess = this.hasAccessToPanel(panel);
            
            if (hasAccess) {
                button.style.display = '';
                button.disabled = false;
            } else {
                button.style.display = 'none';
                button.disabled = true;
            }
        });
    }

    hasAccessToPanel(panelId) {
        if (!this.currentUser) return false;
        
        const role = this.currentUser.role;
        
        switch (panelId) {
            case 'forms-panel':
                return true; // All roles can access forms
            case 'tracker-panel':
                return role === 'Admin' || role === 'Dispatcher';
            case 'analytics-panel':
                return role === 'Admin';
            case 'settings-panel':
                return role === 'Admin';
            default:
                return false;
        }
    }

    checkExistingSession() {
        const sessionData = localStorage.getItem('trucking_dashboard_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                
                // Check if session is still valid (24 hours)
                const loginTime = new Date(session.loginTime);
                const now = new Date();
                const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    this.currentUser = session;
                    this.showDashboard();
                    return;
                }
            } catch (error) {
                console.error('Invalid session data:', error);
            }
        }
        
        // No valid session, show login
        this.showLogin();
    }

    saveSession() {
        if (this.currentUser) {
            localStorage.setItem('trucking_dashboard_session', JSON.stringify(this.currentUser));
        }
    }

    clearSession() {
        localStorage.removeItem('trucking_dashboard_session');
    }

    showError(message) {
        const errorElement = document.getElementById('login-error');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    logActivity(action, details) {
        const activityLog = JSON.parse(localStorage.getItem('activity_log') || '[]');
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            user: this.currentUser ? this.currentUser.username : 'unknown',
            action: action,
            details: details,
            userAgent: navigator.userAgent
        };
        
        activityLog.push(logEntry);
        
        // Keep only last 1000 entries
        if (activityLog.length > 1000) {
            activityLog.splice(0, activityLog.length - 1000);
        }
        
        localStorage.setItem('activity_log', JSON.stringify(activityLog));
    }

    // Public methods for other modules
    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    hasPermission(permission) {
        return this.currentUser && 
               (this.currentUser.permissions.includes('all') || 
                this.currentUser.permissions.includes(permission));
    }

    requireAuth() {
        if (!this.isLoggedIn()) {
            this.showLogin();
            return false;
        }
        return true;
    }

    requireRole(requiredRole) {
        if (!this.requireAuth()) return false;
        
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        
        if (!allowedRoles.includes(this.currentUser.role)) {
            alert(`Access denied. This feature requires ${allowedRoles.join(' or ')} role.`);
            return false;
        }
        
        return true;
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.auth = new AuthManager();
});