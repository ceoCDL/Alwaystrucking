/**
 * Dashboard.js - Main controller for the admin dashboard
 * Handles UI interactions, authentication, and dashboard functionality
 */

// Current user session
let currentUser = null;

// Dashboard charts
let submissionsByTypeChart = null;
let activityChart = null;
let submissionsTimeChart = null;
let submissionsRoleChart = null;
let completionRateChart = null;

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userNameElement = document.getElementById('user-name');
const userRoleElement = document.getElementById('user-role');
const logoutButton = document.getElementById('logout-btn');
const navItems = document.querySelectorAll('.nav-item');
const contentPanels = document.querySelectorAll('.content-panel');
const currentDateElement = document.getElementById('current-date');

// Initialize EmailJS with credentials from database
function initEmailJS() {
    DB.getSettings()
        .then(settings => {
            if (settings && settings.emailJS) {
                emailjs.init(settings.emailJS.userId);
                console.log('EmailJS initialized');
            } else {
                console.warn('EmailJS settings not found');
            }
        })
        .catch(error => console.error('Error initializing EmailJS:', error));
}

/**
 * Initialize the dashboard
 */
function initDashboard() {
    // Check for existing session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showDashboard();
        } catch (error) {
            console.error('Error parsing saved user:', error);
            showLogin();
        }
    } else {
        showLogin();
    }

    // Set up event listeners
    setupEventListeners();
    
    // Display current date
    updateCurrentDate();
    
    // Initialize EmailJS
    initEmailJS();
}

/**
 * Set up event listeners for the dashboard
 */
function setupEventListeners() {
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // Navigation items
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const panelId = item.getAttribute('data-panel');
            switchPanel(panelId);
        });
    });
    
    // Form actions
    const viewFormButtons = document.querySelectorAll('.view-form-btn');
    viewFormButtons.forEach(button => {
        button.addEventListener('click', function() {
            const formCard = this.closest('.form-card');
            const formId = formCard.getAttribute('data-form');
            openFormModal(formId);
        });
    });
    
    // Modal close buttons
    const closeModalButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });
    
    // User management
    const addUserButton = document.getElementById('add-user-btn');
    if (addUserButton) {
        addUserButton.addEventListener('click', showAddUserModal);
    }
    
    const saveNewUserButton = document.getElementById('save-new-user-btn');
    if (saveNewUserButton) {
        saveNewUserButton.addEventListener('click', saveNewUser);
    }
    
    // Database management
    const exportDbButton = document.getElementById('export-db-btn');
    if (exportDbButton) {
        exportDbButton.addEventListener('click', exportDatabase);
    }
    
    const importDbButton = document.getElementById('import-db-btn');
    if (importDbButton) {
        importDbButton.addEventListener('click', importDatabase);
    }
    
    const clearDbButton = document.getElementById('clear-db-btn');
    if (clearDbButton) {
        clearDbButton.addEventListener('click', clearDatabase);
    }
    
    // Email settings form
    const emailSettingsForm = document.getElementById('email-settings-form');
    if (emailSettingsForm) {
        emailSettingsForm.addEventListener('submit', saveEmailSettings);
    }
    
    // Export submissions button
    const exportSubmissionsButton = document.getElementById('export-submissions');
    if (exportSubmissionsButton) {
        exportSubmissionsButton.addEventListener('click', exportSubmissions);
    }
    
    // Date range filter for submissions
    const dateRangeSelect = document.getElementById('date-range');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            loadSubmissionsData(parseInt(this.value) || 'all');
            updateSubmissionsCharts();
        });
    }
}

/**
 * Handle login form submission
 * @param {Event} event - The form submission event
 */
function handleLogin(event) {
    event.preventDefault();
    
    const username = loginForm.username.value;
    const password = loginForm.password.value;
    
    if (!username || !password) {
        loginError.textContent = 'Please enter both username and password';
        return;
    }
    
    // Authenticate user via IndexedDB
    DB.authenticate(username, password)
        .then(user => {
            if (user) {
                currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                showDashboard();
                loginError.textContent = '';
            } else {
                loginError.textContent = 'Invalid username or password';
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            loginError.textContent = 'An error occurred during login';
        });
}

/**
 * Handle logout button click
 */
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLogin();
}

