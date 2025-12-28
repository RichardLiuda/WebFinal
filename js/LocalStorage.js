
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
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return date.toLocaleDateString();
  },
  
  sanitize: (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

const DB = {
  // Data access helpers
  _get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  _set: (key, val) => {
    localStorage.setItem(key, JSON.stringify(val));
    window.dispatchEvent(new CustomEvent('db:update', { detail: { key } }));
  },

  // Events
  on: (event, handler) => {
    window.addEventListener(event, handler);
    return () => window.removeEventListener(event, handler);
  },

  // User Session
  ctx: () => {
    const session = localStorage.getItem(DB_KEYS.CURRENT_USER);
    return session ? JSON.parse(session) : null;
  },
  
  login: (id, password) => {
    const users = DB._get(DB_KEYS.USERS);
    const user = users.find(u => u.id === id && u.password === password);
    if (user) {
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
    if (users.find(u => u.id === user.id)) return false;
    users.push(user);
    DB._set(DB_KEYS.USERS, users);
    return true;
  },

  getUser: (id) => {
    const users = DB._get(DB_KEYS.USERS);
    return users.find(u => u.id === id) || null;
  },

  // Posts
  getFeed: (filter = 'all') => {
    const posts = DB._get(DB_KEYS.POSTS);
    // Sort by timestamp desc
    posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filter === 'following') {
        const currentUser = DB.ctx();
        if (!currentUser) return [];
        // Assuming user.stats.following is a number, but we need the actual list of following IDs.
        // The doc says `stats: { following: 10 }` but implies we need a list.
        // Let's assume there is a `following` array in user object or we fetch it from somewhere.
        // For simplicity, let's assume the user object has a `following` array of IDs.
        // If not, we fall back to all or empty. 
        // Docs don't explicitly define where `following` list is stored. 
        // Let's check LocalStorage.md again... "Member D... DB.toggleFollow...".
        // It doesn't strictly say where the list is. I'll assume it's on the user object for now.
        const following = currentUser.following || []; 
        return posts.filter(p => following.includes(p.authorId) || p.authorId === currentUser.id);
    }
    return posts;
  },

  createPost: (content, images = [], visibility = 'public', tags = []) => {
    const user = DB.ctx();
    if (!user) return false;

    const newPost = {
      id: Date.now(),
      authorId: user.id,
      content,
      images,
      tags,
      visibility,
      likes: [],
      comments: [],
      timestamp: new Date().toISOString()
    };

    const posts = DB._get(DB_KEYS.POSTS);
    posts.push(newPost);
    DB._set(DB_KEYS.POSTS, posts);
    
    // Update user stats
    const users = DB._get(DB_KEYS.USERS);
    const uIndex = users.findIndex(u => u.id === user.id);
    if (uIndex >= 0) {
        users[uIndex].stats = users[uIndex].stats || { posts: 0, following: 0, followers: 0 };
        users[uIndex].stats.posts++;
        DB._set(DB_KEYS.USERS, users);
        // Update session as well
        localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(users[uIndex]));
    }
    return true;
  },

  deletePost: (postId) => {
    let posts = DB._get(DB_KEYS.POSTS);
    posts = posts.filter(p => p.id !== postId);
    DB._set(DB_KEYS.POSTS, posts);
  },

  toggleLike: (postId) => {
    const user = DB.ctx();
    if (!user) return false;
    
    const posts = DB._get(DB_KEYS.POSTS);
    const post = posts.find(p => p.id === postId);
    if (!post) return false;

    const idx = post.likes.indexOf(user.id);
    if (idx === -1) {
      post.likes.push(user.id);
    } else {
      post.likes.splice(idx, 1);
    }
    DB._set(DB_KEYS.POSTS, posts);
    return true;
  },

  comment: (postId, content) => {
    const user = DB.ctx();
    if (!user) return false;

    const posts = DB._get(DB_KEYS.POSTS);
    const post = posts.find(p => p.id === postId);
    if (!post) return false;

    post.comments.push({
      id: Date.now(),
      authorId: user.id,
      content,
      timestamp: new Date().toISOString()
    });
    DB._set(DB_KEYS.POSTS, posts);
    return true;
  },

  // Member D Stubs (for completeness if needed by others)
  toggleFollow: (targetId) => {
      // implementation omitted as it is Member D's task
  },
  isFollowing: (targetId) => {
      // implementation omitted
      return false;
  }
};

// Initialize with some dummy data if empty
if (!localStorage.getItem(DB_KEYS.USERS)) {
    const dummyUser = {
        id: '20230001',
        password: 'password',
        nickname: 'Admin User',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        bio: 'Hello World',
        following: [],
        stats: { posts: 0, following: 0, followers: 0 }
    };
    DB.register(dummyUser);
    // Auto login for testing
    // DB.login('20230001', 'password'); 
}

window.DB = DB;
window.Utils = Utils;
