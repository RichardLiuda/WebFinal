/**
 * AdminPanel Logic - Member B
 * Handles user management: Banning, Unbanning, and Data Reset.
 */

const AdminPanel = {
    // 1. 初始化：检查权限并加载列表
    init: () => {
        const currentUser = window.DB.ctx();
        
        // 安全守卫：如果不是管理员，强行踢回首页
        if (!currentUser || currentUser.role !== 'admin') {
            console.error("Access Denied: Admin privileges required.");
            window.location.href = 'index.html';
            return;
        }

        AdminPanel.renderUserList();
    },

    // 2. 渲染用户列表
    renderUserList: () => {
        const userListContainer = document.getElementById('user-list');
        if (!userListContainer) return;

        // 从 LocalStorage 获取所有用户 (假设 Member E 的 DB 对象提供了 getUsers)
        // 如果没有 DB.getUsers，我们直接读 LocalStorage
        const users = JSON.parse(localStorage.getItem('m3_users') || '[]');

        if (users.length === 0) {
            userListContainer.innerHTML = `<div class="empty-state">No users registered yet.</div>`;
            return;
        }

        userListContainer.innerHTML = users.map(user => `
            <md-list-item>
                <img slot="start" src="${user.avatar}" style="width:40px; height:40px; border-radius:50%;">
                <div slot="headline">${window.Utils.sanitize(user.nickname)}</div>
                <div slot="supporting-text">ID: ${user.id} | Role: ${user.role}</div>
                <div slot="trailing-supporting-text">
                    ${user.isBanned ? '<span style="color:var(--md-sys-color-error)">BANNED</span>' : 'Active'}
                </div>
                
                <!-- 操作按钮区域 -->
                <div slot="end" style="display:flex; gap:8px; margin-left: 16px;">
                    <md-outlined-button onclick="AdminPanel.toggleBan('${user.id}')">
                        ${user.isBanned ? 'Unban' : 'Ban'}
                    </md-outlined-button>
                    
                    <md-filled-tonal-button onclick="AdminPanel.resetUser('${user.id}')">
                        Reset
                    </md-filled-tonal-button>
                </div>
            </md-list-item>
            <md-divider></md-divider>
        `).join('');
    },

    // 3. 封禁/解封逻辑
    toggleBan: (userId) => {
        let users = JSON.parse(localStorage.getItem('m3_users') || '[]');
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) return;
        
        // 禁止管理员封禁自己
        if (userId === window.DB.ctx().id) {
            alert("You cannot ban yourself!");
            return;
        }

        users[userIndex].isBanned = !users[userIndex].isBanned;
        
        // 保存回 LocalStorage
        localStorage.setItem('m3_users', JSON.stringify(users));
        
        // 刷新列表
        AdminPanel.renderUserList();
        console.log(`User ${userId} ban status toggled.`);
    },

    // 4. 重置资料逻辑 (重置违规昵称和简介)
    resetUser: (userId) => {
        if (!confirm(`Are you sure you want to reset the profile of ${userId}?`)) return;

        let users = JSON.parse(localStorage.getItem('m3_users') || '[]');
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex !== -1) {
            users[userIndex].nickname = "Student_" + userId.substring(6); // 重置为默认昵称
            users[userIndex].bio = "This profile was reset by admin.";
            
            localStorage.setItem('m3_users', JSON.stringify(users));
            AdminPanel.renderUserList();
            alert("User profile has been reset.");
        }
    }
};

// 当页面加载完成后运行
document.addEventListener('DOMContentLoaded', AdminPanel.init);