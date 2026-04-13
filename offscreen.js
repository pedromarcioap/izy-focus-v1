const AUDIO_BASE_URL = 'https://izy-focus-assets.vercel.app';

const AudioPreloader = {
    cachedAudios: new Map(),
    
    async preloadAudio(url) {
        if (this.cachedAudios.has(url)) {
            console.log('[IzyFocus] Audio already cached:', url);
            return this.cachedAudios.get(url);
        }
        
        try {
            console.log('[IzyFocus] Preloading audio:', url);
            const response = await fetch(url);
            const blob = await response.blob();
            const audioBuffer = URL.createObjectURL(blob);
            this.cachedAudios.set(url, audioBuffer);
            console.log('[IzyFocus] Audio preloaded:', url);
            return audioBuffer;
        } catch (error) {
            console.error('[IzyFocus] Preload failed:', error.message);
            return null;
        }
    },
    
    clearCache() {
        this.cachedAudios.forEach(url => URL.revokeObjectURL(url));
        this.cachedAudios.clear();
    }
};

function getRemoteAudioUrl(source) {
    if (!source) return '';
    if (source.startsWith('http')) return source;
    const filename = source.split('/').pop();
    return `${AUDIO_BASE_URL}/${filename}`;
}

const AudioController = {
    ambientPlayer: null,
    ambientPlayer2: null,
    notificationPlayer: null,
    currentAmbientSource: null,
    fadeInterval: null,

    init() {
        this.ambientPlayer = document.getElementById('ambient-player');
        this.ambientPlayer2 = document.getElementById('ambient-player-2');
        this.notificationPlayer = document.getElementById('notification-player');

        this.ambientPlayer.addEventListener('ended', () => console.log('[IzyFocus] Ambient ended'));
        this.ambientPlayer2.addEventListener('ended', () => console.log('[IzyFocus] Ambient 2 ended'));
        this.ambientPlayer.addEventListener('error', (e) => this.handleError(e, 'ambient'));
        this.notificationPlayer.addEventListener('error', (e) => this.handleError(e, 'notification'));

        console.log('[IzyFocus] AudioController initialized');
    },

    handleError(e, type) {
        console.error(`[IzyFocus] Audio error (${type}):`, e);
        const player = type === 'ambient' ? this.ambientPlayer : this.notificationPlayer;
        console.error('[IzyFocus] Error code:', player?.error?.code);
        console.error('[IzyFocus] Error message:', player?.error?.message);
    },

    stopAmbient() {
        this.clearFade();
        
        if (this.ambientPlayer) {
            this.ambientPlayer.pause();
            this.ambientPlayer.currentTime = 0;
            this.ambientPlayer.src = '';
        }
        
        if (this.ambientPlayer2) {
            this.ambientPlayer2.pause();
            this.ambientPlayer2.currentTime = 0;
            this.ambientPlayer2.src = '';
        }

        this.currentAmbientSource = null;
    },

    fadeIn(audioElement, targetVolume) {
        if (!audioElement) return;
        
        this.clearFade();
        
        const step = 0.05;
        const interval = 50;
        
        this.fadeInterval = setInterval(() => {
            if (audioElement.volume < targetVolume - step) {
                audioElement.volume = Math.min(targetVolume, audioElement.volume + step);
            } else {
                audioElement.volume = targetVolume;
                this.clearFade();
            }
        }, interval);
    },

    clearFade() {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
    },

    async playAmbient(source, volume = 0.5) {
        const audioUrl = getRemoteAudioUrl(source);
        
        if (!audioUrl) {
            console.error('[IzyFocus] No audio URL provided');
            return;
        }
        
        if (this.currentAmbientSource === source && !this.ambientPlayer.paused) {
            console.log('[IzyFocus] Already playing:', source);
            return;
        }

        this.stopAmbient();

        console.log('[IzyFocus] Loading remote audio:', audioUrl);
        
        this.ambientPlayer.src = audioUrl;
        this.ambientPlayer.volume = 0;
        this.currentAmbientSource = source;

        try {
            await this.ambientPlayer.play();
            this.fadeIn(this.ambientPlayer, volume);
            console.log('[IzyFocus] Playing:', source);
        } catch (error) {
            console.error('[IzyFocus] Failed to play remote audio:', error.message);
        }
    },

    async playAmbientMix(source1, source2, volume = 0.5) {
        this.stopAmbient();

        const url1 = getRemoteAudioUrl(source1);
        const url2 = getRemoteAudioUrl(source2);

        console.log('[IzyFocus] Playing mix:', url1, '+', url2);

        this.ambientPlayer.src = url1;
        this.ambientPlayer2.src = url2;
        this.ambientPlayer.volume = 0;
        this.ambientPlayer2.volume = 0;

        try {
            await Promise.all([
                this.ambientPlayer.play(),
                this.ambientPlayer2.play()
            ]);
            this.fadeIn(this.ambientPlayer, volume);
            this.fadeIn(this.ambientPlayer2, volume);
        } catch (error) {
            console.error('[IzyFocus] Failed to play mix:', error.message);
        }
    },

    async playNotification(source, volume = 0.8) {
        const audioUrl = getRemoteAudioUrl(source);
        
        if (!audioUrl) {
            console.error('[IzyFocus] No notification audio URL');
            return;
        }

        console.log('[IzyFocus] Playing notification:', audioUrl);
        
        this.notificationPlayer.src = audioUrl;
        this.notificationPlayer.volume = volume;

        try {
            await this.notificationPlayer.play();
        } catch (error) {
            console.error('[IzyFocus] Notification play failed:', error.message);
        }
    },

    setVolume(volume) {
        if (this.ambientPlayer) this.ambientPlayer.volume = Math.max(0, Math.min(1, volume));
        if (this.ambientPlayer2) this.ambientPlayer2.volume = Math.max(0, Math.min(1, volume));
        if (this.notificationPlayer) this.notificationPlayer.volume = Math.max(0, Math.min(1, volume));
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[IzyFocus] Offscreen received:', request.command);

    switch (request.command) {
        case 'initAudio':
            AudioController.init();
            break;

        case 'offscreenPlay':
        case 'playSound':
            if (request.source2) {
                AudioController.playAmbientMix(request.source, request.source2, request.volume || 0.5);
            } else {
                AudioController.playAmbient(request.source, request.volume || 0.5);
            }
            break;

        case 'offscreenStop':
        case 'stopSound':
            AudioController.stopAmbient();
            break;

        case 'offscreenPlayNotification':
            AudioController.playNotification(request.source, request.volume || 0.8);
            break;

        case 'offscreenSetVolume':
            AudioController.setVolume(request.volume);
            break;

        case 'ping':
            console.log('[IzyFocus] Pong');
            break;

        default:
            console.warn('[IzyFocus] Unknown command:', request.command);
    }

    return true;
});

AudioController.init();
console.log('[IzyFocus] Offscreen loaded - remote audio only');