const DEFAULT_SETTINGS = {
    masterVol: 100,
    bgmVol: 100,
    sfxVol: 100,
    mute: false,
    gfxQuality: 'hq',
    fastMode: false,
    bgAnimations: true,
    screenShake: true,
    holograms: true
};

export const SettingsManager = {
    getSettings() {
        try {
            const stored = localStorage.getItem('shamanstales_app_settings');
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.warn("Failed to parse settings from localStorage, using defaults", e);
        }
        return { ...DEFAULT_SETTINGS };
    },

    saveSettings(settingsObj) {
        // Apply Background Animation setting immediately globally
        if (settingsObj.bgAnimations !== undefined) {
            document.body.classList.toggle('no-bg-anim', !settingsObj.bgAnimations);
        }
        
        localStorage.setItem('shamanstales_app_settings', JSON.stringify(settingsObj));
        window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: settingsObj }));
    },

    getGfxExtension() {
        const s = this.getSettings();
        return s.gfxQuality === 'lq' ? 'webp' : 'png';
    }
};
