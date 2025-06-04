/**
 * Agent Lee - Interactive AI Guide for Always Trucking & Loading LLC
 * This script provides the functionality for the Agent Lee assistant
 * including mobile responsiveness and drag/resize features
 */

// Store widget position and state
let agentLeeState = {
    isMinimized: false,
    isResizing: false,
    isDragging: false,
    originalPosition: { right: '30px', bottom: '30px' },
    lastPosition: { x: 0, y: 0 },
    offsetX: 0,
    offsetY: 0,
    isWidthAdjusted: false
};

// Initialize Agent Lee when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupAgentLee();
    
    // Ensure Agent Lee is visible on every page
    const widget = document.getElementById('agent-lee-widget');
    if (widget) {
        widget.style.display = 'block';
    }
    
    // Add Agent Lee to all pages if not already present
    if (!document.getElementById('agent-lee-widget')) {
        createAgentLeeWidget();
    }
});

/**
 * Setup all Agent Lee functionality
 */
function setupAgentLee() {
    // Position widget properly on load
    positionAgentLee();
    
    // Initialize draggable functionality
    initAgentLeeDraggable();
    
    // Make Agent Lee responsive
    makeAgentLeeResponsive();
    
    // Add window resize handler
    window.addEventListener('resize', handleWindowResize);
    
    // Fix Agent Lee position
    fixAgentLeePosition();
    
    // Add initial greeting with speaking functionality
    addInitialAgentGreeting();
}

/**
 * Create Agent Lee widget if it doesn't exist
 */
