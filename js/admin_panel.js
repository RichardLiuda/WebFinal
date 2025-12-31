const AdminPanel = {
    init: () => {
        const currentUser = window.DB.ctx();
        
        if (!currentUser || currentUser.role !== 'admin') {
            alert("Security Alert: You are not authorized to view this page.");
            window.location.href = 'index.html';
            return;
        }

        AdminPanel.renderUserList();
    },

    renderUserList: () => {
        const users = window.DB.getUsers();
        const container = document.getElementById('user-list-container');
        
        if (!container) return;
        
        document.getElementById('stat-total').innerText = users.length;
        document.getElementById('stat-banned').innerText = users.filter(u => u.isBanned).length;

        if (users.length === 0) {
            container.innerHTML = '<div class="md-typescale-body-medium" style="text-align: center; padding: 32px;">No users registered yet.</div>';
            return;
        }

        container.innerHTML = users.map(u => `
            <div class="user-card ${u.isBanned ? 'is-banned' : ''}">
                <img src="${u.avatar}" class="user-avatar">
                <div class="user-info">
                    <div class="md-typescale-title-medium">
                        ${window.Utils.sanitize(u.nickname)} 
                        ${u.role === 'admin' ? '<span class="badge-admin">ADMIN</span>' : ''}
                    </div>
                    <div class="md-typescale-body-small">ID: ${u.id} • ${u.isBanned ? 'Status: Banned' : 'Status: Active'}</div>
                </div>
                <div class="action-btns">
                    ${u.role !== 'admin' ? `
                        <md-filled-tonal-button onclick="AdminPanel.toggleBan('${u.id}')">
                            <md-icon slot="icon">${u.isBanned ? 'check_circle' : 'block'}</md-icon>
                            ${u.isBanned ? 'Unban' : 'Ban User'}
                        </md-filled-tonal-button>
                        <md-outlined-button onclick="AdminPanel.resetUser('${u.id}')">
                            Reset Profile
                        </md-outlined-button>
                    ` : '<span class="md-typescale-body-small" style="padding: 8px">Admin Protected</span>'}
                </div>
            </div>
        `).join('');
    },

    toggleBan: (userId) => {
        const currentUser = window.DB.ctx();
        if (String(userId) === String(currentUser.id)) {
            alert("You cannot ban yourself!");
            return;
        }

        const user = window.DB.getUserById(userId);
        if (!user) return;

        if (user.isBanned) {
            window.DB.unbanUser(userId);
        } else {
            window.DB.banUser(userId);
        }

        AdminPanel.renderUserList();
    },

    resetUser: (userId) => {
        if (!confirm(`Are you sure you want to reset the profile of ${userId}?`)) return;

        window.DB.updateUser(userId, {
            nickname: "Student_" + userId.substring(6),
            bio: "This profile was reset by admin."
        });

        AdminPanel.renderUserList();
        alert("User profile has been reset.");
    }
};

document.addEventListener('DOMContentLoaded', AdminPanel.init);
