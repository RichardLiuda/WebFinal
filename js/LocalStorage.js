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
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
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

	// --- 用户与认证 ---
	ctx: () => {
		const session = localStorage.getItem(DB_KEYS.CURRENT_USER);
		return session ? JSON.parse(session) : null;
	},
	login: (id, password) => {
		const users = DB._get(DB_KEYS.USERS);
		const user = users.find(u => String(u.id) === String(id) && String(u.password) === String(password));
		if (user) {
			if (user.isBanned) { alert("Your account has been banned."); return false; }
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

		// 初始化默认字段
		user.tags = user.tags || [];
		user.stats = { posts: 0, following: 0, followers: 0 };
		user.role = 'user';
		user.isBanned = false;
		user.followingList = [];
		user.followersList = [];
		
		users.push(user);
		DB._set(DB_KEYS.USERS, users);
		return true;
	},
	getUser: (id) => {
		const users = DB._get(DB_KEYS.USERS);
		return users.find(u => String(u.id) === String(id)) || null;
	},
	updateUser: (id, updates) => {
		const users = DB._get(DB_KEYS.USERS);
		const idx = users.findIndex(u => String(u.id) === String(id));
		if (idx === -1) return false;
		
		// 保护关键字段
		delete updates.id;
		delete updates.password;
		delete updates.role;

		users[idx] = { ...users[idx], ...updates };
		DB._set(DB_KEYS.USERS, users);
		
		// 同步 Session
		const currentUser = DB.ctx();
		if (currentUser && String(currentUser.id) === String(id)) {
			localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(users[idx]));
		}
		return true;
	},

	// --- 动态与互动 ---
	createPost: (content, imgs = [], vis = 'public', tags = []) => {
		const user = DB.ctx();
		if (!user) return false;

		const newPost = {
			id: Date.now(),
			authorId: user.id,
			content: Utils.sanitize(content),
			images: imgs,
			tags: tags,
			visibility: vis,
			likes: [],
			comments: [],
			timestamp: new Date().toISOString()
		};
		
		const posts = DB._get(DB_KEYS.POSTS);
		posts.unshift(newPost);
		DB._set(DB_KEYS.POSTS, posts);

		// 更新统计
		const u = DB.getUser(user.id);
		if (u) DB.updateUser(user.id, { stats: { ...u.stats, posts: (u.stats.posts || 0) + 1 } });
		
		return true;
	},
	deletePost: (postId) => {
		const user = DB.ctx();
		if (!user) return false;

		let posts = DB._get(DB_KEYS.POSTS);
		const post = posts.find(p => p.id == postId);
		if (!post) return false;

		if (String(post.authorId) !== String(user.id) && user.role !== 'admin') return false;

		posts = posts.filter(p => p.id != postId);
		DB._set(DB_KEYS.POSTS, posts);

		const author = DB.getUser(post.authorId);
		if (author) DB.updateUser(author.id, { stats: { ...author.stats, posts: Math.max((author.stats.posts || 0) - 1, 0) } });

		return true;
	},
	getPost: (postId) => {
		const posts = DB._get(DB_KEYS.POSTS);
		const post = posts.find(p => p.id == postId);
		if (!post) return null;
		const author = DB.getUser(post.authorId);
		return { ...post, author };
	},
	getFeed: (filter = 'all') => { // filter: 'all', 'following', or userId
		const posts = DB._get(DB_KEYS.POSTS);
		const user = DB.ctx();

		const enrichedPosts = posts.map(p => {
			const author = DB.getUser(p.authorId);
			return { ...p, author };
		});

		if (filter === 'all') {
			return enrichedPosts;
		} else if (filter === 'following') {
			if (!user) return [];
			const realUser = DB.getUser(user.id);
			const following = realUser.followingList || [];
			return enrichedPosts.filter(p => following.includes(String(p.authorId)) || String(p.authorId) === String(user.id));
		} else {
			return enrichedPosts.filter(p => String(p.authorId) === String(filter));
		}
	},
	toggleLike: (postId) => {
		const user = DB.ctx();
		if (!user) return false;
		
		const posts = DB._get(DB_KEYS.POSTS);
		const pIdx = posts.findIndex(p => p.id == postId);
		if (pIdx === -1) return false;

		const likes = posts[pIdx].likes || [];
		const uid = String(user.id);
		
		let isLiked = false;
		if (likes.includes(uid)) {
			posts[pIdx].likes = likes.filter(id => id !== uid);
		} else {
			posts[pIdx].likes.push(uid);
			isLiked = true;
		}
		
		DB._set(DB_KEYS.POSTS, posts);

		// 发送通知
		if (isLiked && String(posts[pIdx].authorId) !== uid) {
			DB.createNotification('like', uid, postId, posts[pIdx].authorId);
		}

		return true;
	},
	comment: (postId, content) => {
		const user = DB.ctx();
		if (!user) return false;

		const posts = DB._get(DB_KEYS.POSTS);
		const pIdx = posts.findIndex(p => p.id == postId);
		if (pIdx === -1) return false;

		const newComment = {
			id: Date.now(),
			authorId: user.id,
			authorName: user.nickname,
			content: Utils.sanitize(content),
			timestamp: new Date().toISOString()
		};

		if (!posts[pIdx].comments) posts[pIdx].comments = [];
		posts[pIdx].comments.push(newComment);
		
		DB._set(DB_KEYS.POSTS, posts);

		// 发送通知
		if (String(posts[pIdx].authorId) !== String(user.id)) {
			DB.createNotification('comment', user.id, postId, posts[pIdx].authorId);
		}

		return true;
	},
	deleteComment: (postId, commentId) => {
		const user = DB.ctx();
		if (!user) return false;

		const posts = DB._get(DB_KEYS.POSTS);
		const pIdx = posts.findIndex(p => p.id == postId);
		if (pIdx === -1) return false;

		const post = posts[pIdx];
		const cIdx = post.comments.findIndex(c => c.id == commentId);
		if (cIdx === -1) return false;

		const comment = post.comments[cIdx];
		// 允许评论作者、动态作者、管理员删除
		if (String(comment.authorId) !== String(user.id) && 
			String(post.authorId) !== String(user.id) && 
			user.role !== 'admin') {
			return false;
		}

		post.comments.splice(cIdx, 1);
		DB._set(DB_KEYS.POSTS, posts);
		return true;
	},

	// --- 社交关系 ---
	toggleFollow: (targetId) => {
		const user = DB.ctx();
		if (!user) return false;
		if (String(user.id) === String(targetId)) return false;

		const users = DB._get(DB_KEYS.USERS);
		const meIdx = users.findIndex(u => String(u.id) === String(user.id));
		const targetIdx = users.findIndex(u => String(u.id) === String(targetId));

		if (meIdx === -1 || targetIdx === -1) return false;

		const me = users[meIdx];
		const target = users[targetIdx];

		if (!me.followingList) me.followingList = [];
		if (!target.followersList) target.followersList = [];

		const isFollowing = me.followingList.includes(String(targetId));
		let isFollowAction = false;

		if (isFollowing) {
			me.followingList = me.followingList.filter(id => id !== String(targetId));
			target.followersList = target.followersList.filter(id => id !== String(user.id)); // 双向维护
			me.stats.following = Math.max(0, me.stats.following - 1);
			target.stats.followers = Math.max(0, target.stats.followers - 1);
		} else {
			me.followingList.push(String(targetId));
			target.followersList.push(String(user.id)); // 双向维护
			me.stats.following++;
			target.stats.followers++;
			isFollowAction = true;
		}

		DB._set(DB_KEYS.USERS, users);

		// 发送通知
		if (isFollowAction) {
			DB.createNotification('follow', user.id, null, targetId);
		}

		return true;
	},
	isFollowing: (targetId) => {
		const user = DB.ctx();
		if (!user) return false;
		const realUser = DB.getUser(user.id);
		return (realUser.followingList || []).includes(String(targetId));
	},

	// --- 搜索功能 (From feat/D) ---
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

	// --- 通知系统 (From feat/D) ---
	createNotification: (type, sourceId, targetId, recipientId) => { // type: 'like'|'comment'|'follow'
		const notifications = DB._get(DB_KEYS.NOTIFICATIONS);
		const newNotification = {
			id: Date.now(),
			type: type, 
			sourceId: sourceId,
			targetId: targetId, // postId or null
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
		// 简单关联一下 sourceUser
		return notifications
			.filter(n => String(n.recipientId) === String(userId))
			.map(n => {
				const sourceUser = DB.getUser(n.sourceId);
				return { ...n, sourceUser };
			});
	},
	markAsRead: (notificationId) => {
		const notifications = DB._get(DB_KEYS.NOTIFICATIONS);
		const idx = notifications.findIndex(n => n.id === notificationId);
		if (idx === -1) return false;
		
		notifications[idx].isRead = true;
		DB._set(DB_KEYS.NOTIFICATIONS, notifications);
		return true;
	},
	markAllAsRead: (userId) => {
		const notifications = DB._get(DB_KEYS.NOTIFICATIONS);
		let changed = false;
		const updated = notifications.map(n => {
			if (String(n.recipientId) === String(userId) && !n.isRead) {
				changed = true;
				return { ...n, isRead: true };
			}
			return n;
		});
		
		if (changed) DB._set(DB_KEYS.NOTIFICATIONS, updated);
		return true;
	},
	getUnreadNotificationCount: (userId) => {
		const notifications = DB._get(DB_KEYS.NOTIFICATIONS);
		return notifications.filter(n => String(n.recipientId) === String(userId) && !n.isRead).length;
	}
};

// --- 初始化 ---
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
			role: 'admin',
			isBanned: false,
			stats: { posts: 0, following: 0, followers: 0 },
			followingList: [],
			followersList: [],
			tags: []
		};
		users.push(adminUser);
		DB._set(DB_KEYS.USERS, users);
		console.log("Admin account injected: 1234567890 / admin");
	}
}

initDatabase();

window.DB = DB;
window.Utils = Utils;
