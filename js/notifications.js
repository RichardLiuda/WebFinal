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
    
    // Set up event listeners
    setupEventListeners();
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

// Initialize the page when DOM is ready
document.addEventListener('DOMContentLoaded', initNotificationsPage);