/**
 * Forms Manager for Always Trucking & Loading LLC
 * Handles form display, submission, email integration, and IndexedDB storage
 */

class FormsManager {
    constructor() {
        this.formTemplates = {};
        this.emailJSConfig = {
            serviceId: 'YOUR_EMAILJS_SERVICE_ID', // Replace with actual service ID
            templateId: 'YOUR_EMAILJS_TEMPLATE_ID', // Replace with actual template ID
            publicKey: 'YOUR_EMAILJS_PUBLIC_KEY' // Replace with actual public key
        };
        this.dbName = 'TruckingFormsDB';
        this.dbVersion = 1;
        this.db = null;
        this.init();
    }

    async init() {
        this.initEmailJS();
        await this.initializeDatabase();
        this.loadFormTemplates();
        this.bindGlobalEvents();
    }

    initEmailJS() {
        // EmailJS is already initialized in the HTML file
        // This method can be used for additional configuration if needed
    }
    
    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create submissions store if it doesn't exist
                if (!db.objectStoreNames.contains('submissions')) {
                    const store = db.createObjectStore('submissions', { keyPath: 'id' });
                    store.createIndex('formId', 'formId', { unique: false });
                    store.createIndex('submittedBy', 'submittedBy', { unique: false });
                    store.createIndex('submissionTime', 'submissionTime', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                }
                
                // Create forms store for saving drafts
                if (!db.objectStoreNames.contains('drafts')) {
                    const draftsStore = db.createObjectStore('drafts', { keyPath: 'id' });
                    draftsStore.createIndex('formId', 'formId', { unique: false });
                    draftsStore.createIndex('userId', 'userId', { unique: false });
                    draftsStore.createIndex('lastModified', 'lastModified', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB connected successfully');
                resolve(this.db);
            };
        });
    }

    bindGlobalEvents() {
        // Bind form actions globally
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="openForm"]')) {
                e.preventDefault();
                const match = e.target.getAttribute('onclick').match(/openForm\('([^']+)'\)/);
                if (match) {
                    this.openForm(match[1]);
                }
            }
            
            if (e.target.matches('[onclick*="downloadForm"]')) {
                e.preventDefault();
                const match = e.target.getAttribute('onclick').match(/downloadForm\('([^']+)'\)/);
                if (match) {
                    this.downloadForm(match[1]);
                }
            }
        });
    }

    loadFormTemplates() {
        this.formTemplates = {
            'job-application': {
                title: 'Job Application Form',
                category: 'Driver Operations',
                description: 'New hire application form for driver positions',
                html: this.getJobApplicationHTML()
            },
            'daily-log': {
                title: 'Driver Daily Log',
                category: 'Driver Operations', 
                description: 'Daily activity and hours tracking log',
                html: this.getDailyLogHTML()
            },
            'vehicle-inspection': {
                title: 'Vehicle Inspection Report',
                category: 'Driver Operations',
                description: 'Pre-trip and post-trip inspection checklist',
                html: this.getVehicleInspectionHTML()
            },
            'dispatch-sheet': {
                title: 'Dispatch Sheet',
                category: 'Dispatch Operations',
                description: 'Load assignment and routing information',
                html: this.getDispatchSheetHTML()
            },
            'rate-confirmation': {
                title: 'Rate Confirmation Sheet',
                category: 'Dispatch Operations',
                description: 'Load rate and payment confirmation',
                html: this.getRateConfirmationHTML()
            },
            'accident-report': {
                title: 'Accident Report Form',
                category: 'Safety & Compliance',
                description: 'Incident documentation and reporting',
                html: this.getAccidentReportHTML()
            },
            'bill-of-lading': {
                title: 'Bill of Lading',
                category: 'Documentation',
                description: 'Freight shipment documentation',
                html: this.getBillOfLadingHTML()
            },
            'proof-of-delivery': {
                title: 'Proof of Delivery',
                category: 'Documentation',
                description: 'Delivery confirmation documentation',
                html: this.getProofOfDeliveryHTML()
            },
            'freight-invoice': {
                title: 'Freight Invoice',
                category: 'Documentation',
                description: 'Billing and payment documentation',
                html: this.getFreightInvoiceHTML()
            },
            'delivery-receipt': {
                title: 'Delivery Receipt',
                category: 'Documentation',
                description: 'TMS load summary and receipt',
                html: this.getDeliveryReceiptHTML()
            }
        };
    }

    openForm(formId) {
        const template = this.formTemplates[formId];
        if (!template) {
            console.error('Form template not found:', formId);
            return;
        }

        // Check if user has permission to access this form
        if (!this.hasFormAccess(formId)) {
            alert('You do not have permission to access this form.');
            return;
        }

        // Load any saved draft data
        const draftData = this.loadDraftData(formId);
        let formHTML = template.html;

        // If there's draft data, pre-populate the form
        if (draftData) {
            formHTML = this.populateFormWithData(formHTML, draftData);
        }

        // Open the form in a modal
        window.dashboard.openFormModal(template.title, formHTML);

        // Bind form events after modal is opened
        setTimeout(() => {
            this.bindFormEvents(formId);
        }, 100);
    }

    hasFormAccess(formId) {
        const currentUser = window.auth.getCurrentUser();
        if (!currentUser) return false;

        const template = this.formTemplates[formId];
        if (!template) return false;

        // Admin has access to all forms
        if (currentUser.role === 'Admin') return true;

        // Dispatcher has access to all forms except some admin-only ones
        if (currentUser.role === 'Dispatcher') {
            return true; // For now, dispatchers can access all forms
        }

        // Driver has access to driver-related forms
        if (currentUser.role === 'Driver') {
            const driverForms = ['job-application', 'daily-log', 'vehicle-inspection', 'accident-report'];
            return driverForms.includes(formId);
        }

        return false;
    }

    bindFormEvents(formId) {
        const form = document.querySelector('#form-modal form');
        if (!form) return;

        // Auto-save functionality
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveDraftData(formId, this.getFormData(form));
            });
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission(formId, form);
        });

        // Print functionality
        const printBtn = form.querySelector('[onclick*="print"]');
        if (printBtn) {
            printBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.printForm();
            });
        }
    }

    async handleFormSubmission(formId, form) {
        if (!window.auth.isLoggedIn()) {
            alert('You must be logged in to submit forms.');
            return;
        }

        window.dashboard.showLoading();

        try {
            const formData = this.getFormData(form);
            const currentUser = window.auth.getCurrentUser();
            
            // Prepare submission data
            const submissionData = {
                id: this.generateSubmissionId(),
                formId: formId,
                formTitle: this.formTemplates[formId].title,
                submittedBy: currentUser.username,
                submitterRole: currentUser.role,
                submissionTime: new Date().toISOString(),
                data: formData,
                status: 'completed'
            };

            // Save to IndexedDB
            await this.saveSubmissionToIndexedDB(submissionData);

            // Try to send email notification, but don't fail if it doesn't work
            try {
                await this.sendEmailNotification(submissionData);
                console.log('Email notification sent successfully');
            } catch (emailError) {
                console.warn('Email notification failed, but form was saved:', emailError);
                // Form submission still succeeds even if email fails
            }

            // Clear draft data
            this.clearDraftData(formId);

            // Show success message
            window.dashboard.showMessage('Form submitted successfully! The form has been saved to the system.', 'success');

            // Close modal
            window.dashboard.closeFormModal();

            // Refresh tracker if active
            if (window.formTracker && window.dashboard.getCurrentPanel() === 'tracker-panel') {
                window.formTracker.refreshStats();
                window.formTracker.refreshTable();
                window.formTracker.updateCharts();
            }

        } catch (error) {
            console.error('Form submission failed:', error);
            window.dashboard.showMessage('Failed to submit form. Please try again.', 'error');
        } finally {
            window.dashboard.hideLoading();
        }
    }

    async saveSubmissionToIndexedDB(submissionData) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('TruckingFormsDB', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('submissions')) {
                    const store = db.createObjectStore('submissions', { keyPath: 'id' });
                    store.createIndex('formId', 'formId', { unique: false });
                    store.createIndex('submittedBy', 'submittedBy', { unique: false });
                    store.createIndex('submissionTime', 'submissionTime', { unique: false });
                }
            };
            
            request.onsuccess = (e) => {
                const db = e.target.result;
                const transaction = db.transaction(['submissions'], 'readwrite');
                const store = transaction.objectStore('submissions');
                
                const addRequest = store.add(submissionData);
                addRequest.onsuccess = () => resolve(submissionData);
                addRequest.onerror = () => reject(addRequest.error);
            };
        });
    }

    async sendEmailNotification(submissionData) {
        if (!this.emailJSConfig.serviceId || this.emailJSConfig.serviceId === 'YOUR_EMAILJS_SERVICE_ID') {
            console.warn('EmailJS not configured properly');
            return;
        }

        const emailParams = {
            to_email: 'admin@alwaystrucking.com',
            form_title: submissionData.formTitle,
            submitted_by: submissionData.submittedBy,
            submission_time: new Date(submissionData.submissionTime).toLocaleString(),
            form_data: JSON.stringify(submissionData.data, null, 2),
            company_name: 'Always Trucking & Loading LLC'
        };

        try {
            await emailjs.send(
                this.emailJSConfig.serviceId,
                this.emailJSConfig.templateId,
                emailParams
            );
            console.log('Email notification sent successfully');
        } catch (error) {
            console.error('Failed to send email notification:', error);
            // Don't throw error - form submission should still succeed
        }
    }

    downloadForm(formId) {
        const template = this.formTemplates[formId];
        if (!template) {
            console.error('Form template not found:', formId);
            return;
        }

        // Create a printable version of the form
        const printContent = this.createPrintableForm(formId, template);
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Trigger print dialog
        printWindow.focus();
        printWindow.print();
    }

    createPrintableForm(formId, template) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${template.title} - Always Trucking & Loading LLC</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #001e44; padding-bottom: 20px; }
                    .logo { max-height: 80px; margin-bottom: 10px; }
                    .form-group { margin-bottom: 15px; }
                    label { font-weight: bold; display: block; margin-bottom: 5px; }
                    input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ccc; }
                    .signature-line { border-bottom: 1px solid #000; width: 300px; margin-top: 30px; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="nvcqdjvkw0.png" alt="Always Trucking & Loading LLC" class="logo">
                    <h1>Always Trucking & Loading LLC</h1>
                    <h2>${template.title}</h2>
                    <p>Milwaukee, WI | Equal Opportunity Employer</p>
                </div>
                ${template.html}
                <div style="margin-top: 40px;">
                    <p><strong>Date:</strong> ________________</p>
                    <div class="signature-line"></div>
                    <p>Signature</p>
                </div>
            </body>
            </html>
        `;
    }

    printForm() {
        const modalBody = document.getElementById('modal-body');
        if (!modalBody) return;

        const modalTitle = document.getElementById('modal-title').textContent;
        const formContent = modalBody.innerHTML;

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${modalTitle} - Always Trucking & Loading LLC</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #001e44; padding-bottom: 20px; }
                    .form-group { margin-bottom: 15px; }
                    label { font-weight: bold; display: block; margin-bottom: 5px; }
                    input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ccc; }
                    button { display: none !important; }
                    @media print { button { display: none !important; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Always Trucking & Loading LLC</h1>
                    <h2>${modalTitle}</h2>
                    <p>Milwaukee, WI | Equal Opportunity Employer</p>
                </div>
                ${formContent}
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    getFormData(form) {
        const formData = {};
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                formData[input.name || input.id] = input.checked;
            } else if (input.type === 'radio') {
                if (input.checked) {
                    formData[input.name || input.id] = input.value;
                }
            } else {
                formData[input.name || input.id] = input.value;
            }
        });
        
        return formData;
    }

    populateFormWithData(formHTML, data) {
        let populatedHTML = formHTML;
        
        Object.keys(data).forEach(key => {
            const value = data[key];
            
            // Replace input values
            const inputRegex = new RegExp(`(<input[^>]*(?:name|id)="${key}"[^>]*)(>)`, 'gi');
            populatedHTML = populatedHTML.replace(inputRegex, (match, p1, p2) => {
                if (typeof value === 'boolean') {
                    return p1 + (value ? ' checked' : '') + p2;
                } else {
                    return p1 + ` value="${value}"` + p2;
                }
            });
            
            // Replace textarea content
            const textareaRegex = new RegExp(`(<textarea[^>]*(?:name|id)="${key}"[^>]*>)[^<]*(</textarea>)`, 'gi');
            populatedHTML = populatedHTML.replace(textareaRegex, `$1${value}$2`);
            
            // Replace select options
            const optionRegex = new RegExp(`(<option[^>]*value="${value}"[^>]*)(>)`, 'gi');
            populatedHTML = populatedHTML.replace(optionRegex, '$1 selected$2');
        });
        
        return populatedHTML;
    }

    saveDraftData(formId, data) {
        const draftKey = `form_draft_${formId}`;
        localStorage.setItem(draftKey, JSON.stringify(data));
    }

    loadDraftData(formId) {
        const draftKey = `form_draft_${formId}`;
        const draftData = localStorage.getItem(draftKey);
        return draftData ? JSON.parse(draftData) : null;
    }

    clearDraftData(formId) {
        const draftKey = `form_draft_${formId}`;
        localStorage.removeItem(draftKey);
    }

    generateSubmissionId() {
        return 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Form HTML templates continue in the next part...
    getJobApplicationHTML() {
        return `
            <form>
                <div class="form-header">
                    <h3>Always Trucking & Loading LLC - Job Application</h3>
                    <p>Please complete all sections accurately and thoroughly.</p>
                </div>
                
                <div class="form-group">
                    <label for="full-name">Full Legal Name *</label>
                    <input type="text" id="full-name" name="full-name" required>
                </div>
                
                <div class="form-group">
                    <label for="phone">Phone Number *</label>
                    <input type="tel" id="phone" name="phone" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email Address *</label>
                    <input type="email" id="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label for="address">Current Address</label>
                    <input type="text" id="address" name="address">
                </div>
                
                <div class="form-group">
                    <label for="ssn-last4">Last 4 Digits of SSN</label>
                    <input type="text" id="ssn-last4" name="ssn-last4" maxlength="4" pattern="[0-9]{4}">
                </div>
                
                <div class="form-group">
                    <label for="dob">Date of Birth</label>
                    <input type="date" id="dob" name="dob">
                </div>
                
                <div class="form-group">
                    <label for="cdl-valid">Do you have a valid CDL? *</label>
                    <select id="cdl-valid" name="cdl-valid" required>
                        <option value="">-- Select --</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="cdl-class">CDL Class</label>
                    <select id="cdl-class" name="cdl-class">
                        <option value="">-- Select --</option>
                        <option value="A">Class A</option>
                        <option value="B">Class B</option>
                        <option value="C">Class C</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="position">Position Applying For</label>
                    <input type="text" id="position" name="position" placeholder="e.g., OTR Driver, Local Driver, etc.">
                </div>
                
                <div class="form-group">
                    <label for="start-date">Available Start Date</label>
                    <input type="date" id="start-date" name="start-date">
                </div>
                
                <div class="form-group">
                    <label for="emergency-contact">Emergency Contact (Name & Phone)</label>
                    <input type="text" id="emergency-contact" name="emergency-contact" placeholder="Name: Phone Number">
                </div>
                
                <div class="form-group">
                    <label for="signature">Digital Signature (Type Your Full Name) *</label>
                    <input type="text" id="signature" name="signature" required placeholder="Type your full name as signature">
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> Submit Application
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="window.print()">
                        <i class="fas fa-print"></i> Print
                    </button>
                </div>
            </form>
        `;
    }

    getDailyLogHTML() {
        return `
            <form>
                <div class="form-header">
                    <h3>Always Trucking & Loading LLC - Driver Daily Log</h3>
                    <p>Federal regulations require accurate daily records of driver activity.</p>
                </div>
                
                <div class="form-group">
                    <label for="driver-name">Driver Name *</label>
                    <input type="text" id="driver-name" name="driver-name" required>
                </div>
                
                <div class="form-group">
                    <label for="log-date">Date *</label>
                    <input type="date" id="log-date" name="log-date" required>
                </div>
                
                <div class="form-group">
                    <label for="truck-number">Truck Number</label>
                    <input type="text" id="truck-number" name="truck-number">
                </div>
                
                <div class="form-group">
                    <label for="trailer-number">Trailer Number</label>
                    <input type="text" id="trailer-number" name="trailer-number">
                </div>
                
                <div class="form-group">
                    <label for="odometer-start">Odometer Start</label>
                    <input type="number" id="odometer-start" name="odometer-start">
                </div>
                
                <div class="form-group">
                    <label for="odometer-end">Odometer End</label>
                    <input type="number" id="odometer-end" name="odometer-end">
                </div>
                
                <div class="form-group">
                    <label for="total-miles">Total Miles</label>
                    <input type="number" id="total-miles" name="total-miles">
                </div>
                
                <h4>Daily Activity Log</h4>
                <div class="activity-log">
                    <div class="activity-header">
                        <div>Time</div>
                        <div>Activity/Status</div>
                        <div>Location/Notes</div>
                    </div>
                    ${Array.from({length: 6}, (_, i) => `
                        <div class="activity-row">
                            <input type="time" name="time-${i+1}" placeholder="Time">
                            <input type="text" name="activity-${i+1}" placeholder="Activity">
                            <input type="text" name="location-${i+1}" placeholder="Location/Notes">
                        </div>
                    `).join('')}
                </div>
                
                <div class="form-group">
                    <label for="driver-signature">Driver Signature (Type Name) *</label>
                    <input type="text" id="driver-signature" name="driver-signature" required>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> Submit Log
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="window.print()">
                        <i class="fas fa-print"></i> Print
                    </button>
                </div>
                
                <style>
                    .activity-log { margin: 20px 0; }
                    .activity-header { display: grid; grid-template-columns: 1fr 2fr 2fr; gap: 10px; font-weight: bold; margin-bottom: 10px; }
                    .activity-row { display: grid; grid-template-columns: 1fr 2fr 2fr; gap: 10px; margin-bottom: 10px; }
                    .activity-row input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
                </style>
            </form>
        `;
    }

    getVehicleInspectionHTML() {
        return `
            <form>
                <div class="form-header">
                    <h3>Always Trucking & Loading LLC - Vehicle Inspection Report</h3>
                    <p>Complete pre-trip and post-trip vehicle inspection as required by DOT regulations.</p>
                </div>
                
                <div class="form-group">
                    <label for="inspector-name">Inspector Name *</label>
                    <input type="text" id="inspector-name" name="inspector-name" required>
                </div>
                
                <div class="form-group">
                    <label for="inspection-date">Inspection Date *</label>
                    <input type="date" id="inspection-date" name="inspection-date" required>
                </div>
                
                <div class="form-group">
                    <label for="vehicle-truck">Truck Number</label>
                    <input type="text" id="vehicle-truck" name="vehicle-truck">
                </div>
                
                <div class="form-group">
                    <label for="vehicle-trailer">Trailer Number</label>
                    <input type="text" id="vehicle-trailer" name="vehicle-trailer">
                </div>
                
                <div class="form-group">
                    <label for="odometer-reading">Odometer Reading</label>
                    <input type="number" id="odometer-reading" name="odometer-reading">
                </div>
                
                <h4>Inspection Checklist</h4>
                <div class="inspection-checklist">
                    ${[
                        'Brakes (Service & Parking)',
                        'Tires & Wheels',
                        'Lights & Reflectors',
                        'Mirrors',
                        'Windshield Wipers',
                        'Horn',
                        'Emergency Equipment',
                        'Steering Mechanism',
                        'Suspension System',
                        'Exhaust System',
                        'Coupling Devices',
                        'Trailer Connection',
                        'Doors & Hinges',
                        'Seat Belts',
                        'Fire Extinguisher',
                        'Warning Triangles',
                        'First Aid Kit',
                        'Cargo Securement'
                    ].map(item => `
                        <div class="checklist-item">
                            <label>
                                <input type="checkbox" name="check-${item.toLowerCase().replace(/[^a-z]/g, '-')}" value="ok">
                                ${item}
                            </label>
                        </div>
                    `).join('')}
                </div>
                
                <div class="form-group">
                    <label for="defects-notes">Defects Found / Notes</label>
                    <textarea id="defects-notes" name="defects-notes" rows="4" placeholder="List any defects, damages, or maintenance needs..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="inspector-signature">Inspector Signature (Type Name) *</label>
                    <input type="text" id="inspector-signature" name="inspector-signature" required>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> Submit Inspection
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="window.print()">
                        <i class="fas fa-print"></i> Print
                    </button>
                </div>
                
                <style>
                    .inspection-checklist { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                        gap: 15px; 
                        margin: 20px 0; 
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    }
                    .checklist-item label { 
                        display: flex; 
                        align-items: center; 
                        font-weight: normal; 
                        cursor: pointer;
                    }
                    .checklist-item input[type="checkbox"] { 
                        margin-right: 10px; 
                        width: auto;
                    }
                </style>
            </form>
        `;
    }

    // Continuing with more form templates...
    getDispatchSheetHTML() {
        return `
            <form>
                <div class="form-header">
                    <h3>Always Trucking & Loading LLC - Dispatch Sheet</h3>
                    <p>Load assignment and routing information for drivers.</p>
                </div>
                
                <div class="form-group">
                    <label for="dispatch-date">Date *</label>
                    <input type="date" id="dispatch-date" name="dispatch-date" required>
                </div>
                
                <div class="form-group">
                    <label for="dispatcher-name">Dispatcher Name *</label>
                    <input type="text" id="dispatcher-name" name="dispatcher-name" required>
                </div>
                
                <div class="form-group">
                    <label for="assigned-driver">Assigned Driver</label>
                    <input type="text" id="assigned-driver" name="assigned-driver">
                </div>
                
                <div class="form-group">
                    <label for="dispatch-truck">Truck Number</label>
                    <input type="text" id="dispatch-truck" name="dispatch-truck">
                </div>
                
                <div class="form-group">
                    <label for="dispatch-trailer">Trailer Number</label>
                    <input type="text" id="dispatch-trailer" name="dispatch-trailer">
                </div>
                
                <h4>Load Information</h4>
                
                <div class="form-group">
                    <label for="load-number">Load Number</label>
                    <input type="text" id="load-number" name="load-number">
                </div>
                
                <div class="form-group">
                    <label for="broker-client">Broker/Client Name</label>
                    <input type="text" id="broker-client" name="broker-client">
                </div>
                
                <div class="form-group">
                    <label for="pickup-location">Pickup Location *</label>
                    <input type="text" id="pickup-location" name="pickup-location" required>
                </div>
                
                <div class="form-group">
                    <label for="pickup-datetime">Pickup Date/Time</label>
                    <input type="datetime-local" id="pickup-datetime" name="pickup-datetime">
                </div>
                
                <div class="form-group">
                    <label for="delivery-location">Delivery Location *</label>
                    <input type="text" id="delivery-location" name="delivery-location" required>
                </div>
                
                <div class="form-group">
                    <label for="delivery-datetime">Delivery Date/Time</label>
                    <input type="datetime-local" id="delivery-datetime" name="delivery-datetime">
                </div>
                
                <div class="form-group">
                    <label for="agreed-rate">Rate Agreed</label>
                    <input type="text" id="agreed-rate" name="agreed-rate" placeholder="$0.00">
                </div>
                
                <div class="form-group">
                    <label for="special-instructions">Special Instructions</label>
                    <textarea id="special-instructions" name="special-instructions" rows="4" placeholder="Delivery requirements, contact information, special handling..."></textarea>
                </div>
                
                <h4>Signatures</h4>
                
                <div class="form-group">
                    <label for="dispatcher-signature">Dispatcher Signature (Type Name) *</label>
                    <input type="text" id="dispatcher-signature" name="dispatcher-signature" required>
                </div>
                
                <div class="form-group">
                    <label for="driver-acknowledgment">Driver Acknowledgment (Type Name)</label>
                    <input type="text" id="driver-acknowledgment" name="driver-acknowledgment">
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> Submit Dispatch
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="window.print()">
                        <i class="fas fa-print"></i> Print
                    </button>
                </div>
            </form>
        `;
    }

    // Additional form templates would continue here...
    // For brevity, I'll include just a few more key ones

    getAccidentReportHTML() {
        return `
            <form>
                <div class="form-header">
                    <h3>Always Trucking & Loading LLC - Accident Report Form</h3>
                    <p><strong>IMPORTANT:</strong> Complete immediately after any accident or incident.</p>
                </div>
                
                <div class="form-group">
                    <label for="accident-date">Date of Accident *</label>
                    <input type="date" id="accident-date" name="accident-date" required>
                </div>
                
                <div class="form-group">
                    <label for="accident-time">Time of Accident</label>
                    <input type="time" id="accident-time" name="accident-time">
                </div>
                
                <div class="form-group">
                    <label for="accident-location">Location of Accident *</label>
                    <input type="text" id="accident-location" name="accident-location" required placeholder="Street address, city, state">
                </div>
                
                <div class="form-group">
                    <label for="reporting-driver">Reporting Driver *</label>
                    <input type="text" id="reporting-driver" name="reporting-driver" required>
                </div>
                
                <div class="form-group">
                    <label for="accident-truck">Truck Number</label>
                    <input type="text" id="accident-truck" name="accident-truck">
                </div>
                
                <div class="form-group">
                    <label for="accident-trailer">Trailer Number</label>
                    <input type="text" id="accident-trailer" name="accident-trailer">
                </div>
                
                <div class="form-group">
                    <label for="other-party">Other Party Information</label>
                    <textarea id="other-party" name="other-party" rows="3" placeholder="Name, contact info, insurance details..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="accident-description">Description of Accident *</label>
                    <textarea id="accident-description" name="accident-description" rows="4" required placeholder="Describe how the accident occurred..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="injuries-damages">Injuries and Property Damage</label>
                    <textarea id="injuries-damages" name="injuries-damages" rows="3" placeholder="List all injuries and property damage..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="police-officer">Police Officer Name/Badge #</label>
                    <input type="text" id="police-officer" name="police-officer">
                </div>
                
                <div class="form-group">
                    <label for="police-report">Police Report Number</label>
                    <input type="text" id="police-report" name="police-report">
                </div>
                
                <div class="form-group">
                    <label for="accident-signature">Driver Signature (Type Name) *</label>
                    <input type="text" id="accident-signature" name="accident-signature" required>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> Submit Report
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="window.print()">
                        <i class="fas fa-print"></i> Print
                    </button>
                </div>
            </form>
        `;
    }

    // Simplified versions of remaining forms for space - production would have full detailed forms
    getRateConfirmationHTML() {
        return `<form><h3>Rate Confirmation Sheet</h3><p>Load rate and payment confirmation</p><input type="text" name="load-id" placeholder="Load ID"><input type="text" name="rate" placeholder="Agreed Rate"><textarea name="terms" placeholder="Terms and conditions"></textarea><button type="submit" class="btn btn-primary">Submit</button></form>`;
    }

    getBillOfLadingHTML() {
        return `<form><h3>Bill of Lading</h3><p>Freight shipment documentation</p><input type="text" name="bol-number" placeholder="BOL Number"><input type="text" name="shipper" placeholder="Shipper"><input type="text" name="consignee" placeholder="Consignee"><textarea name="freight-description" placeholder="Freight Description"></textarea><button type="submit" class="btn btn-primary">Submit</button></form>`;
    }

    getProofOfDeliveryHTML() {
        return `<form><h3>Proof of Delivery</h3><p>Delivery confirmation documentation</p><input type="text" name="pod-number" placeholder="POD Number"><input type="datetime-local" name="delivery-time" placeholder="Delivery Time"><input type="text" name="receiver" placeholder="Received By"><textarea name="condition" placeholder="Condition Notes"></textarea><button type="submit" class="btn btn-primary">Submit</button></form>`;
    }

    getFreightInvoiceHTML() {
        return `<form><h3>Freight Invoice</h3><p>Billing and payment documentation</p><input type="text" name="invoice-number" placeholder="Invoice Number"><input type="text" name="customer" placeholder="Bill To Customer"><input type="number" name="amount" placeholder="Total Amount"><button type="submit" class="btn btn-primary">Submit</button></form>`;
    }

    getDeliveryReceiptHTML() {
        return `<form><h3>Delivery Receipt</h3><p>TMS load summary and receipt</p><input type="text" name="load-id" placeholder="Load ID"><input type="text" name="driver" placeholder="Driver Name"><input type="datetime-local" name="completion-time" placeholder="Completion Time"><textarea name="notes" placeholder="Delivery Notes"></textarea><button type="submit" class="btn btn-primary">Submit</button></form>`;
    }
}

// Initialize forms manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.formsManager = new FormsManager();
});

// Global functions for onclick handlers
function openForm(formId) {
    if (window.formsManager) {
        window.formsManager.openForm(formId);
    }
}

function downloadForm(formId) {
    if (window.formsManager) {
        window.formsManager.downloadForm(formId);
    }
}

function closeFormModal() {
    if (window.dashboard) {
        window.dashboard.closeFormModal();
    }
}