/**
 * Show the login screen
 */
function showLogin() {
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    
    // Clear login form
    if (loginForm) {
        loginForm.reset();
    }
}

/**
 * Show the dashboard
 */
function showDashboard() {
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    
    // Set user info
    userNameElement.textContent = currentUser.fullName;
    userRoleElement.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    
    // Set role-based visibility
    setRoleBasedVisibility();
    
    // Load dashboard data
    loadDashboardData();
    
    // Create charts
    createDashboardCharts();
}

/**
 * Set visibility of elements based on user role
 */
function setRoleBasedVisibility() {
    // Hide admin-only elements for non-admin users
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    adminOnlyElements.forEach(element => {
        if (currentUser.role === 'admin') {
            element.style.display = '';
        } else {
            element.style.display = 'none';
        }
    });
    
    // Hide elements that require dispatcher or admin role
    const adminDispatcherElements = document.querySelectorAll('.admin-dispatcher-only');
    adminDispatcherElements.forEach(element => {
        if (currentUser.role === 'admin' || currentUser.role === 'dispatcher') {
            element.style.display = '';
        } else {
            element.style.display = 'none';
        }
    });
}

/**
 * Switch between content panels
 * @param {string} panelId - ID of the panel to switch to
 */
function switchPanel(panelId) {
    // Hide all panels
    contentPanels.forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Deactivate all nav items
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected panel
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.add('active');
    }
    
    // Activate selected nav item
    const navItem = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Special actions for certain panels
    if (panelId === 'dashboard-panel') {
        loadDashboardData();
        updateDashboardCharts();
    } else if (panelId === 'submissions-panel') {
        loadSubmissionsData();
        updateSubmissionsCharts();
    } else if (panelId === 'settings-panel') {
        loadSettingsData();
    }
}

/**
 * Load dashboard data
 */
function loadDashboardData() {
    // Get recent submissions
    DB.getRecentSubmissions(5)
        .then(submissions => {
            updateRecentSubmissionsTable(submissions);
        })
        .catch(error => console.error('Error loading recent submissions:', error));
    
    // Update dashboard counters
    updateDashboardCounters();
}

/**
 * Update the recent submissions table
 * @param {Array} submissions - Array of recent submissions
 */
