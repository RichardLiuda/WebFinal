const ImageTools = {
    processImage: (file, callback) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 128;
                canvas.width = MAX_SIZE;
                canvas.height = MAX_SIZE;
                const ctx = canvas.getContext('2d');
                const side = Math.min(img.width, img.height);
                ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, MAX_SIZE, MAX_SIZE);
                callback(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.getElementById('auth-tabs');
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');

    const savedId = localStorage.getItem('m3_remember_id');
    if (savedId) {
        document.getElementById('login-id').value = savedId;
        document.getElementById('remember').checked = true;
    }

    tabs.addEventListener('change', () => {
        const isLogin = tabs.activeTabIndex === 0;
        loginForm.classList.toggle('active', isLogin);
        regForm.classList.toggle('active', !isLogin);
    });

    const toggleBtn = document.getElementById('toggle-pwd');
    const pwdInput = document.getElementById('login-pwd');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            pwdInput.type = toggleBtn.selected ? 'text' : 'password';
        });
    }

    const restrictTo10Digits = (e) => {
        if (e.target.value.length > 10) {
            e.target.value = e.target.value.slice(0, 10);
        }
    };
    document.getElementById('login-id').addEventListener('input', restrictTo10Digits);
    document.getElementById('reg-id').addEventListener('input', restrictTo10Digits);

    document.getElementById('reg-file-input').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            ImageTools.processImage(e.target.files[0], (base64) => {
                document.getElementById('reg-avatar-base64').value = base64;
                const preview = document.getElementById('reg-avatar-preview');
                preview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
            });
        }
    });

    document.getElementById('btn-login').addEventListener('click', () => {
        const id = document.getElementById('login-id').value;
        const pwd = document.getElementById('login-pwd').value;
        const remember = document.getElementById('remember').checked;

        if (window.DB.login(id, pwd)) {
            if (remember) {
                localStorage.setItem('m3_remember_id', id);
            } else {
                localStorage.removeItem('m3_remember_id');
            }
            window.location.href = 'index.html';
        } else {
            const idField = document.getElementById('login-id');
            idField.error = true;
            idField.errorText = "Invalid Student ID or Password";
        }
    });

    document.getElementById('btn-register').addEventListener('click', () => {
        const idField = document.getElementById('reg-id');
        const id = idField.value;
        const nickname = document.getElementById('reg-name').value;
        const pwd = document.getElementById('reg-pwd').value;
        const bio = document.getElementById('reg-bio').value;
        const tagsInput = document.getElementById('reg-tags').value;
        const avatarBase64 = document.getElementById('reg-avatar-base64').value;

        if (!/^\d{10}$/.test(id)) {
            idField.error = true;
            idField.errorText = "Student ID must be exactly 10 digits";
            return;
        }

        if (pwd.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

        const newUser = {
            id,
            password: pwd,
            nickname: nickname || `Student_${id.slice(-4)}`,
            avatar: avatarBase64 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
            bio: bio || "Exploring CampusLink!",
            tags: tags, 
            views: 0, 
            lastActive: new Date().toISOString(), 
            role: 'user',
            isBanned: false,
            stats: { following: 0, followers: 0, posts: 0 },
            following: [],
            followers: []
        };

        if (window.DB.register(newUser)) {
            alert('Registration successful!');
            location.reload(); 
        } else {
            idField.error = true;
            idField.errorText = "This ID is already registered.";
        }
    });
});