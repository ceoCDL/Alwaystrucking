/**
 * IndexedDB Database Management for Always Trucking Admin Dashboard
 * Handles creation and management of database, stores, and CRUD operations
 */

// Database configuration
const DB_NAME = 'AlwaysTruckingDB';
const DB_VERSION = 1;
const STORES = {
    USERS: 'users',
    FORMS: 'forms',
    SUBMISSIONS: 'submissions',
    SETTINGS: 'settings'
};

// Database instance
let db;

// Default users for initial setup
const DEFAULT_USERS = [
    {
        id: 1,
        username: 'admin',
        password: 'admin123',
        fullName: 'Admin User',
        role: 'admin',
        status: 'active',
        created: new Date().toISOString()
    },
    {
        id: 2,
        username: 'dispatcher',
        password: 'dispatch123',
        fullName: 'Dispatch Manager',
        role: 'dispatcher',
        status: 'active',
        created: new Date().toISOString()
    },
    {
        id: 3,
        username: 'driver',
        password: 'driver123',
        fullName: 'John Driver',
        role: 'driver',
        status: 'active',
        created: new Date().toISOString()
    }
];

// Default forms metadata
const DEFAULT_FORMS = [
    {
        id: 'job-application',
        name: 'Job Application',
        category: 'driver',
        path: 'forms/job-application.html',
        icon: 'fas fa-user-plus',
        description: 'Apply for a position at Always Trucking'
    },
    {
        id: 'driver-daily-log',
        name: 'Driver Daily Log',
        category: 'driver',
        path: 'forms/driver-daily-log.html',
        icon: 'fas fa-calendar-day',
        description: 'Track driver hours and activities'
    },
    {
        id: 'vehicle-inspection',
        name: 'Vehicle Inspection Report',
        category: 'driver',
        path: 'forms/vehicle-inspection.html',
        icon: 'fas fa-clipboard-list',
        description: 'Complete pre/post trip vehicle inspections'
    },
    {
        id: 'dispatch-sheet',
        name: 'Dispatch Sheet',
        category: 'dispatch',
        path: 'forms/dispatch-sheet.html',
        icon: 'fas fa-clipboard',
        description: 'Assign loads and route information'
    },
    {
        id: 'rate-confirmation',
        name: 'Rate Confirmation',
        category: 'dispatch',
        path: 'forms/rate-confirmation.html',
        icon: 'fas fa-file-invoice-dollar',
        description: 'Document agreed rates for loads'
    },
    {
        id: 'bill-of-lading',
        name: 'Bill of Lading',
        category: 'dispatch',
        path: 'forms/bill-of-lading.html',
        icon: 'fas fa-file-contract',
        description: 'Shipping document and receipt'
    },
    {
        id: 'proof-of-delivery',
        name: 'Proof of Delivery',
        category: 'delivery',
        path: 'forms/proof-of-delivery.html',
        icon: 'fas fa-truck-loading',
        description: 'Confirm successful delivery of shipment'
    },
    {
        id: 'freight-invoice',
        name: 'Freight Invoice',
        category: 'delivery',
        path: 'forms/freight-invoice.html',
        icon: 'fas fa-file-invoice',
        description: 'Billing document for freight services'
    },
    {
        id: 'delivery-receipt',
        name: 'Delivery Receipt',
        category: 'delivery',
        path: 'forms/delivery-receipt.html',
        icon: 'fas fa-receipt',
        description: 'Document confirming delivery completion'
    },
    {
        id: 'accident-report',
        name: 'Accident Report',
        category: 'driver',
        path: 'forms/accident-report.html',
        icon: 'fas fa-car-crash',
        description: 'Document accident details and information'
    }
];

// Default settings
const DEFAULT_SETTINGS = {
    emailJS: {
        serviceId: 'YOUR_EMAIL_SERVICE_ID',
        templateId: 'YOUR_EMAIL_TEMPLATE_ID',
        userId: 'YOUR_EMAIL_USER_ID'
    },
    company: {
        name: 'Always Trucking & Loading LLC',
        location: 'Milwaukee, WI',
        phone: '(414) 239-9333',
        email: 'training@alwaystrucking.com'
    }
};

