const LOCAL_AUDIO_BASE = 'assets/sounds';

const audioCache = new Map();

async function loadAudioAsBlob(url) {
    if (audioCache.has(url)) {
        return audioCache.get(url);
    }
    
    if (url.startsWith('chrome-extension://')) {
        audioCache.set(url, url);
        return url;
    }
    
    if (url.startsWith('http')) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            audioCache.set(url, blobUrl);
            return blobUrl;
        } catch (e) {
            console.error('[IzyFocus] Load error:', e.message);
            return null;
        }
    }
    
    const resolved = chrome.runtime.getURL(url);
    audioCache.set(url, resolved);
    return resolved;
}

const AudioController = {
    ambientPlayer: null,
    notificationPlayer: null,
    currentUrl: null,

    init() {
        this.ambientPlayer = document.getElementById('ambient-player');
        this.notificationPlayer = document.getElementById('notification-player');
    },

    stopAmbient() {
        if (this.ambientPlayer) {
            this.ambientPlayer.pause();
            this.ambientPlayer.currentTime = 0;
            this.ambientPlayer.src = '';
        }
        this.currentUrl = null;
    },

    async playAmbient(source, volume = 0.5) {
        const extUrl = source.startsWith('http') ? source : chrome.runtime.getURL(source.startsWith('assets/sounds/') ? source : LOCAL_AUDIO_BASE + '/' + source);
        
        const blobUrl = await loadAudioAsBlob(extUrl);
        
        if (!blobUrl) {
            console.error('[IzyFocus] Failed to load audio');
            return;
        }
        
        this.ambientPlayer.src = blobUrl;
        this.ambientPlayer.volume = volume;
        this.currentUrl = extUrl;
        
        try {
            await this.ambientPlayer.play();
        } catch (e) {
            console.error('[IzyFocus] Play error:', e.message);
        }
    },

    setVolume(volume) {
        if (this.ambientPlayer) this.ambientPlayer.volume = Math.max(0, Math.min(1, volume));
        if (this.notificationPlayer) this.notificationPlayer.volume = Math.max(0, Math.min(1, volume));
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const cmd = request.command;
    const src = request.source;
    const vol = request.volume;
    
    if (cmd === 'offscreenPlay' || cmd === 'playSound') {
        AudioController.playAmbient(src, vol || 0.5);
    } else if (cmd === 'offscreenStop' || cmd === 'stopSound') {
        AudioController.stopAmbient();
    } else if (cmd === 'offscreenPlayNotification') {
        const url = src.startsWith('http') ? src : chrome.runtime.getURL(LOCAL_AUDIO_BASE + '/' + src);
        loadAudioAsBlob(url).then(blobUrl => {
            if (blobUrl) {
                AudioController.notificationPlayer.src = blobUrl;
                AudioController.notificationPlayer.volume = vol || 0.8;
                AudioController.notificationPlayer.play().catch(() => {});
            }
        });
    } else if (cmd === 'offscreenSetVolume') {
        AudioController.setVolume(vol);
    }
});

AudioController.init();