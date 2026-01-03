const ThemeEngine = {
	_styleEl: null,
	// Constants (duplicated here to avoid dependency on LocalStorage.js loading order)
	KEYS: {
		THEME_MODE: 'm3_theme_mode',
		THEME_COLOR: 'm3_theme_color'
	},

	init: () => {
		// Create style element for dynamic theme overrides
		if (!document.getElementById('theme-engine-styles')) {
			ThemeEngine._styleEl = document.createElement('style');
			ThemeEngine._styleEl.id = 'theme-engine-styles';
			document.head.appendChild(ThemeEngine._styleEl);
		} else {
			ThemeEngine._styleEl = document.getElementById('theme-engine-styles');
		}

		// 1. Fast Init: Read from localStorage only (no DB dependency yet)
		const savedMode = localStorage.getItem(ThemeEngine.KEYS.THEME_MODE);
		const savedColor = localStorage.getItem(ThemeEngine.KEYS.THEME_COLOR);

		// Apply immediately
		const mode = savedMode || 'system';
		ThemeEngine.setTheme(mode, false);
		if (savedColor) ThemeEngine.setThemeColor(savedColor, false);
		
		// 2. Setup listeners and sync later
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', ThemeEngine._setupListeners);
		} else {
			ThemeEngine._setupListeners();
		}

		console.log("ThemeEngine initialized");
	},

	_setupListeners: () => {
		// Sync with DB if user is logged in (now that DB might be ready)
		const user = window.DB && window.DB.ctx && window.DB.ctx();
		if (user && user.settings) {
			 const dbMode = user.settings.themeMode;
			 const dbColor = user.settings.themeColor;
			 const localMode = localStorage.getItem(ThemeEngine.KEYS.THEME_MODE);
			 
			 // If DB has different settings, apply them
			 if (dbMode && dbMode !== localMode) {
				 ThemeEngine.setTheme(dbMode, false);
			 }
			 if (dbColor) {
				 ThemeEngine.setThemeColor(dbColor, false);
			 }
		}

		// Listen for system changes (only active if mode is 'system')
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
			const currentUser = window.DB && window.DB.ctx && window.DB.ctx();
			let currentMode = 'system';
			if (currentUser && currentUser.settings) {
				 currentMode = currentUser.settings.themeMode || 'system';
			} else {
				 currentMode = localStorage.getItem(ThemeEngine.KEYS.THEME_MODE) || 'system';
			}

			if (currentMode === 'system') {
				ThemeEngine.applyMode(e.matches ? 'dark' : 'light');
			}
		});
		
		// Listen for login/logout events to refresh theme
		window.addEventListener('db:update', (e) => {
			 if (e.detail && e.detail.key === 'session') {
				 // Re-run init logic to switch between guest/user theme
				 const newUser = window.DB.ctx && window.DB.ctx();
				 let newMode = 'light';
				 let newColor = null;

				 if (newUser) {
					 newMode = (newUser.settings && newUser.settings.themeMode) || localStorage.getItem(ThemeEngine.KEYS.THEME_MODE) || 'system';
					 newColor = (newUser.settings && newUser.settings.themeColor) || localStorage.getItem(ThemeEngine.KEYS.THEME_COLOR);
				 } else {
					 newMode = localStorage.getItem(ThemeEngine.KEYS.THEME_MODE) || 'light';
					 newColor = localStorage.getItem(ThemeEngine.KEYS.THEME_COLOR);
				 }
				 
				 ThemeEngine.setTheme(newMode, false);
				 if (newColor) ThemeEngine.setThemeColor(newColor, false);
				 else ThemeEngine.resetThemeColor();
			 }
		});
	},

	setTheme: (mode, save = true) => { // mode: 'light', 'dark', 'system'
		const user = window.DB && window.DB.ctx && window.DB.ctx();
		
		if (save) {
			localStorage.setItem(ThemeEngine.KEYS.THEME_MODE, mode);
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

		// Re-apply custom color if exists, to generate correct palette for new mode
		const savedColor = (user && user.settings && user.settings.themeColor) || localStorage.getItem(ThemeEngine.KEYS.THEME_COLOR);
		if (savedColor) {
			ThemeEngine.setThemeColor(savedColor, false);
		}
	},

	// Color Utility Functions
	hexToRgb: (hex) => {
		let r = 0, g = 0, b = 0;
		if (hex.length === 4) {
			r = parseInt(hex[1] + hex[1], 16);
			g = parseInt(hex[2] + hex[2], 16);
			b = parseInt(hex[3] + hex[3], 16);
		} else if (hex.length === 7) {
			r = parseInt(hex.substring(1, 3), 16);
			g = parseInt(hex.substring(3, 5), 16);
			b = parseInt(hex.substring(5, 7), 16);
		}
		return { r, g, b };
	},

	rgbToHsl: (r, g, b) => {
		r /= 255; g /= 255; b /= 255;
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		let h, s, l = (max + min) / 2;
		if (max === min) {
			h = s = 0; // achromatic
		} else {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
		return { h: h * 360, s: s * 100, l: l * 100 };
	},

	hslToHex: (h, s, l) => {
		l /= 100;
		const a = s * Math.min(l, 1 - l) / 100;
		const f = n => {
			const k = (n + h / 30) % 12;
			const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
			return Math.round(255 * color).toString(16).padStart(2, '0');
		};
		return `#${f(0)}${f(8)}${f(4)}`;
	},

	setThemeColor: (hex, save = true) => {
		const rgb = ThemeEngine.hexToRgb(hex);
		const hsl = ThemeEngine.rgbToHsl(rgb.r, rgb.g, rgb.b);
		
		// Determine current mode
		const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

		// Generate Tonal Palette
		let primary, onPrimary, primaryContainer, onPrimaryContainer;
		let secondary, onSecondary, secondaryContainer, onSecondaryContainer;
		let tertiary, onTertiary, tertiaryContainer, onTertiaryContainer;

		if (isDark) {
			// Dark Mode Palette
			// Primary: Pastel version of input (Lightness ~80%)
			primary = ThemeEngine.hslToHex(hsl.h, Math.min(hsl.s, 50), 80);
			onPrimary = ThemeEngine.hslToHex(hsl.h, hsl.s, 20);
			
			// Primary Container: Darker version (Lightness ~30%)
			primaryContainer = ThemeEngine.hslToHex(hsl.h, hsl.s, 30);
			onPrimaryContainer = ThemeEngine.hslToHex(hsl.h, hsl.s, 90);

			// Secondary: Shift Hue +20deg, low saturation
			secondary = ThemeEngine.hslToHex((hsl.h + 20) % 360, 20, 80);
			onSecondary = ThemeEngine.hslToHex((hsl.h + 20) % 360, 20, 20);
			secondaryContainer = ThemeEngine.hslToHex((hsl.h + 20) % 360, 20, 30);
			onSecondaryContainer = ThemeEngine.hslToHex((hsl.h + 20) % 360, 20, 90);

			// Tertiary: Shift Hue -40deg
			tertiary = ThemeEngine.hslToHex((hsl.h - 40 + 360) % 360, 30, 80);
			onTertiary = ThemeEngine.hslToHex((hsl.h - 40 + 360) % 360, 30, 20);
			tertiaryContainer = ThemeEngine.hslToHex((hsl.h - 40 + 360) % 360, 30, 30);
			onTertiaryContainer = ThemeEngine.hslToHex((hsl.h - 40 + 360) % 360, 30, 90);

		} else {
			// Light Mode Palette
			// Primary: Input color (ensure readable contrast, L ~40-50%)
			// If input is too bright, darken it; if too dark, lighten it slightly
			let pL = Math.max(30, Math.min(hsl.l, 60)); 
			primary = ThemeEngine.hslToHex(hsl.h, hsl.s, pL);
			onPrimary = '#ffffff';

			// Primary Container: Very light version (L ~90%)
			primaryContainer = ThemeEngine.hslToHex(hsl.h, hsl.s, 90);
			onPrimaryContainer = ThemeEngine.hslToHex(hsl.h, hsl.s, 10);

			// Secondary: Shift Hue +20deg, low saturation
			secondary = ThemeEngine.hslToHex((hsl.h + 20) % 360, 20, 40);
			onSecondary = '#ffffff';
			secondaryContainer = ThemeEngine.hslToHex((hsl.h + 20) % 360, 20, 90);
			onSecondaryContainer = ThemeEngine.hslToHex((hsl.h + 20) % 360, 20, 10);

			// Tertiary: Shift Hue -40deg
			tertiary = ThemeEngine.hslToHex((hsl.h - 40 + 360) % 360, 30, 40);
			onTertiary = '#ffffff';
			tertiaryContainer = ThemeEngine.hslToHex((hsl.h - 40 + 360) % 360, 30, 90);
			onTertiaryContainer = ThemeEngine.hslToHex((hsl.h - 40 + 360) % 360, 30, 10);
		}

		// Apply CSS Variables
		const root = document.documentElement;
		root.style.setProperty('--md-sys-color-primary', primary);
		root.style.setProperty('--md-sys-color-on-primary', onPrimary);
		root.style.setProperty('--md-sys-color-primary-container', primaryContainer);
		root.style.setProperty('--md-sys-color-on-primary-container', onPrimaryContainer);

		root.style.setProperty('--md-sys-color-secondary', secondary);
		root.style.setProperty('--md-sys-color-on-secondary', onSecondary);
		root.style.setProperty('--md-sys-color-secondary-container', secondaryContainer);
		root.style.setProperty('--md-sys-color-on-secondary-container', onSecondaryContainer);
		
		root.style.setProperty('--md-sys-color-tertiary', tertiary);
		root.style.setProperty('--md-sys-color-on-tertiary', onTertiary);
		root.style.setProperty('--md-sys-color-tertiary-container', tertiaryContainer);
		root.style.setProperty('--md-sys-color-on-tertiary-container', onTertiaryContainer);
		
		if (save) {
			localStorage.setItem(ThemeEngine.KEYS.THEME_COLOR, hex);
			const user = window.DB && window.DB.ctx && window.DB.ctx();
			if (user) {
				window.DB.updateUser(user.id, { 
					settings: { ...user.settings, themeColor: hex } 
				});
			}
		}
	},

	resetThemeColor: (save = true) => {
		const root = document.documentElement;
		const props = [
			'--md-sys-color-primary', '--md-sys-color-on-primary', 
			'--md-sys-color-primary-container', '--md-sys-color-on-primary-container',
			'--md-sys-color-secondary', '--md-sys-color-on-secondary', 
			'--md-sys-color-secondary-container', '--md-sys-color-on-secondary-container',
			'--md-sys-color-tertiary', '--md-sys-color-on-tertiary', 
			'--md-sys-color-tertiary-container', '--md-sys-color-on-tertiary-container'
		];
		props.forEach(p => root.style.removeProperty(p));

		if (save) {
			localStorage.removeItem(ThemeEngine.KEYS.THEME_COLOR);
			const user = window.DB && window.DB.ctx && window.DB.ctx();
			if (user) {
				window.DB.updateUser(user.id, { 
					settings: { ...user.settings, themeColor: null } 
				});
			}
		}
	},

	toggle: () => {
		const user = window.DB && window.DB.ctx && window.DB.ctx();
		let currentSetting;
		
		if (user) {
			 currentSetting = (user.settings && user.settings.themeMode) || localStorage.getItem(ThemeEngine.KEYS.THEME_MODE) || 'system';
		} else {
			 // Guest: read from localstorage (if they toggled before) or default 'light'
			 currentSetting = localStorage.getItem(ThemeEngine.KEYS.THEME_MODE) || 'light';
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
// Immediate init for fast paint
ThemeEngine.init();