/**
 * Initialize the database and create object stores
 * @returns {Promise} Resolves when the database is initialized
 */
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        // Create object stores when database is created or upgraded
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // Create Users store with username as key path
            if (!db.objectStoreNames.contains(STORES.USERS)) {
                const usersStore = db.createObjectStore(STORES.USERS, { keyPath: 'id', autoIncrement: true });
                usersStore.createIndex('username', 'username', { unique: true });
                usersStore.createIndex('role', 'role', { unique: false });
            }
            
            // Create Forms store with id as key path
            if (!db.objectStoreNames.contains(STORES.FORMS)) {
                const formsStore = db.createObjectStore(STORES.FORMS, { keyPath: 'id' });
                formsStore.createIndex('category', 'category', { unique: false });
            }
            
            // Create Submissions store with auto-incrementing id
            if (!db.objectStoreNames.contains(STORES.SUBMISSIONS)) {
                const submissionsStore = db.createObjectStore(STORES.SUBMISSIONS, { keyPath: 'id', autoIncrement: true });
                submissionsStore.createIndex('formId', 'formId', { unique: false });
                submissionsStore.createIndex('userId', 'userId', { unique: false });
                submissionsStore.createIndex('submittedAt', 'submittedAt', { unique: false });
                submissionsStore.createIndex('status', 'status', { unique: false });
            }
            
            // Create Settings store with a single record
            if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
            }
        };
        
        // Handle successful database opening
        request.onsuccess = function(event) {
            db = event.target.result;
            console.log('Database initialized successfully');
            
            // Initialize with default data if needed
            initializeDefaultData()
                .then(() => resolve(db))
                .catch(error => reject(error));
        };
        
        // Handle database opening error
        request.onerror = function(event) {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Initialize default data in the database
 * @returns {Promise} Resolves when all default data is added
 */
function initializeDefaultData() {
    return Promise.all([
        initializeStore(STORES.USERS, DEFAULT_USERS),
        initializeStore(STORES.FORMS, DEFAULT_FORMS),
        initializeSettings()
    ]);
}

/**
 * Initialize a store with default data if it's empty
 * @param {string} storeName - The name of the store to initialize
 * @param {Array} defaultData - Default data to add if store is empty
 * @returns {Promise} Resolves when store initialization is complete
 */
function initializeStore(storeName, defaultData) {
    return new Promise((resolve, reject) => {
        // Check if store is empty
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const countRequest = store.count();
        
        countRequest.onsuccess = function() {
            if (countRequest.result === 0) {
                // Store is empty, add default data
                const writeTransaction = db.transaction(storeName, 'readwrite');
                const writeStore = writeTransaction.objectStore(storeName);
                
                let completed = 0;
                let failed = 0;
                
                defaultData.forEach(item => {
                    const addRequest = writeStore.add(item);
                    
                    addRequest.onsuccess = function() {
                        completed++;
                        if (completed + failed === defaultData.length) {
                            console.log(`Initialized ${storeName} with ${completed} default records`);
                            resolve();
                        }
                    };
                    
                    addRequest.onerror = function(event) {
                        console.error(`Error adding default data to ${storeName}:`, event.target.error);
                        failed++;
                        if (completed + failed === defaultData.length) {
                            if (failed === defaultData.length) {
                                reject(new Error(`Failed to initialize ${storeName}`));
                            } else {
                                console.log(`Initialized ${storeName} with ${completed} default records (${failed} failed)`);
                                resolve();
                            }
                        }
                    };
                });
                
                writeTransaction.onerror = function(event) {
                    console.error(`Transaction error initializing ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } else {
                // Store already has data
                console.log(`${storeName} already initialized with ${countRequest.result} records`);
                resolve();
            }
        };
        
        countRequest.onerror = function(event) {
            console.error(`Error checking ${storeName} count:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Initialize settings store with default settings
 * @returns {Promise} Resolves when settings are initialized
 */
function initializeSettings() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
        const store = transaction.objectStore(STORES.SETTINGS);
        
        // Check if settings exist
        const getRequest = store.get('app-settings');
        
        getRequest.onsuccess = function() {
            if (!getRequest.result) {
                // Settings don't exist, add default settings
                const settings = {
                    id: 'app-settings',
                    ...DEFAULT_SETTINGS,
                    lastUpdated: new Date().toISOString()
                };
                
                const addRequest = store.add(settings);
                
                addRequest.onsuccess = function() {
                    console.log('Initialized settings with default values');
                    resolve();
                };
                
                addRequest.onerror = function(event) {
                    console.error('Error adding default settings:', event.target.error);
                    reject(event.target.error);
                };
            } else {
                // Settings already exist
                console.log('Settings already initialized');
                resolve();
            }
        };
        
        getRequest.onerror = function(event) {
            console.error('Error checking settings:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Get all items from a store
 * @param {string} storeName - The name of the store to get items from
 * @returns {Promise} Resolves with an array of all items in the store
 */
function getAllItems(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = function() {
            resolve(request.result);
        };
        
        request.onerror = function(event) {
            console.error(`Error getting all items from ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Get an item from a store by key
 * @param {string} storeName - The name of the store
 * @param {*} key - The key of the item to get
 * @returns {Promise} Resolves with the item if found, or null
 */
function getItem(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = function() {
            resolve(request.result);
        };
        
        request.onerror = function(event) {
            console.error(`Error getting item from ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Get items from a store by index
 * @param {string} storeName - The name of the store
 * @param {string} indexName - The name of the index to query
 * @param {*} value - The value to search for
 * @returns {Promise} Resolves with an array of matching items
 */
function getItemsByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        
        request.onsuccess = function() {
            resolve(request.result);
        };
        
        request.onerror = function(event) {
            console.error(`Error getting items by index from ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Add an item to a store
 * @param {string} storeName - The name of the store
 * @param {Object} item - The item to add
 * @returns {Promise} Resolves with the key of the added item
 */
function addItem(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(item);
        
        request.onsuccess = function() {
            resolve(request.result);
        };
        
        request.onerror = function(event) {
            console.error(`Error adding item to ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Update an item in a store
 * @param {string} storeName - The name of the store
 * @param {Object} item - The item to update (must include key property)
 * @returns {Promise} Resolves when update is complete
 */
function updateItem(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);
        
        request.onsuccess = function() {
            resolve(request.result);
        };
        
        request.onerror = function(event) {
            console.error(`Error updating item in ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Delete an item from a store
 * @param {string} storeName - The name of the store
 * @param {*} key - The key of the item to delete
 * @returns {Promise} Resolves when deletion is complete
 */
function deleteItem(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        
        request.onsuccess = function() {
            resolve();
        };
        
        request.onerror = function(event) {
            console.error(`Error deleting item from ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Clear all data from a store
 * @param {string} storeName - The name of the store to clear
 * @returns {Promise} Resolves when store is cleared
 */
function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = function() {
            console.log(`Cleared all data from ${storeName}`);
            resolve();
        };
        
        request.onerror = function(event) {
            console.error(`Error clearing ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Get application settings
 * @returns {Promise} Resolves with the application settings
 */
function getSettings() {
    return getItem(STORES.SETTINGS, 'app-settings');
}

/**
 * Update application settings
 * @param {Object} settings - The settings to update
 * @returns {Promise} Resolves when settings are updated
 */
function updateSettings(settings) {
    const updatedSettings = {
        id: 'app-settings',
        ...settings,
        lastUpdated: new Date().toISOString()
    };
    return updateItem(STORES.SETTINGS, updatedSettings);
}

/**
 * Authenticate a user with username and password
 * @param {string} username - The username to authenticate
 * @param {string} password - The password to verify
 * @returns {Promise} Resolves with the user object if authenticated, or null
 */
function authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.USERS, 'readonly');
        const store = transaction.objectStore(STORES.USERS);
        const index = store.index('username');
        const request = index.get(username);
        
        request.onsuccess = function() {
            const user = request.result;
            if (user && user.password === password && user.status === 'active') {
                // Remove password before returning user
                const { password, ...userWithoutPassword } = user;
                resolve(userWithoutPassword);
            } else {
                resolve(null);
            }
        };
        
        request.onerror = function(event) {
            console.error('Error authenticating user:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Add a form submission
 * @param {Object} submission - The submission data
 * @returns {Promise} Resolves with the submission ID
 */
function addSubmission(submission) {
    const newSubmission = {
        ...submission,
        submittedAt: new Date().toISOString(),
        status: submission.status || 'pending'
    };
    return addItem(STORES.SUBMISSIONS, newSubmission);
}

/**
 * Get recent submissions
 * @param {number} limit - Maximum number of submissions to return
 * @returns {Promise} Resolves with an array of recent submissions
 */
function getRecentSubmissions(limit = 10) {
    return new Promise((resolve, reject) => {
        getAllItems(STORES.SUBMISSIONS)
            .then(submissions => {
                // Sort by submission date, newest first
                const sorted = submissions.sort((a, b) => 
                    new Date(b.submittedAt) - new Date(a.submittedAt)
                );
                
                // Limit the number of results
                const limited = sorted.slice(0, limit);
                
                resolve(limited);
            })
            .catch(error => reject(error));
    });
}

/**
 * Export database to JSON
 * @returns {Promise} Resolves with database JSON
 */
function exportDatabase() {
    return new Promise((resolve, reject) => {
        Promise.all([
            getAllItems(STORES.USERS),
            getAllItems(STORES.FORMS),
            getAllItems(STORES.SUBMISSIONS),
            getSettings()
        ])
            .then(([users, forms, submissions, settings]) => {
                const exportData = {
                    users: users.map(user => {
                        // Remove passwords for security
                        const { password, ...userWithoutPassword } = user;
                        return userWithoutPassword;
                    }),
                    forms,
                    submissions,
                    settings,
                    exportDate: new Date().toISOString()
                };
                
                resolve(exportData);
            })
            .catch(error => reject(error));
    });
}

/**
 * Import database from JSON
 * @param {Object} importData - The data to import
 * @returns {Promise} Resolves when import is complete
 */
function importDatabase(importData) {
    return new Promise((resolve, reject) => {
        // Validate import data
        if (!importData || !importData.forms || !importData.submissions || !importData.settings) {
            reject(new Error('Invalid import data format'));
            return;
        }
        
        // Clear existing data and import new data
        Promise.all([
            // Don't clear users store to preserve passwords
            clearStore(STORES.FORMS),
            clearStore(STORES.SUBMISSIONS),
            clearStore(STORES.SETTINGS)
        ])
            .then(() => {
                // Import forms
                const formsPromises = importData.forms.map(form => 
                    addItem(STORES.FORMS, form)
                );
                
                // Import submissions
                const submissionsPromises = importData.submissions.map(submission => 
                    addItem(STORES.SUBMISSIONS, submission)
                );
                
                // Import settings
                const settingsPromise = updateSettings(importData.settings);
                
                return Promise.all([
                    Promise.all(formsPromises),
                    Promise.all(submissionsPromises),
                    settingsPromise
                ]);
            })
            .then(() => {
                console.log('Database import completed successfully');
                resolve();
            })
            .catch(error => {
                console.error('Error importing database:', error);
                reject(error);
            });
    });
}

// Export database functions
window.DB = {
    init: initDatabase,
    getAll: getAllItems,
    get: getItem,
    getByIndex: getItemsByIndex,
    add: addItem,
    update: updateItem,
    delete: deleteItem,
    clear: clearStore,
    authenticate: authenticateUser,
    addSubmission,
    getRecentSubmissions,
    getSettings,
    updateSettings,
    export: exportDatabase,
    import: importDatabase,
    STORES
};

// Initialize the database when the script loads
document.addEventListener('DOMContentLoaded', () => {
    initDatabase()
        .then(() => console.log('Database ready'))
        .catch(error => console.error('Database initialization failed:', error));
});