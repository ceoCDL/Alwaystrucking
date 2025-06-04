/**
 * Form Tracking Manager for Always Trucking & Loading LLC
 * Handles IndexedDB operations, statistics, and submission tracking
 */

class FormTracker {
    constructor() {
        this.dbName = 'TruckingFormsDB';
        this.dbVersion = 1;
        this.db = null;
        this.submissions = [];
        this.init();
    }

    async init() {
        await this.initializeDatabase();
        await this.loadSubmissions();
        this.bindEvents();
    }

    initializeDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                // Create submissions store
                if (!db.objectStoreNames.contains('submissions')) {
                    const submissionsStore = db.createObjectStore('submissions', { keyPath: 'id' });
                    submissionsStore.createIndex('formId', 'formId', { unique: false });
                    submissionsStore.createIndex('submittedBy', 'submittedBy', { unique: false });
                    submissionsStore.createIndex('submissionTime', 'submissionTime', { unique: false });
                    submissionsStore.createIndex('status', 'status', { unique: false });
                }
                
                // Create analytics store
                if (!db.objectStoreNames.contains('analytics')) {
                    const analyticsStore = db.createObjectStore('analytics', { keyPath: 'id' });
                    analyticsStore.createIndex('date', 'date', { unique: false });
                    analyticsStore.createIndex('type', 'type', { unique: false });
                }
            };
            
            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };
        });
    }

    async loadSubmissions() {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['submissions'], 'readonly');
            const store = transaction.objectStore('submissions');
            const request = store.getAll();
            
            request.onsuccess = () => {
                this.submissions = request.result;
                console.log(`Loaded ${this.submissions.length} submissions from IndexedDB`);
                resolve(this.submissions);
            };
            
            request.onerror = () => {
                console.error('Failed to load submissions:', request.error);
                reject(request.error);
            };
        });
    }

    bindEvents() {
        // Search and filter functionality
        const searchInput = document.getElementById('search-submissions');
        const formTypeFilter = document.getElementById('filter-form-type');
        const statusFilter = document.getElementById('filter-status');
        const exportButton = document.getElementById('export-data');
        const clearDataButton = document.getElementById('clear-all-data');

        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
        }

        if (formTypeFilter) {
            formTypeFilter.addEventListener('change', this.handleFilterChange.bind(this));
            this.populateFormTypeFilter();
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', this.handleFilterChange.bind(this));
        }

        if (exportButton) {
            exportButton.addEventListener('click', this.exportData.bind(this));
        }

        if (clearDataButton) {
            clearDataButton.addEventListener('click', this.clearAllData.bind(this));
        }
    }

    handleSearch() {
        this.refreshTable();
    }

    handleFilterChange() {
        this.refreshTable();
    }

    populateFormTypeFilter() {
        const formTypeFilter = document.getElementById('filter-form-type');
        if (!formTypeFilter) return;

        // Get unique form types from submissions
        const formTypes = [...new Set(this.submissions.map(sub => sub.formTitle))];
        
        // Clear existing options (except "All Form Types")
        while (formTypeFilter.children.length > 1) {
            formTypeFilter.removeChild(formTypeFilter.lastChild);
        }

        // Add form type options
        formTypes.forEach(formType => {
            const option = document.createElement('option');
            option.value = formType;
            option.textContent = formType;
            formTypeFilter.appendChild(option);
        });
    }

    getFilteredSubmissions() {
        const searchInput = document.getElementById('search-submissions');
        const formTypeFilter = document.getElementById('filter-form-type');
        const statusFilter = document.getElementById('filter-status');

        let filtered = [...this.submissions];

        // Apply search filter
        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.trim().toLowerCase();
            filtered = filtered.filter(sub => 
                sub.submittedBy.toLowerCase().includes(searchTerm) ||
                sub.formTitle.toLowerCase().includes(searchTerm) ||
                (sub.data && JSON.stringify(sub.data).toLowerCase().includes(searchTerm))
            );
        }

        // Apply form type filter
        if (formTypeFilter && formTypeFilter.value) {
            filtered = filtered.filter(sub => sub.formTitle === formTypeFilter.value);
        }

        // Apply status filter
        if (statusFilter && statusFilter.value) {
            filtered = filtered.filter(sub => sub.status === statusFilter.value);
        }

        return filtered;
    }

    refreshStats() {
        const totalSubmissions = this.submissions.length;
        const todaySubmissions = this.getTodaySubmissions();
        const pendingSubmissions = this.submissions.filter(sub => sub.status === 'pending').length;
        const completionRate = totalSubmissions > 0 ? Math.round((this.submissions.filter(sub => sub.status === 'completed').length / totalSubmissions) * 100) : 0;

        // Update stat cards
        this.updateStatCard('total-submissions', totalSubmissions);
        this.updateStatCard('today-submissions', todaySubmissions);
        this.updateStatCard('pending-submissions', pendingSubmissions);
        this.updateStatCard('completion-rate', completionRate + '%');
    }

    getTodaySubmissions() {
        const today = new Date().toDateString();
        return this.submissions.filter(sub => 
            new Date(sub.submissionTime).toDateString() === today
        ).length;
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    refreshTable() {
        const tableBody = document.querySelector('#submissions-table tbody');
        if (!tableBody) return;

        // Clear existing rows
        tableBody.innerHTML = '';

        const filteredSubmissions = this.getFilteredSubmissions();
        
        // Sort by submission time (newest first)
        filteredSubmissions.sort((a, b) => new Date(b.submissionTime) - new Date(a.submissionTime));

        // Add rows
        filteredSubmissions.forEach(submission => {
            const row = this.createSubmissionRow(submission);
            tableBody.appendChild(row);
        });

        // Show "no results" message if needed
        if (filteredSubmissions.length === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5;
            cell.textContent = 'No submissions found matching the current filters.';
            cell.style.textAlign = 'center';
            cell.style.padding = '2rem';
            cell.style.color = '#666';
        }
    }

    createSubmissionRow(submission) {
        const row = document.createElement('tr');
        
        // Date/Time
        const dateCell = row.insertCell();
        dateCell.textContent = new Date(submission.submissionTime).toLocaleString();
        
        // Form Type
        const formCell = row.insertCell();
        formCell.textContent = submission.formTitle;
        
        // User
        const userCell = row.insertCell();
        userCell.innerHTML = `
            <div>
                <strong>${submission.submittedBy}</strong>
                <br>
                <small style="color: #666;">${submission.submitterRole}</small>
            </div>
        `;
        
        // Status
        const statusCell = row.insertCell();
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge status-${submission.status}`;
        statusBadge.textContent = submission.status.charAt(0).toUpperCase() + submission.status.slice(1);
        statusCell.appendChild(statusBadge);
        
        // Actions
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="viewSubmission('${submission.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action btn-download" onclick="downloadSubmission('${submission.id}')" title="Download">
                    <i class="fas fa-download"></i>
                </button>
                ${window.auth && window.auth.hasRole('Admin') ? `
                    <button class="btn-action btn-delete" onclick="deleteSubmission('${submission.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        return row;
    }

    async viewSubmission(submissionId) {
        const submission = this.submissions.find(sub => sub.id === submissionId);
        if (!submission) return;

        const modalContent = `
            <div class="submission-details">
                <div class="submission-header">
                    <h3>${submission.formTitle}</h3>
                    <div class="submission-meta">
                        <p><strong>Submitted by:</strong> ${submission.submittedBy} (${submission.submitterRole})</p>
                        <p><strong>Submission time:</strong> ${new Date(submission.submissionTime).toLocaleString()}</p>
                        <p><strong>Status:</strong> <span class="status-badge status-${submission.status}">${submission.status}</span></p>
                    </div>
                </div>
                
                <div class="submission-data">
                    <h4>Form Data:</h4>
                    <div class="data-grid">
                        ${Object.entries(submission.data).map(([key, value]) => `
                            <div class="data-item">
                                <label>${this.formatFieldName(key)}:</label>
                                <span>${value || 'N/A'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="submission-actions">
                    <button class="btn btn-secondary" onclick="downloadSubmission('${submissionId}')">
                        <i class="fas fa-download"></i> Download PDF
                    </button>
                    ${window.auth && window.auth.hasRole('Admin') ? `
                        <button class="btn btn-danger" onclick="deleteSubmission('${submissionId}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        window.dashboard.openFormModal('Submission Details', modalContent);
    }

    formatFieldName(fieldName) {
        return fieldName
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    async downloadSubmission(submissionId) {
        const submission = this.submissions.find(sub => sub.id === submissionId);
        if (!submission) return;

        // Create a printable PDF-style document
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${submission.formTitle} - Always Trucking & Loading LLC</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.5; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #001e44; padding-bottom: 20px; }
                    .company-name { font-size: 24px; font-weight: bold; color: #001e44; margin-bottom: 5px; }
                    .form-title { font-size: 20px; color: #ff0000; margin-bottom: 10px; }
                    .meta-info { font-size: 14px; color: #666; }
                    .form-data { margin-top: 30px; }
                    .data-section { margin-bottom: 25px; }
                    .data-section h3 { color: #001e44; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                    .data-item { margin-bottom: 15px; display: flex; }
                    .data-item label { font-weight: bold; min-width: 200px; margin-right: 15px; }
                    .data-item span { flex: 1; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
                    @media print { 
                        button { display: none; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">Always Trucking & Loading LLC</div>
                    <div class="form-title">${submission.formTitle}</div>
                    <div class="meta-info">
                        Milwaukee, WI | Equal Opportunity Employer<br>
                        Submitted by: ${submission.submittedBy} (${submission.submitterRole})<br>
                        Date: ${new Date(submission.submissionTime).toLocaleString()}
                    </div>
                </div>
                
                <div class="form-data">
                    <div class="data-section">
                        <h3>Form Information</h3>
                        ${Object.entries(submission.data).map(([key, value]) => `
                            <div class="data-item">
                                <label>${this.formatFieldName(key)}:</label>
                                <span>${value || 'N/A'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="footer">
                    <p>This document was generated from the Always Trucking & Loading LLC Administrative Dashboard</p>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
            </body>
            </html>
        `;

        // Open in new window for printing/saving
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    async deleteSubmission(submissionId) {
        if (!window.auth.hasRole('Admin')) {
            alert('Only administrators can delete submissions.');
            return;
        }

        if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
            return;
        }

        try {
            // Delete from IndexedDB
            const transaction = this.db.transaction(['submissions'], 'readwrite');
            const store = transaction.objectStore('submissions');
            await store.delete(submissionId);

            // Remove from local array
            this.submissions = this.submissions.filter(sub => sub.id !== submissionId);

            // Refresh UI
            this.refreshStats();
            this.refreshTable();
            this.updateCharts();

            // Close modal if open
            window.dashboard.closeFormModal();

            window.dashboard.showMessage('Submission deleted successfully.', 'success');

        } catch (error) {
            console.error('Failed to delete submission:', error);
            window.dashboard.showMessage('Failed to delete submission.', 'error');
        }
    }

    async exportData() {
        if (!window.auth.hasRole('Admin')) {
            alert('Only administrators can export data.');
            return;
        }

        try {
            const exportData = {
                exportDate: new Date().toISOString(),
                totalSubmissions: this.submissions.length,
                submissions: this.submissions
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `trucking-forms-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            window.dashboard.showMessage('Data exported successfully.', 'success');
            
            // Also try to email the submissions if user wants to
            if (confirm('Would you like to email this export to the administrative staff?')) {
                this.emailSubmissions(this.submissions);
            }

        } catch (error) {
            console.error('Failed to export data:', error);
            window.dashboard.showMessage('Failed to export data.', 'error');
        }
    }
    
    async emailSubmissions(submissions) {
        if (!window.auth.hasRole('Admin') && !window.auth.hasRole('Dispatcher')) {
            alert('Only administrators and dispatchers can email submissions.');
            return;
        }
        
        try {
            const recipientEmail = prompt("Enter the email address to send submissions to:", "admin@alwaystrucking.com");
            if (!recipientEmail) return;
            
            window.dashboard.showMessage('Sending email...', 'info');
            
            // Format the data for email
            let emailContent = `Submissions Export (${new Date().toLocaleString()})\n\n`;
            emailContent += `Total Submissions: ${submissions.length}\n\n`;
            
            // Add summary of each submission
            submissions.forEach((sub, index) => {
                emailContent += `Submission #${index + 1}\n`;
                emailContent += `Form: ${sub.formTitle}\n`;
                emailContent += `Submitted By: ${sub.submittedBy} (${sub.submitterRole})\n`;
                emailContent += `Date: ${new Date(sub.submissionTime).toLocaleString()}\n`;
                emailContent += `Status: ${sub.status}\n`;
                emailContent += `---\n`;
            });
            
            // Simple email template data
            const templateParams = {
                to_email: recipientEmail,
                subject: 'Forms Submission Export',
                message: emailContent,
                from_name: window.auth.getCurrentUser().username,
                reply_to: 'no-reply@alwaystrucking.com'
            };
            
            await emailjs.send(
                'YOUR_EMAILJS_SERVICE_ID', // Update with your service ID
                'YOUR_EMAILJS_TEMPLATE_ID', // Update with your template ID
                templateParams
            );
            
            window.dashboard.showMessage('Email sent successfully!', 'success');
        } catch (error) {
            console.error('Failed to email submissions:', error);
            window.dashboard.showMessage('Failed to send email. ' + error.message, 'error');
        }
    }

    async clearAllData() {
        if (!window.auth.hasRole('Admin')) {
            alert('Only administrators can clear all data.');
            return;
        }

        const confirmText = 'DELETE ALL DATA';
        const userInput = prompt(`This will permanently delete ALL form submissions. Type "${confirmText}" to confirm:`);

        if (userInput !== confirmText) {
            return;
        }

        try {
            // Clear IndexedDB
            const transaction = this.db.transaction(['submissions'], 'readwrite');
            const store = transaction.objectStore('submissions');
            await store.clear();

            // Clear local array
            this.submissions = [];

            // Refresh UI
            this.refreshStats();
            this.refreshTable();
            this.updateCharts();

            window.dashboard.showMessage('All data cleared successfully.', 'success');

        } catch (error) {
            console.error('Failed to clear data:', error);
            window.dashboard.showMessage('Failed to clear data.', 'error');
        }
    }

    updateCharts() {
        if (window.chartsManager) {
            window.chartsManager.updateAllCharts(this.submissions);
        }
    }

    // Public methods
    addSubmission(submission) {
        this.submissions.push(submission);
        this.refreshStats();
        this.refreshTable();
        this.updateCharts();
        this.populateFormTypeFilter();
    }

    getSubmissions() {
        return this.submissions;
    }

    getSubmissionsByFormType() {
        const formTypes = {};
        this.submissions.forEach(sub => {
            formTypes[sub.formTitle] = (formTypes[sub.formTitle] || 0) + 1;
        });
        return formTypes;
    }

    getSubmissionsByDate(days = 7) {
        const now = new Date();
        const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        
        const dateMap = {};
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
            const dateKey = date.toDateString();
            dateMap[dateKey] = 0;
        }

        this.submissions.forEach(sub => {
            const subDate = new Date(sub.submissionTime);
            const dateKey = subDate.toDateString();
            if (dateMap.hasOwnProperty(dateKey)) {
                dateMap[dateKey]++;
            }
        });

        return dateMap;
    }
}

// Global functions for onclick handlers
function viewSubmission(submissionId) {
    if (window.formTracker) {
        window.formTracker.viewSubmission(submissionId);
    }
}

function downloadSubmission(submissionId) {
    if (window.formTracker) {
        window.formTracker.downloadSubmission(submissionId);
    }
}

function deleteSubmission(submissionId) {
    if (window.formTracker) {
        window.formTracker.deleteSubmission(submissionId);
    }
}

// Initialize form tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.formTracker = new FormTracker();
});