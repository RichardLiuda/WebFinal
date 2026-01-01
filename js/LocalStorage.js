const DB_KEYS = {
    USERS: 'm3_users',
    POSTS: 'm3_posts',
    CURRENT_USER: 'm3_session',
    NOTIFICATIONS: 'm3_notifications'
};

const Utils = {
    timeAgo: (isoString) => {
        const date = new Date(isoString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    },
    sanitize: (str) => {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};

const ThemeEngine = {
    apply: (hex) => {
        document.documentElement.style.setProperty('--md-sys-color-primary', hex);
        document.documentElement.style.setProperty('--md-sys-color-on-primary', '#ffffff');
        localStorage.setItem('m3_theme_color', hex);
    },
    load: () => {
        const savedColor = localStorage.getItem('m3_theme_color');
        if (savedColor) {
            ThemeEngine.apply(savedColor);
        }
    }
};

const DB = {
    _get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
    _set: (key, val) => {
        localStorage.setItem(key, JSON.stringify(val));
        window.dispatchEvent(new CustomEvent('db:update', { detail: { key } }));
    },
    on: (event, handler) => {
        window.addEventListener(event, handler);
        return () => window.removeEventListener(event, handler);
    },
    ctx: () => {
        const session = localStorage.getItem(DB_KEYS.CURRENT_USER);
        return session ? JSON.parse(session) : null;
    },
    getCurrentUser: () => {
        return DB.ctx();
    },
    login: (id, password) => {
        const users = DB._get(DB_KEYS.USERS);
        const user = users.find(u => String(u.id) === String(id) && String(u.password) === String(password));
        console.log("Login attempt - ID:", id, "Password:", password, "Found user:", !!user);
        if (user) {
            if(user.isBanned) { alert("Your account has been banned."); return false; }
            localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
            console.log("Session saved to:", DB_KEYS.CURRENT_USER, "Value:", localStorage.getItem(DB_KEYS.CURRENT_USER));
            window.dispatchEvent(new CustomEvent('db:update', { detail: { key: 'session' } }));
            return true;
        }
        return false;
    },
    logout: () => {
        localStorage.removeItem(DB_KEYS.CURRENT_USER);
        window.dispatchEvent(new CustomEvent('db:update', { detail: { key: 'session' } }));
    },
    register: (user) => {
        const users = DB._get(DB_KEYS.USERS);
        if (users.find(u => String(u.id) === String(user.id))) return false;
        users.push(user);
        DB._set(DB_KEYS.USERS, users);
        return true;
    },
    getUsers: () => {
        return DB._get(DB_KEYS.USERS);
    },
    getUserById: (id) => {
        const users = DB._get(DB_KEYS.USERS);
        return users.find(u => String(u.id) === String(id)) || null;
    },
    updateUser: (id, updates) => {
        const users = DB._get(DB_KEYS.USERS);
        const index = users.findIndex(u => String(u.id) === String(id));
        if (index === -1) return false;
        const user = users[index];
        Object.keys(updates).forEach(key => {
            if (key.startsWith('stats.') && user.stats) {
                const statKey = key.split('.')[1];
                user.stats[statKey] = updates[key];
            } else {
                user[key] = updates[key];
            }
        });
        users[index] = user;
        DB._set(DB_KEYS.USERS, users);
        const currentUser = DB.ctx();
        if (currentUser && String(currentUser.id) === String(id)) {
            localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
        }
        return true;
    },
    createPost: (content, images = [], visibility = 'public', tags = []) => {
        const currentUser = DB.ctx();
        if (!currentUser) return null;
        const posts = DB._get(DB_KEYS.POSTS);
        const newPost = {
            id: Date.now(),
            authorId: currentUser.id,
            content: Utils.sanitize(content),
            images: images,
            tags: tags,
            visibility: visibility,
            likes: [],
            comments: [],
            timestamp: new Date().toISOString()
        };
        posts.unshift(newPost);
        DB._set(DB_KEYS.POSTS, posts);
        DB.updateUser(currentUser.id, {
            'stats.posts': (currentUser.stats?.posts || 0) + 1
        });
        return newPost;
    },
    getPosts: () => {
        return DB._get(DB_KEYS.POSTS);
    },
    getPostById: (postId) => {
        const posts = DB._get(DB_KEYS.POSTS);
        return posts.find(p => p.id === postId) || null;
    },
    deletePost: (postId) => {
        const currentUser = DB.ctx();
        if (!currentUser) return false;
        const posts = DB._get(DB_KEYS.POSTS);
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return false;
        const post = posts[postIndex];
        if (String(post.authorId) !== String(currentUser.id) && currentUser.role !== 'admin') {
            return false;
        }
        posts.splice(postIndex, 1);
        DB._set(DB_KEYS.POSTS, posts);
        if (String(post.authorId) === String(currentUser.id)) {
            const user = DB.getUserById(currentUser.id);
            DB.updateUser(currentUser.id, {
                'stats.posts': Math.max(0, (user.stats?.posts || 1) - 1)
            });
        }
        return true;
    },
    updatePost: (updatedPost) => {
        const currentUser = DB.ctx();
        if (!currentUser) return false;
        const posts = DB._get(DB_KEYS.POSTS);
        const postIndex = posts.findIndex(p => p.id === updatedPost.id);
        if (postIndex === -1) return false;
        const post = posts[postIndex];
        if (String(post.authorId) !== String(currentUser.id)) return false;
        // 更新帖子数据
        posts[postIndex] = {
            ...post,
            content: updatedPost.content,
            images: updatedPost.images,
            tags: updatedPost.tags
        };
        DB._set(DB_KEYS.POSTS, posts);
        return true;
    },
    toggleLike: (postId) => {
        const currentUser = DB.ctx();
        if (!currentUser) return false;
        const posts = DB._get(DB_KEYS.POSTS);
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return false;
        const post = posts[postIndex];
        const likeIndex = post.likes.findIndex(id => String(id) === String(currentUser.id));
        if (likeIndex === -1) {
            post.likes.push(currentUser.id);
            
            // 创建点赞通知
            if (String(post.authorId) !== String(currentUser.id)) {
                DB.createNotification('like', postId, currentUser.id, post.authorId);
            }
        } else {
            post.likes.splice(likeIndex, 1);
        }
        DB._set(DB_KEYS.POSTS, posts);
        return likeIndex === -1;
    },
    comment: (postId, content) => {
        const currentUser = DB.ctx();
        if (!currentUser) return null;
        const posts = DB._get(DB_KEYS.POSTS);
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return null;
        const post = posts[postIndex];
        const newComment = {
            id: Date.now(),
            authorId: currentUser.id,
            content: Utils.sanitize(content),
            timestamp: new Date().toISOString()
        };
        posts[postIndex].comments.push(newComment);
        DB._set(DB_KEYS.POSTS, posts);
        
        // 创建评论通知
        if (String(post.authorId) !== String(currentUser.id)) {
            DB.createNotification('comment', postId, newComment.id, post.authorId);
        }
        
        return newComment;
    },
    getFeed: (filter = 'all', params = {}) => {
        const currentUser = DB.ctx();
        const posts = DB._get(DB_KEYS.POSTS);
        
        // 先根据 filter 筛选帖子
        let filteredPosts;
        if (filter === 'all') {
            filteredPosts = posts.filter(p => p.visibility === 'public');
        } else if (filter === 'following') {
            if (!currentUser) return [];
            const following = currentUser.following || [];
            filteredPosts = posts.filter(p => 
                (p.visibility === 'public' || p.visibility === 'friends') &&
                (following.includes(p.authorId) || String(p.authorId) === String(currentUser.id))
            );
        } else if (filter === 'mine') {
            if (!currentUser) return [];
            filteredPosts = posts.filter(p => String(p.authorId) === String(currentUser.id));
        } else {
            filteredPosts = posts;
        }
        
        // 如果有 tags 参数，进一步筛选包含所有标签的帖子
        if (params.tags && Array.isArray(params.tags) && params.tags.length > 0) {
            filteredPosts = filteredPosts.filter(post => {
                const postTags = post.tags || [];
                // 检查帖子是否包含所有指定标签
                return params.tags.every(tag => postTags.includes(tag));
            });
        }
        
        return filteredPosts;
    },
    getUserPosts: (userId) => {
        const posts = DB._get(DB_KEYS.POSTS);
        return posts.filter(p => String(p.authorId) === String(userId));
    },
    toggleFollow: (targetId) => {
        const currentUser = DB.ctx();
        if (!currentUser) return false;
        if (String(currentUser.id) === String(targetId)) return false;
        const users = DB._get(DB_KEYS.USERS);
        const currentUserIndex = users.findIndex(u => String(u.id) === String(currentUser.id));
        const targetUserIndex = users.findIndex(u => String(u.id) === String(targetId));
        if (currentUserIndex === -1 || targetUserIndex === -1) return false;
        const currentUserData = users[currentUserIndex];
        const targetUserData = users[targetUserIndex];
        if (!currentUserData.following) currentUserData.following = [];
        if (!targetUserData.followers) targetUserData.followers = [];
        const followIndex = currentUserData.following.findIndex(id => String(id) === String(targetId));
        if (followIndex === -1) {
            currentUserData.following.push(targetId);
            targetUserData.followers.push(currentUser.id);
            
            // 创建关注通知
            DB.createNotification('follow', targetId, currentUser.id, targetId);
        } else {
            currentUserData.following.splice(followIndex, 1);
            const followerIndex = targetUserData.followers.findIndex(id => String(id) === String(currentUser.id));
            if (followerIndex !== -1) {
                targetUserData.followers.splice(followerIndex, 1);
            }
        }
        currentUserData.stats.following = currentUserData.following.length;
        targetUserData.stats.followers = targetUserData.followers.length;
        localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(currentUserData));
        DB._set(DB_KEYS.USERS, users);
        return followIndex === -1;
    },
    isFollowing: (targetId) => {
        const currentUser = DB.ctx();
        if (!currentUser) return false;
        return currentUser.following ? currentUser.following.some(id => String(id) === String(targetId)) : false;
    },
    banUser: (userId) => {
        const currentUser = DB.ctx();
        if (!currentUser || currentUser.role !== 'admin') return false;
        return DB.updateUser(userId, { isBanned: true });
    },
    unbanUser: (userId) => {
        const currentUser = DB.ctx();
        if (!currentUser || currentUser.role !== 'admin') return false;
        return DB.updateUser(userId, { isBanned: false });
    },
    deleteComment: (postId, commentId) => {
        const currentUser = DB.ctx();
        if (!currentUser) return false;
        const posts = DB._get(DB_KEYS.POSTS);
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return false;
        const post = posts[postIndex];
        const commentIndex = post.comments.findIndex(c => c.id === commentId);
        if (commentIndex === -1) return false;
        const comment = post.comments[commentIndex];
        if (String(comment.authorId) !== String(currentUser.id) && currentUser.role !== 'admin') {
            return false;
        }
        post.comments.splice(commentIndex, 1);
        DB._set(DB_KEYS.POSTS, posts);
        return true;
    },
    searchUsers: (query) => {
        const users = DB._get(DB_KEYS.USERS);
        const lowerQuery = query.toLowerCase();
        return users.filter(u => 
            String(u.id).includes(lowerQuery) ||
            (u.nickname && u.nickname.toLowerCase().includes(lowerQuery)) ||
            (u.bio && u.bio.toLowerCase().includes(lowerQuery))
        );
    },
    searchPosts: (query) => {
        const posts = DB._get(DB_KEYS.POSTS);
        const lowerQuery = query.toLowerCase();
        return posts.filter(p => 
            (p.content && p.content.toLowerCase().includes(lowerQuery)) ||
            (p.tags && p.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
        );
    },
    // Notification Management
    createNotification: (type, sourceId, targetId, recipientId) => {
        const currentUser = DB.ctx();
        if (!currentUser) return null;
        
        const notifications = DB._get(DB_KEYS.NOTIFICATIONS);
        const newNotification = {
            id: Date.now(),
            type: type, // 'like', 'comment', 'follow'
            sourceId: sourceId,
            targetId: targetId,
            recipientId: recipientId,
            isRead: false,
            timestamp: new Date().toISOString()
        };
        
        notifications.unshift(newNotification);
        DB._set(DB_KEYS.NOTIFICATIONS, notifications);
        return newNotification;
    },
    getNotifications: (userId) => {
        const notifications = DB._get(DB_KEYS.NOTIFICATIONS);
        return notifications.filter(n => String(n.recipientId) === String(userId));
    },
    markAsRead: (notificationId) => {
        const notifications = DB._get(DB_KEYS.NOTIFICATIONS);
        const notificationIndex = notifications.findIndex(n => n.id === notificationId);
        if (notificationIndex === -1) return false;
        
        notifications[notificationIndex].isRead = true;
        DB._set(DB_KEYS.NOTIFICATIONS, notifications);
        return true;
    },
    markAllAsRead: (userId) => {
        const notifications = DB._get(DB_KEYS.NOTIFICATIONS);
        const updatedNotifications = notifications.map(n => {
            if (String(n.recipientId) === String(userId)) {
                return { ...n, isRead: true };
            }
            return n;
        });
        
        DB._set(DB_KEYS.NOTIFICATIONS, updatedNotifications);
        return true;
    },
    deleteNotification: (notificationId) => {
        const notifications = DB._get(DB_KEYS.NOTIFICATIONS);
        const updatedNotifications = notifications.filter(n => n.id !== notificationId);
        
        if (updatedNotifications.length === notifications.length) return false;
        
        DB._set(DB_KEYS.NOTIFICATIONS, updatedNotifications);
        return true;
    },
    getUnreadNotificationCount: (userId) => {
        const notifications = DB._get(DB_KEYS.NOTIFICATIONS);
        return notifications.filter(n => 
            String(n.recipientId) === String(userId) && !n.isRead
        ).length;
    }
};

// --- 核心：管理员账号强制注入逻辑 ---
function initDatabase() {
    let users = DB._get(DB_KEYS.USERS);
    const adminId = '1234567890';
    
    if (!users.find(u => String(u.id) === adminId)) {
        const adminUser = {
            id: adminId,
            password: 'admin',
            nickname: 'System Admin',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
            bio: 'Global Administrator',
            bgImage: '',
            tags: [],
            stats: {
                following: 0,
                followers: 0,
                posts: 0
            },
            settings: {
                themeColor: '#6750a4',
                visibility: 'public'
            },
            role: 'admin',
            isBanned: false,
            following: [],
            followers: []
        };
        users.push(adminUser);
        DB._set(DB_KEYS.USERS, users);
        console.log("Admin account injected: 1234567890 / admin");
    }
}

initDatabase();

window.DB = DB;
window.Utils = Utils;
window.ThemeEngine = ThemeEngine;
ThemeEngine.load();