// Notifications Page Script

// DOM Elements
const notificationsTabs = document.getElementById('notifications-tabs');
const markAllReadBtn = document.getElementById('mark-all-read-btn');

// Current User
let currentUser = null;

// Initialize the page
async function initNotificationsPage() {
    // Check if user is logged in
    currentUser = window.DB.getCurrentUser();
    if (!currentUser) {
        // Redirect to login page if not logged in
        window.location.href = 'auth.html';
        return;
    }
    
    // Update UI with user information
    updateUI();
    
    // Load notifications for all tabs
    loadNotifications('like');
    loadNotifications('comment');
    loadNotifications('follow');
    
    // Add mock message notifications
    addMockMessageNotifications();
    
    // Load messages list
    loadMessagesList();
    
    // Set up event listeners
    setupEventListeners();
    setupMessagesEventListeners();
}

// Update UI with user information
function updateUI() {
    const user = currentUser;
    const avatarContainer = document.getElementById('user-avatar-container');
    const accountMenu = document.getElementById('account-menu');
    const menuAdmin = document.getElementById('menu-admin');
    
    // Display Avatar and attach Menu Trigger
    avatarContainer.innerHTML = `
        <img id="avatar-trigger" src="${user.avatar}" alt="User Profile">
    `;
    
    // 判断角色是否为管理员
    if (user.role === "admin") {
        menuAdmin.style.display = "flex"; // 显示管理选项
    } else {
        menuAdmin.style.display = "none";
    }
    
    document
        .getElementById("avatar-trigger")
        .addEventListener("click", () => {
            accountMenu.open = !accountMenu.open;
        });
    
    // Add menu item event listeners
    document.getElementById('menu-profile').addEventListener('click', () => {
        window.location.href = 'profile.html';
    });
    
    document.getElementById('menu-logout').addEventListener('click', () => {
        window.DB.logout();
        location.reload();
    });
    
    document.getElementById('menu-admin').addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
}

// Load notifications from database by type
function loadNotifications(type) {
    let notifications = window.DB.getNotifications(currentUser.id);
    
    // Filter notifications by type
    notifications = notifications.filter(notification => notification.type === type);
    
    // Get the appropriate DOM elements for this type
    const notificationsList = document.getElementById(`notifications-list-${type}`);
    const notificationsEmpty = document.getElementById(`notifications-empty-${type}`);
    
    // Clear current notifications
    notificationsList.innerHTML = '';
    
    // Show empty state if no notifications
    if (notifications.length === 0) {
        notificationsEmpty.hidden = false;
        notificationsList.hidden = true;
        return;
    }
    
    // Hide empty state and show notifications list
    notificationsEmpty.hidden = true;
    notificationsList.hidden = false;
    
    // Render each notification
    notifications.forEach(notification => {
        const notificationElement = createNotificationElement(notification);
        notificationsList.appendChild(notificationElement);
    });
}

