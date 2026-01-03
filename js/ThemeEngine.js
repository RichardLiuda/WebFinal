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

		// Determine initial mode & color
		let mode = 'light'; // Default
		let color = null;
		
		const user = window.DB && window.DB.ctx();
		const savedMode = localStorage.getItem(DB_KEYS.THEME_MODE);
		const savedColor = localStorage.getItem(DB_KEYS.THEME_COLOR);

		if (user) {
			// User logged in: use DB setting > localStorage > system
			if (user.settings) {
				mode = user.settings.themeMode || savedMode || 'system';
				color = user.settings.themeColor || savedColor;
			} else {
				mode = savedMode || 'system';
				color = savedColor;
			}
		} else {
			// Guest: use localStorage or default
			mode = savedMode || 'light';
			color = savedColor;
		}

		ThemeEngine.setTheme(mode, false); // false = don't save yet, just apply
		if (color) ThemeEngine.setThemeColor(color, false);

		// Listen for system changes (only active if mode is 'system')
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
			const currentUser = window.DB && window.DB.ctx();
			let currentMode = 'system';
			if (currentUser && currentUser.settings) {
				 currentMode = currentUser.settings.themeMode || 'system';
			} else {
				 currentMode = localStorage.getItem(DB_KEYS.THEME_MODE) || 'system';
			}

			if (currentMode === 'system') {
				ThemeEngine.applyMode(e.matches ? 'dark' : 'light');
			}
		});
		
		// Listen for login/logout events to refresh theme
		window.addEventListener('db:update', (e) => {
			 if (e.detail && e.detail.key === 'session') {
				 // Re-run init logic to switch between guest/user theme
				 const newUser = window.DB.ctx();
				 let newMode = 'light';
				 let newColor = null;

				 if (newUser) {
					 newMode = (newUser.settings && newUser.settings.themeMode) || localStorage.getItem(DB_KEYS.THEME_MODE) || 'system';
					 newColor = (newUser.settings && newUser.settings.themeColor) || localStorage.getItem(DB_KEYS.THEME_COLOR);
				 } else {
					 newMode = localStorage.getItem(DB_KEYS.THEME_MODE) || 'light';
					 newColor = localStorage.getItem(DB_KEYS.THEME_COLOR);
				 }
				 
				 ThemeEngine.setTheme(newMode, false);
				 if (newColor) ThemeEngine.setThemeColor(newColor, false);
				 else ThemeEngine.resetThemeColor();
			 }
		});

		console.log("ThemeEngine initialized");
	},

	setTheme: (mode, save = true) => { // mode: 'light', 'dark', 'system'
		const user = window.DB && window.DB.ctx();
		
		if (save) {
			localStorage.setItem('m3_theme_mode', mode);
			// Sync with DB if user is logged in
			if (user) {
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

	setThemeColor: (hex, save = true) => {
		document.documentElement.style.setProperty('--md-sys-color-primary', hex);
		// Simple contrast: assume white text on primary. 
		// In a real app we'd calculate luminance.
		document.documentElement.style.setProperty('--md-sys-color-on-primary', '#ffffff');
		
		if (save) {
			localStorage.setItem('m3_theme_color', hex);
			const user = window.DB && window.DB.ctx();
			if (user) {
				window.DB.updateUser(user.id, { 
					settings: { ...user.settings, themeColor: hex } 
				});
			}
		}
	},

	resetThemeColor: () => {
		document.documentElement.style.removeProperty('--md-sys-color-primary');
		document.documentElement.style.removeProperty('--md-sys-color-on-primary');
	},

	toggle: () => {
		const user = window.DB && window.DB.ctx();
		let currentSetting;
		
		if (user) {
			 currentSetting = (user.settings && user.settings.themeMode) || localStorage.getItem('m3_theme_mode') || 'system';
		} else {
			 // Guest: read from localstorage (if they toggled before) or default 'light'
			 currentSetting = localStorage.getItem('m3_theme_mode') || 'light';
		}

		let currentEffective = currentSetting;
		
		if (currentSetting === 'system') {
			currentEffective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}

		// Simple toggle logic: if dark -> light, else -> dark
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
