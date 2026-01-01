# LocalStorage.js 开发文档

## 1. 快速上手

在所有 HTML 页面底部引入：
```html
<script src="../js/LocalStorage.js"></script>
<!-- 引入 ThemeEngine 实现动态主题 -->
<script src="../js/ThemeEngine.js"></script>
```
引入后，全局可以直接使用 `DB`、`Utils`、`ThemeEngine` 对象。

## 2. 核心数据结构

### 用户 (User)
```javascript
{
  id: "20230001",           // 学号 (PK)
  password: "...",          // 密码
  nickname: "Alice",        // 昵称
  avatar: "url...",         // 头像链接
  bio: "...",               // 简介
  bgImage: "url...",        // 主页背景
  tags: ["摄影", "代码"],    // 兴趣标签
  stats: {                  // 统计数据 (自动维护)
    following: 10,
    followers: 5,
    posts: 3
  },
  settings: {               // 设置
    themeMode: "system",    // 'light' | 'dark' | 'system'
    visibility: "public"
  },
  role: "user",             // 角色: user / admin
  isBanned: false,          // 是否封禁
  followingList: ["20230002"], // 关注的人 ID 列表
  followersList: ["20230003"]  // 粉丝 ID 列表
}
```

### 动态 (Post)
```javascript
{
  id: 1700000000000,        // 时间戳 ID
  authorId: "20230001",     // 作者 ID
  content: "今天天气不错",    // 内容
  images: ["url1", "url2"], // 图片列表
  tags: ["#日常"],           // 话题
  visibility: "public",     // public / friends / private
  likes: ["20230002"],      // 点赞用户 ID 列表
  comments: [               // 评论列表
    {
      id: 1700000001000,
      authorId: "20230002",
      authorName: "Bob",
      content: "确实！",
      timestamp: "ISOString"
    }
  ],
  timestamp: "ISOString"    // 发布时间
}
```

### 通知 (Notification)
```javascript
{
  id: 1700000005000,
  type: "like",             // 'like' | 'comment' | 'follow'
  sourceId: "20230002",     // 触发者 ID (谁点了赞)
  targetId: 1700000000000,  // 相关对象 ID (哪个帖子被赞了)，如果是关注则为 null
  recipientId: "20230001",  // 接收者 ID
  isRead: false,            // 是否已读
  timestamp: "ISOString"
}
```

---

## 3. API 接口文档

### 用户与认证

| 方法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `DB.register(user)` | 注册新用户 | `DB.register({id:'...', password:'...'})` |
| `DB.login(id, pwd)` | 登录 | `DB.login('20230001', '123456')` |
| `DB.logout()` | 登出 | `DB.logout()` |
| `DB.ctx()` | 获取当前登录用户对象 | `const me = DB.ctx()` |
| `DB.getUser(id)` | 获取任意用户信息 | `DB.getUser('20230001')` |
| `DB.updateUser(id, updates)` | 更新资料 | `DB.updateUser('20230001', {nickname:'Bob'})` |

### 动态与互动

| 方法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `DB.createPost(content, imgs, vis, tags)` | 发布动态 | `DB.createPost('Hello', [], 'public')` |
| `DB.deletePost(postId)` | 删除动态 (本人或管理员) | `DB.deletePost(170000...)` |
| `DB.getPost(postId)` | 获取单条动态详情 | `const post = DB.getPost(170000...)` |
| `DB.getFeed(filter)` | 获取时间流 | `DB.getFeed('all')` 或 `DB.getFeed('following')` |
| `DB.toggleLike(postId)` | 点赞/取消点赞 | `DB.toggleLike(170000...)` |
| `DB.comment(postId, content)` | 评论 | `DB.comment(170000..., 'Nice!')` |
| `DB.deleteComment(postId, commentId)` | 删除评论 | `DB.deleteComment(pid, cid)` |

### 社交关系 (Member D)

| 方法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `DB.toggleFollow(targetId)` | 关注/取关用户 | `DB.toggleFollow('20230002')` |
| `DB.isFollowing(targetId)` | 检查是否已关注 | `if(DB.isFollowing('...')) { ... }` |

### 搜索功能 (New)

| 方法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `DB.searchUsers(query)` | 搜索用户 (匹配ID/昵称/简介) | `DB.searchUsers('Alice')` |
| `DB.searchPosts(query)` | 搜索动态 (匹配内容/标签) | `DB.searchPosts('#日常')` |

### 通知系统 (New)

| 方法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `DB.getNotifications(userId)` | 获取某人的所有通知 | `DB.getNotifications('20230001')` |
| `DB.getUnreadNotificationCount(userId)` | 获取未读通知数 | `const count = DB.getUnread...` |
| `DB.markAsRead(notifId)` | 标记单条为已读 | `DB.markAsRead(1700...)` |
| `DB.markAllAsRead(userId)` | 标记所有为已读 | `DB.markAllAsRead('20230001')` |

### 动态主题 (ThemeEngine)

| 方法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `ThemeEngine.setTheme(mode)` | 设置主题 | `ThemeEngine.setTheme('dark')` (支持 light/dark/system) |
| `ThemeEngine.toggle()` | 切换主题 | `ThemeEngine.toggle()` (Light <-> Dark) |

### 全局工具 (Member E)

| 方法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Utils.timeAgo(isoString)` | 相对时间格式化 | `Utils.timeAgo(post.timestamp)` -> "5分钟前" |
| `Utils.sanitize(str)` | 防 XSS 过滤 | `Utils.sanitize('<script>...')` |
| `DB.on(event, handler)` | 监听数据变更 | `DB.on('db:update', render)` |

---

## 4. 开发建议

1.  **数据监听**：
    为了实现响应式更新，建议在组件加载时订阅更新事件：
    ```javascript
    // 在页面加载或组件初始化时
    const cleanup = DB.on('db:update', (e) => {
      console.log('数据更新了:', e.detail.key); // key 可能是 'm3_posts', 'm3_users', 'm3_notifications'
      render(); // 重新渲染页面
    });
    ```

2.  **调试**：
    可以直接在浏览器控制台输入 `DB.getUsers()` 或 `DB.getFeed()` 查看当前存储的数据。
