const ThemeEngine = {
    _styleEl: null,

    init: () => {
        // Create style element for dynamic theme overrides
        if (!document.getElementById('theme-engine-styles')) {
            ThemeEngine._styleEl = document.createElement('style');
            ThemeEngine._styleEl.id = 'theme-engine-styles';
            document.head.appendChild(ThemeEngine._styleEl);
        } else {
            ThemeEngine._styleEl = document.getElementById('theme-engine-styles');
        }

        // Load preference
        // 1. Try DB settings if logged in
        // 2. Try LocalStorage
        // 3. Default to system
        let mode = 'system';
        const saved = localStorage.getItem('m3_theme_mode');
        if (saved) mode = saved;

        ThemeEngine.setTheme(mode, false); // false = don't save yet, just apply

        // Listen for system changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('m3_theme_mode') === 'system') {
                ThemeEngine.applyMode(e.matches ? 'dark' : 'light');
            }
        });

        console.log("ThemeEngine initialized");
    },

    setTheme: (mode, save = true) => { // mode: 'light', 'dark', 'system'
        if (save) {
            localStorage.setItem('m3_theme_mode', mode);
            // Sync with DB if user is logged in
            if (window.DB && window.DB.ctx()) {
                const user = window.DB.ctx();
                window.DB.updateUser(user.id, { 
                    settings: { ...user.settings, themeMode: mode } 
                });
            }
        }
        
        let targetMode = mode;
        if (mode === 'system') {
            targetMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        ThemeEngine.applyMode(targetMode);
    },

    toggle: () => {
        const currentSetting = localStorage.getItem('m3_theme_mode') || 'system';
        let currentEffective = currentSetting;
        
        if (currentSetting === 'system') {
            currentEffective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        // Simple toggle logic: if dark -> light, else -> dark
        // And we switch away from 'system' to explicit preference
        const next = currentEffective === 'dark' ? 'light' : 'dark';
        ThemeEngine.setTheme(next);
        return next;
    },

    applyMode: (mode) => {
        const root = document.documentElement;
        if (mode === 'dark') {
            root.setAttribute('data-theme', 'dark');
            // Material 3 Dark Theme Tokens (Teal based)
            ThemeEngine._styleEl.textContent = `
                :root {
                    /* Primary - Teal 200 */
                    --md-sys-color-primary: #80d6d4;
                    --md-sys-color-on-primary: #003737;
                    --md-sys-color-primary-container: #004f4f;
                    --md-sys-color-on-primary-container: #9cf1ef;
                    
                    /* Secondary - Teal 200 variant */
                    --md-sys-color-secondary: #b3ccc6;
                    --md-sys-color-on-secondary: #1e3531;
                    --md-sys-color-secondary-container: #354b47;
                    --md-sys-color-on-secondary-container: #cfe8e2;
                    
                    /* Tertiary - Purple 200 */
                    --md-sys-color-tertiary: #c4c5ec;
                    --md-sys-color-on-tertiary: #2d2f46;
                    --md-sys-color-tertiary-container: #43465e;
                    --md-sys-color-on-tertiary-container: #e1e2ff;

                    /* Error */
                    --md-sys-color-error: #ffb4ab;
                    --md-sys-color-on-error: #690005;
                    --md-sys-color-error-container: #93000a;
                    --md-sys-color-on-error-container: #ffdad6;

                    /* Surface & Background - Neutral 10/10 */
                    --md-sys-color-background: #191c1c;
                    --md-sys-color-on-background: #e0e3e1;
                    --md-sys-color-surface: #191c1c;
                    --md-sys-color-on-surface: #e0e3e1;
                    
                    /* Surface Variants */
                    --md-sys-color-surface-variant: #3f4947;
                    --md-sys-color-on-surface-variant: #bec9c7;
                    --md-sys-color-outline: #899391;
                    --md-sys-color-outline-variant: #3f4947;

                    /* Surface Containers */
                    --md-sys-color-surface-container-lowest: #0f1212;
                    --md-sys-color-surface-container-low: #191c1c;
                    --md-sys-color-surface-container: #1d2020;
                    --md-sys-color-surface-container-high: #282b2b;
                    --md-sys-color-surface-container-highest: #333635;
                }
            `;
        } else {
            root.setAttribute('data-theme', 'light');
            ThemeEngine._styleEl.textContent = ''; // Revert to global.css defaults
        }
    }
};

window.ThemeEngine = ThemeEngine;
// Auto init
document.addEventListener('DOMContentLoaded', ThemeEngine.init);