// Create notification element
function createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification-item ${notification.isRead ? '' : 'unread'}`;
    element.dataset.id = notification.id;
    
    // Get appropriate icon based on notification type
    let icon;
    switch (notification.type) {
        case 'like':
            icon = 'favorite';
            break;
        case 'comment':
            icon = 'comment';
            break;
        case 'follow':
            icon = 'person_add';
            break;
        default:
            icon = 'notifications';
    }
    
    // Get notification message
    const message = getNotificationMessage(notification);
    
    // Get relative time
    const timeAgo = window.Utils.timeAgo(notification.timestamp);
    
    // Build the notification HTML
    element.innerHTML = `
        <div class="notification-icon">
            <md-icon>${icon}</md-icon>
        </div>
        <div class="notification-content">
            <div class="md-typescale-body-medium">${message}</div>
            <div class="notification-time">${timeAgo}</div>
        </div>
        ${!notification.isRead ? `
        <div class="notification-actions">
            <md-text-button class="mark-read-btn" data-id="${notification.id}">
                Mark as Read
            </md-text-button>
        </div>
        ` : ''}
    `;
    
    // Add event listeners
    if (!notification.isRead) {
        const markReadBtn = element.querySelector('.mark-read-btn');
        markReadBtn.addEventListener('click', () => {
            markNotificationAsRead(notification.id);
        });
    }
    
    // Add click event for like and comment notifications to show post details
    if (notification.type === 'like' || notification.type === 'comment') {
        element.addEventListener('click', (e) => {
            // Prevent default if clicked on a button
            if (!e.target.closest('button')) {
                // Mark as read if not already read
                if (!notification.isRead) {
                    markNotificationAsRead(notification.id);
                }
                
                // Show post details (sourceId is the post ID)
                if (notification.sourceId && typeof PostEditor !== 'undefined') {
                    PostEditor.openDetail(notification.sourceId);
                }
            }
        });
    }
    
    // Add click event for follow notifications to go to user profile
    if (notification.type === 'follow') {
        element.addEventListener('click', (e) => {
            // Prevent default if clicked on a button
            if (!e.target.closest('button')) {
                // Mark as read if not already read
                if (!notification.isRead) {
                    markNotificationAsRead(notification.id);
                }
                
                // Go to user profile (targetId is the user ID)
                if (notification.targetId) {
                    window.location.href = `profile.html?id=${notification.targetId}`;
                }
            }
        });
    }
    
    return element;
}

// Get notification message based on type
function getNotificationMessage(notification) {
    let message = '';
    
    switch (notification.type) {
        case 'like':
            const likeUser = window.DB.getUserById(notification.targetId);
            message = `${likeUser ? likeUser.nickname || likeUser.id : 'A user'} liked your post.`;
            break;
        case 'comment':
            const commentUser = window.DB.getUserById(window.DB.getPostById(notification.sourceId)?.comments.find(c => c.id === notification.targetId)?.authorId);
            message = `${commentUser ? commentUser.nickname || commentUser.id : 'A user'} commented on your post.`;
            break;
        case 'follow':
            const followUser = window.DB.getUserById(notification.targetId);
            message = `${followUser ? followUser.nickname || followUser.id : 'A user'} started following you.`;
            break;
        default:
            message = 'You have a new notification.';
    }
    
    return message;
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    const success = window.DB.markAsRead(notificationId);
    if (success) {
        // Update UI in all relevant lists
        const notificationElements = document.querySelectorAll(`[data-id="${notificationId}"]`);
        notificationElements.forEach(element => {
            element.classList.remove('unread');
            const actionsDiv = element.querySelector('.notification-actions');
            if (actionsDiv) {
                actionsDiv.remove();
            }
        });
    }
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    const success = window.DB.markAllAsRead(currentUser.id);
    if (success) {
        // Update UI in all lists
        const unreadNotifications = document.querySelectorAll('.notification-item.unread');
        unreadNotifications.forEach(element => {
            element.classList.remove('unread');
            const actionsDiv = element.querySelector('.notification-actions');
            if (actionsDiv) {
                actionsDiv.remove();
            }
        });
    }
}

// Set up event listeners
function setupEventListeners() {
    // Mark all as read button
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
    }
    
    // Notifications tabs
    if (notificationsTabs) {
        const tabs = notificationsTabs.querySelectorAll('md-primary-tab');
        const panels = document.querySelectorAll('.feed-panels > div');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update tab active state
                tabs.forEach(t => t.removeAttribute('active'));
                tab.setAttribute('active', '');
                
                // Get the tab type
                const tabType = tab.getAttribute('data-type');
                
                // Show corresponding panel
                panels.forEach(panel => {
                    const panelId = panel.id;
                    if (panelId.includes(`-${tabType}-`)) {
                        panel.hidden = false;
                    } else {
                        panel.hidden = true;
                    }
                });
            });
        });
    }
    
    // Bottom navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const route = item.getAttribute('data-route');
            handleNavigation(route);
        });
    });
}

// Handle navigation
function handleNavigation(route) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('is-active');
    });
    
    // Add active class to clicked nav item
    document.querySelector(`[data-route="${route}"]`).classList.add('is-active');
    
    // Navigate to the appropriate page
    switch (route) {
        case 'home':
            window.location.href = 'index.html';
            break;
        case 'explore':
            window.location.href = 'explore.html';
            break;
        case 'notification':
            // Already on notifications page
            break;
        case 'profile':
            window.location.href = `profile.html?id=${currentUser.id}`;
            break;
        default:
            window.location.href = 'index.html';
    }
}

// Add mock message notifications
function addMockMessageNotifications() {
    // Check if mock messages already exist
    const existingNotifications = window.DB.getNotifications(currentUser.id);
    const hasMockMessages = existingNotifications.some(notification => notification.type === 'message' && notification.isMock);
    
    if (hasMockMessages) return;
    
    // Get all users excluding current user
    const users = window.DB.getUsers();
    const mockUsers = users.filter(user => user.id !== currentUser.id); // Get all users excluding current user
    
    // Mock message templates - add more templates to support more users
    const mockMessages = [
        "Hi there! How are you doing today?",
        "Did you see the new post about campus events?",
        "Hey, are you free to study together later?",
        "Have you checked out the new library resources?",
        "What do you think about the upcoming exam?",
        "I heard there's a party this weekend!",
        "Have you finished the assignment yet?",
        "Did you watch the game last night?",
        "I found a great new café downtown.",
        "What classes are you taking next semester?"
    ];
    
    // Create mock message notifications
    mockUsers.forEach((user, index) => {
        const notification = {
            id: Date.now() + index,
            type: 'message',
            targetId: user.id,
            recipientId: currentUser.id,
            message: mockMessages[index % mockMessages.length],
            timestamp: Date.now() - (index + 1) * 3600000, // Different timestamps for realism
            isRead: false,
            isMock: true
        };
        
        // Add to database
        const notifications = window.DB._get('m3_notifications') || [];
        notifications.unshift(notification);
        window.DB._set('m3_notifications', notifications);
    });
}

// Load messages list
function loadMessagesList() {
    const messagesList = document.getElementById('messages-list');
    const systemItem = messagesList.querySelector('.system-item');
    
    // Remove existing user message items
    const existingUserItems = messagesList.querySelectorAll('.message-item:not(.system-item)');
    existingUserItems.forEach(item => item.remove());
    
    // Get all message notifications, excluding messages from current user
    const messageNotifications = window.DB.getNotifications(currentUser.id)
        .filter(notification => notification.type === 'message' && notification.targetId !== currentUser.id);
    
    // Group notifications by user
    const userMessages = {};
    messageNotifications.forEach(notification => {
        if (!userMessages[notification.targetId]) {
            userMessages[notification.targetId] = [];
        }
        userMessages[notification.targetId].push(notification);
    });
    
    // Sort users by latest message time
    const sortedUsers = Object.keys(userMessages).sort((a, b) => {
        const timeA = Math.max(...userMessages[a].map(n => n.timestamp));
        const timeB = Math.max(...userMessages[b].map(n => n.timestamp));
        return timeB - timeA;
    });
    
    // Create message items for each user
    sortedUsers.forEach(userId => {
        const user = window.DB.getUserById(userId);
        if (!user) return;
        
        const notifications = userMessages[userId];
        const latestNotification = notifications.reduce((latest, current) => {
            return current.timestamp > latest.timestamp ? current : latest;
        });
        
        const messageItem = document.createElement('div');
        messageItem.className = 'message-item user-item';
        messageItem.dataset.type = 'user';
        messageItem.dataset.userId = userId;
        
        messageItem.innerHTML = `
            <div class="message-avatar">
                <img src="${user.avatar || '../assets/default-avatar.png'}" alt="${user.nickname}">
            </div>
            <div class="message-content">
                <div class="message-name">${user.nickname || user.id}</div>
                <div class="message-preview">${latestNotification.message}</div>
            </div>
        `;
        
        messagesList.appendChild(messageItem);
    });
}

// Setup event listeners for messages
function setupMessagesEventListeners() {
    const messagesList = document.getElementById('messages-list');
    const notificationsView = document.getElementById('notifications-view');
    const chatView = document.getElementById('chat-view');
    const sendMessageBtn = document.getElementById('send-message-btn');
    const chatMessageInput = document.getElementById('chat-message-input');
    
    // Handle message item clicks
    messagesList.addEventListener('click', (e) => {
        const messageItem = e.target.closest('.message-item');
        if (!messageItem) return;
        
        // Remove active class from all items
        messagesList.querySelectorAll('.message-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        messageItem.classList.add('active');
        
        const type = messageItem.dataset.type;
        
        if (type === 'system') {
            // Show notifications view
            notificationsView.style.display = 'flex';
            chatView.style.display = 'none';
        } else if (type === 'user') {
            // Show chat view
            notificationsView.style.display = 'none';
            chatView.style.display = 'flex';
            
            // Load chat for selected user
            const userId = messageItem.dataset.userId;
            loadChat(userId);
        }
    });
    
    // Handle send message button click
    sendMessageBtn.addEventListener('click', () => {
        sendChatMessage();
    });
    
    // Handle enter key in chat input
    chatMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

// Load chat for a specific user
function loadChat(userId) {
    const chatAvatar = document.getElementById('chat-avatar');
    const chatUsername = document.getElementById('chat-username');
    const chatMessages = document.getElementById('chat-messages');
    
    // Get user information
    const user = window.DB.getUserById(userId);
    if (!user) return;
    
    // Update chat header
    chatAvatar.innerHTML = `<img src="${user.avatar || '../assets/default-avatar.png'}" alt="${user.nickname}">`;
    chatUsername.textContent = user.nickname || user.id;
    
    // Clear existing messages
    chatMessages.innerHTML = '';
    
    // Add mock messages
    const mockMessages = [
        { text: "Hi! How are you?", senderId: userId, timestamp: Date.now() - 3600000 },
        { text: "I'm good, thanks! How about you?", senderId: currentUser.id, timestamp: Date.now() - 3500000 },
        { text: "I'm doing well too. Did you finish the assignment?", senderId: userId, timestamp: Date.now() - 3400000 },
        { text: "Almost done. Just need to review it one more time.", senderId: currentUser.id, timestamp: Date.now() - 3300000 },
        { text: "Great! Let me know if you need any help.", senderId: userId, timestamp: Date.now() - 3200000 }
    ];
    
    // Sort messages by timestamp
    mockMessages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Render messages
    mockMessages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${message.senderId === currentUser.id ? 'own' : 'other'}`;
        messageElement.textContent = message.text;
        chatMessages.appendChild(messageElement);
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send a chat message
function sendChatMessage() {
    const chatMessageInput = document.getElementById('chat-message-input');
    const chatMessages = document.getElementById('chat-messages');
    const messageText = chatMessageInput.value.trim();
    
    if (!messageText) return;
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message own';
    messageElement.textContent = messageText;
    
    // Add to chat messages
    chatMessages.appendChild(messageElement);
    
    // Clear input
    chatMessageInput.value = '';
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Simulate response after a delay
    setTimeout(() => {
        const responses = [
            "That's interesting!",
            "I see what you mean.",
            "Thanks for sharing.",
            "Let me think about that.",
            "Sounds good to me!"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const responseElement = document.createElement('div');
        responseElement.className = 'chat-message other';
        responseElement.textContent = randomResponse;
        
        chatMessages.appendChild(responseElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
}

// Initialize the page when DOM is ready
document.addEventListener('DOMContentLoaded', initNotificationsPage);