function createAgentLeeWidget() {
    const existingWidget = document.getElementById('agent-lee-widget');
    if (existingWidget) return;
    
    const widget = document.createElement('div');
    widget.id = 'agent-lee-widget';
    widget.innerHTML = `
        <div id="agent-chat-button" class="agent-chat-button" onclick="toggleAgentLeeWidget()">
            <i class="fas fa-comment-dots" style="color: white; font-size: 18px;"></i>
        </div>
        
        <div id="agent-chat-popup" class="agent-chat-popup" style="display: none;">
            <div class="agent-chat-header" id="agent-drag-handle">
                <div class="agent-chat-title">
                    <img src="tg1czkz4ak.png" alt="Agent Lee" class="agent-avatar">
                    <div class="agent-info">
                        <h4>Agent Lee</h4>
                        <p>Your Training Guide</p>
                    </div>
                </div>
                <div class="agent-controls">
                    <button class="agent-control-btn" onclick="resizeAgentLee()" title="Resize">
                        <i class="fas fa-expand-arrows-alt"></i>
                    </button>
                    <button class="agent-control-btn" onclick="minimizeAgentLee()" title="Minimize">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="agent-control-btn" onclick="closeAgentLee()" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div id="agent-chat-messages" class="agent-chat-messages">
                <div class="agent-message agent-assistant">
                    <p>Hi! I'm Agent Lee, your training assistant! How can I help you with your trucking career today?</p>
                </div>
            </div>
            
            <div class="agent-chat-input">
                <input type="text" id="agent-message-input" class="agent-input" placeholder="Ask about our training courses..." onkeypress="handleEnterKey(event)">
                <button class="agent-send-btn" onclick="sendAgentMessage()">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(widget);
}

/**
 * Add initial greeting with page context
 */
function addInitialAgentGreeting() {
    const messages = document.getElementById('agent-chat-messages');
    if (!messages) return;
    
    // Clear existing messages first
    messages.innerHTML = '';
    
    // Get page-specific greeting
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    let greeting = getPageSpecificGreeting(currentPage);
    
    // Add the greeting message
    const greetingDiv = document.createElement('div');
    greetingDiv.className = 'agent-message agent-assistant';
    greetingDiv.innerHTML = `<p>${greeting}</p>`;
    messages.appendChild(greetingDiv);
    
    // Scroll to bottom
    messages.scrollTop = messages.scrollHeight;
}

/**
 * Get page-specific greeting
 */
function getPageSpecificGreeting(page) {
    const greetings = {
        'index.html': "Welcome to Always Trucking! I'm Agent Lee, your personal training guide. I can help you navigate our courses, answer questions about our CDL and dispatcher programs, and guide you through starting your trucking career. What would you like to learn about today?",
        'courses.html': "Welcome to our Courses page! I see you're exploring our training programs. We offer CDL continuing education, dispatcher training, and compliance courses. All are FMCSA-approved with high job placement rates. Which course interests you most?",
        'dashboard.html': "Welcome to your Dashboard! I'm here to help you track your progress and navigate your training. You can view completed courses, access new modules, and monitor your certification status. Need help with anything specific?",
        'login.html': "Welcome to the login page! Having trouble signing in? I can help guide you through the process or answer questions about account access. Our platform works on any device without complex logins.",
        'register.html': "Great to see you joining Always Trucking! I'm Agent Lee, and I'll be here to guide you through your training journey. Our registration is simple and gets you immediate access to industry-leading courses. Any questions about getting started?",
        'quiz.html': "Ready for your assessment? I'm here to help if you need clarification on any training materials before taking your quiz. Remember, our courses are self-paced, so take your time to review if needed.",
        'faq.html': "Welcome to our FAQ section! I can provide additional answers beyond what's listed here. Feel free to ask me about any aspect of our training programs, certification processes, or career opportunities.",
        'employment.html': "Exploring career opportunities? Excellent! Our graduates have a 95% job placement rate. I can tell you about our industry partnerships and what employers look for in trained professionals."
    };
    
    return greetings[page] || "Hi! I'm Agent Lee, your training assistant at Always Trucking & Loading LLC. I'm here to help with any questions about our professional driver training programs. How can I assist you today?";
}

/**
 * Position Agent Lee correctly based on device
 */
function positionAgentLee() {
    const widget = document.getElementById('agent-lee-widget');
    const isMobile = window.innerWidth <= 768;
    
    if (!widget) return;
    
    // Set default position to top right
    widget.style.top = '20px';
    widget.style.right = '20px';
    widget.style.bottom = 'auto';
    widget.style.left = 'auto';
    
    // Store original position
    agentLeeState.originalPosition = { 
        right: '20px', 
        top: '20px' 
    };
    
    // Adjust for mobile
    if (isMobile) {
        widget.style.top = '10px';
        widget.style.right = '10px';
        widget.style.bottom = 'auto';
        widget.style.left = 'auto';
        agentLeeState.originalPosition = { 
            right: '10px', 
            top: '10px' 
        };
    }
}

/**
 * Fix Agent Lee position to top right
 */
function fixAgentLeePosition() {
    const widget = document.getElementById('agent-lee-widget');
    if (!widget) return;
    
    // Ensure fixed position in top right
    widget.style.position = 'fixed';
    widget.style.zIndex = '9999';
    widget.style.top = '20px';
    widget.style.right = '20px';
    widget.style.bottom = 'auto';
    widget.style.left = 'auto';
    
    // Initialize with chat popup hidden
    const popup = document.getElementById('agent-chat-popup');
    if (popup) {
        popup.style.display = 'none';
    }
}

/**
 * Make Agent Lee responsive
 */
function makeAgentLeeResponsive() {
    const widget = document.getElementById('agent-lee-widget');
    const popup = document.getElementById('agent-chat-popup');
    const button = document.getElementById('agent-chat-button');
    const isMobile = window.innerWidth <= 768;
    
    if (!widget || !popup || !button) return;
    
    // Adjust for mobile
    if (isMobile) {
        // Make button smaller on mobile
        button.style.width = '40px';
        button.style.height = '40px';
        
        // Adjust popup size for mobile
        if (popup.style.display === 'block') {
            popup.style.width = '260px';
            popup.style.height = '320px';
            popup.style.top = '50px';
            popup.style.right = '0';
            popup.style.left = 'auto';
            popup.style.bottom = 'auto';
            
            // Adjust overall widget container
            widget.style.width = 'auto';
            widget.style.top = '10px';
            widget.style.right = '10px';
            widget.style.left = 'auto';
            widget.style.bottom = 'auto';
            
            agentLeeState.isWidthAdjusted = true;
        }
    } else {
        // Reset to desktop size if needed
        if (agentLeeState.isWidthAdjusted) {
            button.style.width = '50px';
            button.style.height = '50px';
            
            if (popup.style.display === 'block') {
                popup.style.width = '300px';
                popup.style.height = '400px';
                popup.style.top = '60px';
                popup.style.right = '0';
                popup.style.left = 'auto';
                popup.style.bottom = 'auto';
                popup.style.margin = '0';
            }
            
            widget.style.width = 'auto';
            widget.style.maxWidth = 'none';
            widget.style.top = '20px';
            widget.style.right = '20px';
            widget.style.left = 'auto';
            widget.style.bottom = 'auto';
            
            agentLeeState.isWidthAdjusted = false;
        }
    }
}

/**
 * Handle window resize events
 */
function handleWindowResize() {
    makeAgentLeeResponsive();
    
    // If minimized, ensure widget returns to the original position
    if (agentLeeState.isMinimized) {
        resetAgentLeePosition();
    }
}

/**
 * Reset Agent Lee to original position
 */
function resetAgentLeePosition() {
    const widget = document.getElementById('agent-lee-widget');
    if (!widget) return;
    
    widget.style.right = agentLeeState.originalPosition.right;
    widget.style.top = agentLeeState.originalPosition.top;
    widget.style.left = 'auto';
    widget.style.bottom = 'auto';
}

/**
 * Initialize draggable functionality for Agent Lee
 */
function initAgentLeeDraggable() {
    const widget = document.getElementById('agent-lee-widget');
    const dragHandle = document.getElementById('agent-drag-handle');
    
    if (!widget || !dragHandle) return;
    
    dragHandle.addEventListener('mousedown', startDrag);
    dragHandle.addEventListener('touchstart', startDrag, { passive: false });
    
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('touchmove', moveDrag, { passive: false });
    
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}

/**
 * Start dragging the Agent Lee widget
 * @param {Event} e - The mouse or touch event
 */
function startDrag(e) {
    e.preventDefault();
    
    const widget = document.getElementById('agent-lee-widget');
    if (!widget) return;
    
    agentLeeState.isDragging = true;
    
    // Get current widget position
    const rect = widget.getBoundingClientRect();
    
    // Calculate offset for mouse position
    if (e.type === 'mousedown') {
        agentLeeState.offsetX = e.clientX - rect.left;
        agentLeeState.offsetY = e.clientY - rect.top;
        agentLeeState.lastPosition.x = e.clientX;
        agentLeeState.lastPosition.y = e.clientY;
    } else if (e.type === 'touchstart') {
        const touch = e.touches[0];
        agentLeeState.offsetX = touch.clientX - rect.left;
        agentLeeState.offsetY = touch.clientY - rect.top;
        agentLeeState.lastPosition.x = touch.clientX;
        agentLeeState.lastPosition.y = touch.clientY;
    }
    
    // Change to absolute positioning for dragging
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    widget.style.left = rect.left + 'px';
    widget.style.top = rect.top + 'px';
    
    // Change cursor style
    dragHandle.style.cursor = 'grabbing';
}

/**
 * Move the Agent Lee widget during drag
 * @param {Event} e - The mouse or touch event
 */
function moveDrag(e) {
    if (!agentLeeState.isDragging) return;
    
    e.preventDefault();
    
    const widget = document.getElementById('agent-lee-widget');
    if (!widget) return;
    
    let clientX, clientY;
    
    if (e.type === 'mousemove') {
        clientX = e.clientX;
        clientY = e.clientY;
    } else if (e.type === 'touchmove') {
        const touch = e.touches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
    } else {
        return;
    }
    
    // Calculate new position
    let newX = clientX - agentLeeState.offsetX;
    let newY = clientY - agentLeeState.offsetY;
    
    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Get widget dimensions
    const widgetWidth = widget.offsetWidth;
    const widgetHeight = widget.offsetHeight;
    
    // Constrain to window bounds
    newX = Math.max(0, Math.min(newX, windowWidth - widgetWidth));
    newY = Math.max(0, Math.min(newY, windowHeight - widgetHeight));
    
    // Update position
    widget.style.left = newX + 'px';
    widget.style.top = newY + 'px';
    
    // Update last position
    agentLeeState.lastPosition.x = clientX;
    agentLeeState.lastPosition.y = clientY;
}

/**
 * End dragging the Agent Lee widget
 */
function endDrag() {
    if (!agentLeeState.isDragging) return;
    
    const widget = document.getElementById('agent-lee-widget');
    const dragHandle = document.getElementById('agent-drag-handle');
    
    if (!widget || !dragHandle) return;
    
    agentLeeState.isDragging = false;
    
    // Reset cursor
    dragHandle.style.cursor = 'grab';
    
    // If minimized, snap back to original position
    if (agentLeeState.isMinimized) {
        resetAgentLeePosition();
    }
}

/**
 * Toggle the Agent Lee widget visibility
 */
function toggleAgentLeeWidget() {
    const popup = document.getElementById('agent-chat-popup');
    const button = document.getElementById('agent-chat-button');
    
    if (!popup || !button) return;
    
    if (popup.style.display === 'block') {
        popup.style.display = 'none';
    } else {
        popup.style.display = 'block';
        makeAgentLeeResponsive();
    }
}

/**
 * Minimize the Agent Lee widget
 */
function minimizeAgentLee() {
    const popup = document.getElementById('agent-chat-popup');
    const widget = document.getElementById('agent-lee-widget');
    
    if (!popup || !widget) return;
    
    // Hide popup
    popup.style.display = 'none';
    
    // Set minimized state
    agentLeeState.isMinimized = true;
    
    // Return to original position
    resetAgentLeePosition();
}

/**
 * Close the Agent Lee widget completely
 */
function closeAgentLee() {
    const popup = document.getElementById('agent-chat-popup');
    
    if (!popup) return;
    
    // Hide popup
    popup.style.display = 'none';
    
    // Set minimized state
    agentLeeState.isMinimized = true;
    
    // Return to original position
    resetAgentLeePosition();
}

/**
 * Toggle resize mode for Agent Lee
 */
function resizeAgentLee() {
    const popup = document.getElementById('agent-chat-popup');
    
    if (!popup) return;
    
    // Toggle resize class
    popup.classList.toggle('resizing');
    
    // Update resize state
    agentLeeState.isResizing = popup.classList.contains('resizing');
    
    // Apply appropriate styles for resize mode
    if (agentLeeState.isResizing) {
        popup.style.resize = 'both';
        popup.style.overflow = 'auto';
    } else {
        popup.style.resize = 'none';
    }
}

/**
 * Send a message in the Agent Lee chat
 */
function sendAgentMessage() {
    const input = document.getElementById('agent-message-input');
    const messages = document.getElementById('agent-chat-messages');
    
    if (!input || !messages) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    // Add user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'agent-message agent-user';
    userMessageDiv.innerHTML = `<p>${message}</p>`;
    messages.appendChild(userMessageDiv);
    
    // Clear input
    input.value = '';
    
    // Scroll to bottom
    messages.scrollTop = messages.scrollHeight;
    
    // Simulate response after a short delay
    setTimeout(() => {
        // Generate response based on input
        let response = getAgentResponse(message);
        
        // Add agent response
        const agentMessageDiv = document.createElement('div');
        agentMessageDiv.className = 'agent-message agent-assistant';
        agentMessageDiv.innerHTML = `<p>${response}</p>`;
        messages.appendChild(agentMessageDiv);
        
        // Scroll to bottom again
        messages.scrollTop = messages.scrollHeight;
    }, 800);
}

/**
 * Handle Enter key press in the message input
 * @param {Event} e - The key event
 */
function handleEnterKey(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendAgentMessage();
    }
}

/**
 * Get a response from Agent Lee based on user input
 * @param {string} message - The user's message
 * @returns {string} - Agent Lee's response
 */
function getAgentResponse(message) {
    message = message.toLowerCase();
    
    // Simple response logic
    if (message.includes('cdl') || message.includes('license')) {
        return "Our CDL programs are FMCSA-approved with a 95% job placement rate. Would you like to know more about our CDL continuing education options?";
    } else if (message.includes('dispatch') || message.includes('dispatcher')) {
        return "Our dispatcher training covers load planning, TMS software, and regulatory compliance. Graduates typically see a 35% salary increase after completion.";
    } else if (message.includes('cost') || message.includes('price') || message.includes('how much')) {
        return "Our pricing is competitive with flexible payment options. Basic courses start at $299, with premium packages available. Would you like to see the full pricing breakdown?";
    } else if (message.includes('mobile') || message.includes('phone') || message.includes('tablet')) {
        return "Yes! Our training platform is fully mobile-responsive and works great on all devices. You can learn on the go, wherever you are.";
    } else if (message.includes('certificate') || message.includes('certification')) {
        return "After completing a course and passing the final assessment, you'll receive an industry-recognized certificate that you can download or print.";
    } else if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
        return "Hi there! I'm Agent Lee, your training assistant. How can I help with your trucking career training today?";
    } else {
        return "Thanks for your question. Our training programs are designed to help you advance your trucking career with practical, industry-recognized skills. Would you like information about a specific course or topic?";
    }
}