function updateRecentSubmissionsTable(submissions) {
    const tableBody = document.querySelector('#recent-submissions-table tbody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (submissions.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="5" class="text-center">No recent submissions</td>';
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Get form details for each submission
    submissions.forEach(submission => {
        DB.get(DB.STORES.FORMS, submission.formId)
            .then(form => {
                // Create row
                const row = document.createElement('tr');
                
                // Format date
                const submissionDate = new Date(submission.submittedAt);
                const formattedDate = submissionDate.toLocaleDateString() + ' ' + 
                                     submissionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Status class
                let statusClass = '';
                switch (submission.status) {
                    case 'approved':
                        statusClass = 'status-approved';
                        break;
                    case 'rejected':
                        statusClass = 'status-rejected';
                        break;
                    case 'pending':
                        statusClass = 'status-pending';
                        break;
                    default:
                        statusClass = '';
                }
                
                // Set row content
                row.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${form ? form.name : 'Unknown Form'}</td>
                    <td>${submission.submitterName || 'Unknown'}</td>
                    <td><span class="status-badge ${statusClass}">${submission.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary view-submission-btn" data-id="${submission.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
                
                // Add row to table
                tableBody.appendChild(row);
                
                // Add event listener to view button
                const viewButton = row.querySelector('.view-submission-btn');
                if (viewButton) {
                    viewButton.addEventListener('click', () => viewSubmission(submission.id));
                }
            })
            .catch(error => console.error('Error getting form details:', error));
    });
}

/**
 * Update dashboard counters
 */
function updateDashboardCounters() {
    // Total forms count
    DB.getAll(DB.STORES.FORMS)
        .then(forms => {
            const totalFormsElement = document.getElementById('total-forms-count');
            if (totalFormsElement) {
                totalFormsElement.textContent = forms.length;
            }
        })
        .catch(error => console.error('Error getting forms count:', error));
    
    // Total submissions count
    DB.getAll(DB.STORES.SUBMISSIONS)
        .then(submissions => {
            const totalSubmissionsElement = document.getElementById('total-submissions-count');
            if (totalSubmissionsElement) {
                totalSubmissionsElement.textContent = submissions.length;
            }
        })
        .catch(error => console.error('Error getting submissions count:', error));
    
    // Active drivers count
    DB.getByIndex(DB.STORES.USERS, 'role', 'driver')
        .then(drivers => {
            const activeDrivers = drivers.filter(driver => driver.status === 'active');
            const activeDriversElement = document.getElementById('active-drivers-count');
            if (activeDriversElement) {
                activeDriversElement.textContent = activeDrivers.length;
            }
        })
        .catch(error => console.error('Error getting drivers count:', error));
    
    // Today's tasks count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    DB.getAll(DB.STORES.SUBMISSIONS)
        .then(submissions => {
            const todaySubmissions = submissions.filter(submission => {
                const submissionDate = new Date(submission.submittedAt);
                submissionDate.setHours(0, 0, 0, 0);
                return submissionDate.getTime() === today.getTime();
            });
            
            const todaysTasksElement = document.getElementById('todays-tasks-count');
            if (todaysTasksElement) {
                todaysTasksElement.textContent = todaySubmissions.length;
            }
        })
        .catch(error => console.error('Error getting today\'s submissions:', error));
}

/**
 * Create dashboard charts
 */
function createDashboardCharts() {
    createSubmissionsByTypeChart();
    createActivityChart();
    
    // Create submissions charts if needed
    if (document.getElementById('submissions-time-chart')) {
        createSubmissionsTimeChart();
    }
    if (document.getElementById('submissions-role-chart')) {
        createSubmissionsByRoleChart();
    }
    if (document.getElementById('completion-rate-chart')) {
        createCompletionRateChart();
    }
}

/**
 * Create submissions by type chart
 */
function createSubmissionsByTypeChart() {
    const ctx = document.getElementById('submissions-by-type-chart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (submissionsByTypeChart) {
        submissionsByTypeChart.destroy();
    }
    
    // Get submission data grouped by form type
    DB.getAll(DB.STORES.SUBMISSIONS)
        .then(submissions => {
            return Promise.all(
                submissions.map(submission => 
                    DB.get(DB.STORES.FORMS, submission.formId)
                )
            ).then(forms => {
                // Count submissions by form category
                const categoryCounts = {};
                forms.forEach(form => {
                    if (form && form.category) {
                        categoryCounts[form.category] = (categoryCounts[form.category] || 0) + 1;
                    }
                });
                
                // Format category names
                const formattedCategories = Object.keys(categoryCounts).map(category => 
                    category.charAt(0).toUpperCase() + category.slice(1)
                );
                
                // Create chart
                submissionsByTypeChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: formattedCategories,
                        datasets: [{
                            data: Object.values(categoryCounts),
                            backgroundColor: [
                                '#0056b3',
                                '#ff7700',
                                '#28a745',
                                '#dc3545',
                                '#17a2b8'
                            ],
                            borderColor: 'white',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            });
        })
        .catch(error => console.error('Error creating submissions by type chart:', error));
}

/**
 * Create activity chart
 */
function createActivityChart() {
    const ctx = document.getElementById('activity-chart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (activityChart) {
        activityChart.destroy();
    }
    
    // Get last 7 days of submissions
    DB.getAll(DB.STORES.SUBMISSIONS)
        .then(submissions => {
            // Get dates for the last 7 days
            const dates = [];
            const activityCounts = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                
                const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                dates.push(formattedDate);
                
                // Count submissions for this date
                const count = submissions.filter(submission => {
                    const submissionDate = new Date(submission.submittedAt);
                    submissionDate.setHours(0, 0, 0, 0);
                    return submissionDate.getTime() === date.getTime();
                }).length;
                
                activityCounts.push(count);
            }
            
            // Create chart
            activityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Submissions',
                        data: activityCounts,
                        backgroundColor: '#0056b3',
                        borderColor: '#0056b3',
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
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error creating activity chart:', error));
}

/**
 * Update dashboard charts
 */
function updateDashboardCharts() {
    createSubmissionsByTypeChart();
    createActivityChart();
}

/**
 * Load submissions data
 * @param {number|string} dateRange - Number of days to include, or 'all' for all time
 */
function loadSubmissionsData(dateRange = 'all') {
    DB.getAll(DB.STORES.SUBMISSIONS)
        .then(submissions => {
            // Filter by date range if specified
            let filteredSubmissions = submissions;
            if (dateRange !== 'all') {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - dateRange);
                
                filteredSubmissions = submissions.filter(submission => 
                    new Date(submission.submittedAt) >= cutoffDate
                );
            }
            
            updateAllSubmissionsTable(filteredSubmissions);
        })
        .catch(error => console.error('Error loading submissions data:', error));
}

/**
 * Update the all submissions table
 * @param {Array} submissions - Array of submissions
 */
function updateAllSubmissionsTable(submissions) {
    const tableBody = document.querySelector('#all-submissions-table tbody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (submissions.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" class="text-center">No submissions found</td>';
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Sort submissions by date, newest first
    const sortedSubmissions = submissions.sort((a, b) => 
        new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    
    // Create rows
    sortedSubmissions.forEach(submission => {
        // Get form details
        Promise.all([
            DB.get(DB.STORES.FORMS, submission.formId),
            submission.userId ? DB.get(DB.STORES.USERS, submission.userId) : Promise.resolve(null)
        ])
            .then(([form, user]) => {
                // Create row
                const row = document.createElement('tr');
                
                // Format date
                const submissionDate = new Date(submission.submittedAt);
                const formattedDate = submissionDate.toLocaleDateString() + ' ' + 
                                     submissionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Status class
                let statusClass = '';
                switch (submission.status) {
                    case 'approved':
                        statusClass = 'status-approved';
                        break;
                    case 'rejected':
                        statusClass = 'status-rejected';
                        break;
                    case 'pending':
                        statusClass = 'status-pending';
                        break;
                    default:
                        statusClass = '';
                }
                
                // Set row content
                row.innerHTML = `
                    <td>${submission.id}</td>
                    <td>${formattedDate}</td>
                    <td>${form ? form.name : 'Unknown Form'}</td>
                    <td>${submission.submitterName || (user ? user.fullName : 'Unknown')}</td>
                    <td>${user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'}</td>
                    <td><span class="status-badge ${statusClass}">${submission.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary view-submission-btn" data-id="${submission.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary export-submission-btn" data-id="${submission.id}">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-submission-btn" data-id="${submission.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                
                // Add row to table
                tableBody.appendChild(row);
                
                // Add event listeners to buttons
                const viewButton = row.querySelector('.view-submission-btn');
                if (viewButton) {
                    viewButton.addEventListener('click', () => viewSubmission(submission.id));
                }
                
                const exportButton = row.querySelector('.export-submission-btn');
                if (exportButton) {
                    exportButton.addEventListener('click', () => exportSubmission(submission.id));
                }
                
                const deleteButton = row.querySelector('.delete-submission-btn');
                if (deleteButton) {
                    deleteButton.addEventListener('click', () => deleteSubmission(submission.id));
                }
            })
            .catch(error => console.error('Error getting submission details:', error));
    });
}

/**
 * Create submissions time chart
 */
function createSubmissionsTimeChart() {
    const ctx = document.getElementById('submissions-time-chart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (submissionsTimeChart) {
        submissionsTimeChart.destroy();
    }
    
    // Get date range from select
    const dateRangeSelect = document.getElementById('date-range');
    const dateRange = dateRangeSelect ? parseInt(dateRangeSelect.value) || 'all' : 30; // Default to 30 days
    
    DB.getAll(DB.STORES.SUBMISSIONS)
        .then(submissions => {
            // Filter by date range if specified
            let filteredSubmissions = submissions;
            if (dateRange !== 'all') {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - dateRange);
                
                filteredSubmissions = submissions.filter(submission => 
                    new Date(submission.submittedAt) >= cutoffDate
                );
            }
            
            // Group submissions by date
            const submissionsByDate = {};
            
            filteredSubmissions.forEach(submission => {
                const date = new Date(submission.submittedAt);
                date.setHours(0, 0, 0, 0);
                
                const dateString = date.toLocaleDateString();
                submissionsByDate[dateString] = (submissionsByDate[dateString] || 0) + 1;
            });
            
            // Sort dates
            const sortedDates = Object.keys(submissionsByDate).sort((a, b) => 
                new Date(a) - new Date(b)
            );
            
            // Create chart
            submissionsTimeChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: 'Submissions',
                        data: sortedDates.map(date => submissionsByDate[date]),
                        backgroundColor: 'rgba(0, 86, 179, 0.2)',
                        borderColor: '#0056b3',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error creating submissions time chart:', error));
}

/**
 * Create submissions by role chart
 */
function createSubmissionsByRoleChart() {
    const ctx = document.getElementById('submissions-role-chart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (submissionsRoleChart) {
        submissionsRoleChart.destroy();
    }
    
    // Get date range from select
    const dateRangeSelect = document.getElementById('date-range');
    const dateRange = dateRangeSelect ? parseInt(dateRangeSelect.value) || 'all' : 30; // Default to 30 days
    
    Promise.all([
        DB.getAll(DB.STORES.SUBMISSIONS),
        DB.getAll(DB.STORES.USERS)
    ])
        .then(([submissions, users]) => {
            // Filter by date range if specified
            let filteredSubmissions = submissions;
            if (dateRange !== 'all') {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - dateRange);
                
                filteredSubmissions = submissions.filter(submission => 
                    new Date(submission.submittedAt) >= cutoffDate
                );
            }
            
            // Count submissions by role
            const roleMap = {};
            users.forEach(user => {
                roleMap[user.id] = user.role;
            });
            
            const roleSubmissions = {};
            filteredSubmissions.forEach(submission => {
                if (submission.userId) {
                    const role = roleMap[submission.userId] || 'unknown';
                    roleSubmissions[role] = (roleSubmissions[role] || 0) + 1;
                } else {
                    roleSubmissions['guest'] = (roleSubmissions['guest'] || 0) + 1;
                }
            });
            
            // Format role names
            const formattedRoles = Object.keys(roleSubmissions).map(role => 
                role === 'guest' ? 'Guest' : role.charAt(0).toUpperCase() + role.slice(1)
            );
            
            // Create chart
            submissionsRoleChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: formattedRoles,
                    datasets: [{
                        data: Object.values(roleSubmissions),
                        backgroundColor: [
                            '#0056b3',
                            '#ff7700',
                            '#28a745',
                            '#6c757d'
                        ],
                        borderColor: 'white',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error creating submissions by role chart:', error));
}

/**
 * Create completion rate chart
 */
function createCompletionRateChart() {
    const ctx = document.getElementById('completion-rate-chart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (completionRateChart) {
        completionRateChart.destroy();
    }
    
    // Get date range from select
    const dateRangeSelect = document.getElementById('date-range');
    const dateRange = dateRangeSelect ? parseInt(dateRangeSelect.value) || 'all' : 30; // Default to 30 days
    
    Promise.all([
        DB.getAll(DB.STORES.SUBMISSIONS),
        DB.getAll(DB.STORES.FORMS)
    ])
        .then(([submissions, forms]) => {
            // Filter by date range if specified
            let filteredSubmissions = submissions;
            if (dateRange !== 'all') {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - dateRange);
                
                filteredSubmissions = submissions.filter(submission => 
                    new Date(submission.submittedAt) >= cutoffDate
                );
            }
            
            // Get form completion rates
            const formCounts = {};
            const formCompletions = {};
            
            // Initialize counts for each form
            forms.forEach(form => {
                formCounts[form.id] = 0;
                formCompletions[form.id] = 0;
            });
            
            // Count submissions for each form
            filteredSubmissions.forEach(submission => {
                if (formCounts.hasOwnProperty(submission.formId)) {
                    formCounts[submission.formId]++;
                    
                    // Count completed submissions
                    if (submission.status === 'approved' || submission.status === 'completed') {
                        formCompletions[submission.formId]++;
                    }
                }
            });
            
            // Calculate completion rates
            const completionRates = {};
            Object.keys(formCounts).forEach(formId => {
                if (formCounts[formId] > 0) {
                    completionRates[formId] = (formCompletions[formId] / formCounts[formId]) * 100;
                } else {
                    completionRates[formId] = 0;
                }
            });
            
            // Get form names for labels
            const formNames = forms.map(form => form.name);
            
            // Get completion rates in same order as form names
            const rates = forms.map(form => completionRates[form.id] || 0);
            
            // Create chart
            completionRateChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: formNames,
                    datasets: [{
                        label: 'Completion Rate (%)',
                        data: rates,
                        backgroundColor: '#28a745',
                        borderColor: '#28a745',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error creating completion rate chart:', error));
}

/**
 * Update submissions charts
 */
function updateSubmissionsCharts() {
    createSubmissionsTimeChart();
    createSubmissionsByRoleChart();
    createCompletionRateChart();
}

/**
 * Load settings data
 */
function loadSettingsData() {
    // Load email settings
    DB.getSettings()
        .then(settings => {
            if (settings && settings.emailJS) {
                const serviceIdInput = document.getElementById('email-service-id');
                const templateIdInput = document.getElementById('email-template-id');
                const userIdInput = document.getElementById('email-user-id');
                
                if (serviceIdInput) serviceIdInput.value = settings.emailJS.serviceId || '';
                if (templateIdInput) templateIdInput.value = settings.emailJS.templateId || '';
                if (userIdInput) userIdInput.value = settings.emailJS.userId || '';
            }
        })
        .catch(error => console.error('Error loading email settings:', error));
    
    // Load users
    DB.getAll(DB.STORES.USERS)
        .then(users => {
            updateUsersTable(users);
        })
        .catch(error => console.error('Error loading users:', error));
}

/**
 * Update the users table
 * @param {Array} users - Array of users
 */
function updateUsersTable(users) {
    const tableBody = document.querySelector('#users-table tbody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (users.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="5" class="text-center">No users found</td>';
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Create rows
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // Status class
        let statusClass = '';
        switch (user.status) {
            case 'active':
                statusClass = 'status-approved';
                break;
            case 'inactive':
                statusClass = 'status-rejected';
                break;
            default:
                statusClass = '';
        }
        
        // Set row content
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.fullName}</td>
            <td>${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
            <td><span class="status-badge ${statusClass}">${user.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary edit-user-btn" data-id="${user.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        // Add row to table
        tableBody.appendChild(row);
        
        // Add event listeners to buttons
        const editButton = row.querySelector('.edit-user-btn');
        if (editButton) {
            editButton.addEventListener('click', () => editUser(user.id));
        }
        
        const deleteButton = row.querySelector('.delete-user-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => deleteUser(user.id));
        }
    });
}

/**
 * Save email settings
 * @param {Event} event - The form submission event
 */
function saveEmailSettings(event) {
    event.preventDefault();
    
    const serviceId = document.getElementById('email-service-id').value;
    const templateId = document.getElementById('email-template-id').value;
    const userId = document.getElementById('email-user-id').value;
    
    // Get current settings
    DB.getSettings()
        .then(settings => {
            // Update email settings
            const updatedSettings = {
                ...settings,
                emailJS: {
                    serviceId,
                    templateId,
                    userId
                }
            };
            
            // Save updated settings
            return DB.updateSettings(updatedSettings);
        })
        .then(() => {
            alert('Email settings saved successfully');
            initEmailJS(); // Re-initialize EmailJS with new settings
        })
        .catch(error => {
            console.error('Error saving email settings:', error);
            alert('Error saving email settings');
        });
}

/**
 * Show the add user modal
 */
function showAddUserModal() {
    const modal = document.getElementById('add-user-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Save a new user
 */
function saveNewUser() {
    const usernameInput = document.getElementById('new-username');
    const fullNameInput = document.getElementById('new-fullname');
    const passwordInput = document.getElementById('new-password');
    const roleSelect = document.getElementById('new-role');
    
    const username = usernameInput.value.trim();
    const fullName = fullNameInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleSelect.value;
    
    if (!username || !fullName || !password || !role) {
        alert('Please fill in all fields');
        return;
    }
    
    // Check if username already exists
    DB.getAll(DB.STORES.USERS)
        .then(users => {
            const existingUser = users.find(user => user.username === username);
            if (existingUser) {
                throw new Error('Username already exists');
            }
            
            // Create new user
            const newUser = {
                username,
                fullName,
                password,
                role,
                status: 'active',
                created: new Date().toISOString()
            };
            
            // Add user to database
            return DB.add(DB.STORES.USERS, newUser);
        })
        .then(() => {
            alert('User added successfully');
            
            // Close modal and reset form
            const modal = document.getElementById('add-user-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            const form = document.getElementById('add-user-form');
            if (form) {
                form.reset();
            }
            
            // Reload users table
            loadSettingsData();
        })
        .catch(error => {
            console.error('Error adding user:', error);
            alert('Error adding user: ' + error.message);
        });
}

/**
 * Edit a user
 * @param {number} userId - ID of the user to edit
 */
function editUser(userId) {
    // Currently not implemented
    alert('Edit user functionality is not implemented yet');
}

/**
 * Delete a user
 * @param {number} userId - ID of the user to delete
 */
function deleteUser(userId) {
    // Check if user is current user
    if (currentUser && currentUser.id === userId) {
        alert('You cannot delete your own account');
        return;
    }
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    // Delete user
    DB.delete(DB.STORES.USERS, userId)
        .then(() => {
            alert('User deleted successfully');
            loadSettingsData(); // Reload users table
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        });
}

/**
 * View a submission
 * @param {number} submissionId - ID of the submission to view
 */
function viewSubmission(submissionId) {
    // Currently not implemented
    alert('View submission functionality is not implemented yet');
}

/**
 * Export a submission
 * @param {number} submissionId - ID of the submission to export
 */
function exportSubmission(submissionId) {
    // Currently not implemented
    alert('Export submission functionality is not implemented yet');
}

/**
 * Delete a submission
 * @param {number} submissionId - ID of the submission to delete
 */
function deleteSubmission(submissionId) {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this submission?')) {
        return;
    }
    
    // Delete submission
    DB.delete(DB.STORES.SUBMISSIONS, submissionId)
        .then(() => {
            alert('Submission deleted successfully');
            loadSubmissionsData(); // Reload submissions table
            updateSubmissionsCharts(); // Update charts
        })
        .catch(error => {
            console.error('Error deleting submission:', error);
            alert('Error deleting submission');
        });
}

/**
 * Export submissions
 */
function exportSubmissions() {
    DB.getAll(DB.STORES.SUBMISSIONS)
        .then(submissions => {
            // Convert to CSV
            const headers = ['ID', 'Form', 'Submitted By', 'Date', 'Status'];
            const rows = [headers];
            
            // Get form details for each submission
            return Promise.all(
                submissions.map(submission => 
                    DB.get(DB.STORES.FORMS, submission.formId)
                        .then(form => {
                            const row = [
                                submission.id,
                                form ? form.name : 'Unknown Form',
                                submission.submitterName || 'Unknown',
                                new Date(submission.submittedAt).toLocaleString(),
                                submission.status
                            ];
                            rows.push(row);
                            return row;
                        })
                )
            ).then(() => rows);
        })
        .then(rows => {
            // Create CSV content
            const csvContent = rows.map(row => row.join(',')).join('\n');
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `submissions_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error exporting submissions:', error);
            alert('Error exporting submissions');
        });
}

/**
 * Export database
 */
function exportDatabase() {
    DB.export()
        .then(data => {
            // Create download link
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trucking_db_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error exporting database:', error);
            alert('Error exporting database');
        });
}

/**
 * Import database
 */
function importDatabase() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    // Handle file selection
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // Confirm import
                if (confirm('Are you sure you want to import this database? This will overwrite existing data.')) {
                    DB.import(data)
                        .then(() => {
                            alert('Database imported successfully');
                            location.reload(); // Reload page
                        })
                        .catch(error => {
                            console.error('Error importing database:', error);
                            alert('Error importing database: ' + error.message);
                        });
                }
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    };
    
    // Trigger file selection
    input.click();
}

/**
 * Clear database
 */
function clearDatabase() {
    // Confirm clearance
    if (!confirm('Are you sure you want to clear the database? This will delete all submissions and cannot be undone.')) {
        return;
    }
    
    // Double confirm
    if (!confirm('This is your last chance to cancel. Are you absolutely sure?')) {
        return;
    }
    
    // Clear submissions store
    DB.clear(DB.STORES.SUBMISSIONS)
        .then(() => {
            alert('Database cleared successfully');
            loadDashboardData(); // Reload dashboard data
            updateDashboardCharts(); // Update charts
            loadSubmissionsData(); // Reload submissions data
            updateSubmissionsCharts(); // Update charts
        })
        .catch(error => {
            console.error('Error clearing database:', error);
            alert('Error clearing database');
        });
}

/**
 * Open a form in the modal
 * @param {string} formId - ID of the form to open
 */
function openFormModal(formId) {
    const modal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('modal-title');
    const formContainer = document.getElementById('form-container');
    const submitButton = document.getElementById('submit-form-btn');
    
    if (!modal || !modalTitle || !formContainer || !submitButton) return;
    
    // Get form details
    DB.get(DB.STORES.FORMS, formId)
        .then(form => {
            if (!form) {
                throw new Error('Form not found');
            }
            
            // Set modal title
            modalTitle.textContent = form.name;
            
            // Load form content
            return fetch(form.path)
                .then(response => response.text())
                .then(html => {
                    formContainer.innerHTML = html;
                    
                    // Show modal
                    modal.classList.remove('hidden');
                    
                    // Set up submit button
                    submitButton.onclick = function() {
                        submitForm(formId, formContainer);
                    };
                });
        })
        .catch(error => {
            console.error('Error opening form:', error);
            alert('Error opening form: ' + error.message);
        });
}

/**
 * Close all modals
 */
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.add('hidden');
    });
}

/**
 * Submit a form
 * @param {string} formId - ID of the form being submitted
 * @param {HTMLElement} formContainer - Container element with the form
 */
function submitForm(formId, formContainer) {
    // Get form data
    const formElement = formContainer.querySelector('form');
    if (!formElement) {
        alert('No form found');
        return;
    }
    
    // Collect form data
    const formData = new FormData(formElement);
    const formValues = {};
    
    formData.forEach((value, key) => {
        formValues[key] = value;
    });
    
    // Add metadata
    const submission = {
        formId: formId,
        submitterName: currentUser ? currentUser.fullName : formValues.name || formValues.fullName || 'Guest',
        userId: currentUser ? currentUser.id : null,
        data: formValues,
        status: 'pending'
    };
    
    // Save submission to database
    DB.addSubmission(submission)
        .then(submissionId => {
            alert('Form submitted successfully');
            
            // Send email if EmailJS is configured
            sendSubmissionEmail(submission);
            
            // Close modal
            closeAllModals();
            
            // Reload dashboard data
            loadDashboardData();
            updateDashboardCharts();
        })
        .catch(error => {
            console.error('Error submitting form:', error);
            alert('Error submitting form: ' + error.message);
        });
}

/**
 * Send submission email
 * @param {Object} submission - The submission data
 */
function sendSubmissionEmail(submission) {
    // Get email settings
    DB.getSettings()
        .then(settings => {
            if (!settings || !settings.emailJS || 
                !settings.emailJS.serviceId || 
                !settings.emailJS.templateId) {
                console.warn('EmailJS not configured');
                return;
            }
            
            // Get form details
            return DB.get(DB.STORES.FORMS, submission.formId)
                .then(form => {
                    // Prepare email parameters
                    const params = {
                        from_name: submission.submitterName,
                        to_name: 'Always Trucking Admin',
                        form_name: form ? form.name : 'Unknown Form',
                        submission_id: submission.id,
                        submission_data: JSON.stringify(submission.data, null, 2),
                        submission_date: new Date().toLocaleString()
                    };
                    
                    // Send email
                    return emailjs.send(
                        settings.emailJS.serviceId,
                        settings.emailJS.templateId,
                        params
                    );
                });
        })
        .then(response => {
            if (response) {
                console.log('Email sent:', response);
            }
        })
        .catch(error => {
            console.error('Error sending email:', error);
        });
}

/**
 * Update current date display
 */
function updateCurrentDate() {
    if (!currentDateElement) return;
    
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    };
    
    currentDateElement.textContent = now.toLocaleDateString('en-US', options);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);