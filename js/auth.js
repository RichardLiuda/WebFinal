document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.getElementById('auth-tabs');
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');

    // --- 0. Remember Me: Auto-fill saved ID ---
    const savedId = localStorage.getItem('m3_remember_id');
    if (savedId) {
        document.getElementById('login-id').value = savedId;
        document.getElementById('remember').checked = true;
    }

    // --- 1. Tab Switching ---
    tabs.addEventListener('change', () => {
        const isLogin = tabs.activeTabIndex === 0;
        loginForm.classList.toggle('active', isLogin);
        regForm.classList.toggle('active', !isLogin);
    });

    // --- 2. Password Visibility ---
    const toggleBtn = document.getElementById('toggle-pwd');
    const pwdInput = document.getElementById('login-pwd');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            pwdInput.type = toggleBtn.selected ? 'text' : 'password';
        });
    }

    // --- 3. Hide Character Counter & Restrict to 10 Digits manually ---
    const restrictTo10Digits = (e) => {
        if (e.target.value.length > 10) {
            e.target.value = e.target.value.slice(0, 10);
        }
    };
    document.getElementById('login-id').addEventListener('input', restrictTo10Digits);
    document.getElementById('reg-id').addEventListener('input', restrictTo10Digits);

    // --- 4. Login Logic ---
    document.getElementById('btn-login').addEventListener('click', () => {
        const id = document.getElementById('login-id').value;
        const pwd = document.getElementById('login-pwd').value;
        const remember = document.getElementById('remember').checked;

        console.log("Attempting login with:", id, pwd); 
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

    // --- 5. Registration Logic ---
    document.getElementById('btn-register').addEventListener('click', () => {
        const idField = document.getElementById('reg-id');
        const id = idField.value;
        const nickname = document.getElementById('reg-name').value;
        const pwd = document.getElementById('reg-pwd').value;
        const bio = document.getElementById('reg-bio').value;

        // Validation: EXACTLY 10 digit ID
        if (!/^\d{10}$/.test(id)) {
            idField.error = true;
            idField.errorText = "Student ID must be exactly 10 digits";
            return;
        } else {
            idField.error = false;
        }

        if (pwd.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        if (!nickname) {
            alert('Please enter a nickname');
            return;
        }

        const newUser = {
            id,
            password: pwd,
            nickname,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
            bio: bio || "Exploring CampusLink!",
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
            role: 'user',
            isBanned: false,
            following: [],
            followers: []
        };

        if (window.DB.register(newUser)) {
            alert('Registration successful! You can now sign in.');
            location.reload(); 
        } else {
            idField.error = true;
            idField.errorText = "This Student ID is already registered.";
        }
    });
});