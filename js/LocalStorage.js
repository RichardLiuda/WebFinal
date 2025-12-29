const DB_KEYS = {
    USERS: 'm3_users',
    POSTS: 'm3_posts',
    CURRENT_USER: 'm3_session'
};

const Utils = {
    timeAgo: (isoString) => {
        const date = new Date(isoString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        const minutes = Math.floor(seconds / 60);
        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        return date.toLocaleDateString();
    },
    sanitize: (str) => {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    login: (id, password) => {
        const users = DB._get(DB_KEYS.USERS);
        // 强制转为字符串比较，防止类型错误
        const user = users.find(u => String(u.id) === String(id) && String(u.password) === String(password));
        if (user) {
            if(user.isBanned) { alert("Your account has been banned."); return false; }
            localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
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
    }
};

// --- 核心：管理员账号强制注入逻辑 ---
function initDatabase() {
    let users = DB._get(DB_KEYS.USERS);
    const adminId = '1234567890';
    
    // 检查管理员是否存在，不存在则添加
    if (!users.find(u => String(u.id) === adminId)) {
        const adminUser = {
            id: adminId,
            password: 'admin',
            nickname: 'System Admin',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
            bio: 'Global Administrator',
            role: 'admin',
            isBanned: false,
            stats: { posts: 0, following: 0, followers: 0 }
        };
        users.push(adminUser);
        DB._set(DB_KEYS.USERS, users);
        console.log("Admin account injected: 1234567890 / admin");
    }
}

initDatabase();

window.DB = DB;
window.Utils = Utils;