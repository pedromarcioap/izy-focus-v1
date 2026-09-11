document.addEventListener('DOMContentLoaded', () => {
    console.log('[IzyFocus] DOMContentLoaded');
    
    const elements = {
        app: document.getElementById('app'),
        mainHeaderTitle: document.getElementById('main-header-title'),
        homeContainer: document.getElementById('home-container'),
        timerWrapper: document.getElementById('timer-wrapper'),
        completedWrapper: document.getElementById('completed-wrapper'),
        quickStartButtons: document.getElementById('quick-start-buttons'),
        seedCount: document.getElementById('seed-count'),
        stoneCount: document.getElementById('stone-count'),
        streakCount: document.getElementById('streak-count'),
        intentionInput: document.getElementById('intention-input'),
        charCount: document.getElementById('char-count'),
        timerDisplay: document.getElementById('timer-display'),
        currentTaskLabel: document.getElementById('current-task-label'),
        statusLabel: document.getElementById('status-label'),
        soundToggleBtn: document.getElementById('sound-toggle-btn'),
        soundList: document.getElementById('sound-list'),
        emergencyStopBtn: document.getElementById('emergency-stop-btn'),
        startNextCycleBtn: document.getElementById('start-next-cycle-btn'),
        finishSessionBtn: document.getElementById('finish-session-btn'),
        gardenBtn: document.getElementById('garden-btn'),
        statsBtn: document.getElementById('stats-btn'),
        settingsBtn: document.getElementById('settings-btn'),
        darkModeBtn: document.getElementById('dark-mode-btn'),
        muteBtn: document.getElementById('mute-btn'),
        progressRingBar: null,
        currentLevel: document.getElementById('current-level'),
        currentXp: document.getElementById('current-xp'),
        nextLevelXp: document.getElementById('next-level-xp'),
        xpProgressFill: document.getElementById('xp-progress-fill')
    };
    
    console.log('[IzyFocus] Elements found:', Object.keys(elements).filter(k => elements[k]).length);
    
    let timerInterval = null;
    let completedSessionData = null;
    let isDarkMode = false;
    let isSoundEnabled = true;
    let isAudioPlaying = false;
    let focusSessionStarted = false;
    let availableSounds = [];
    const circumference = 2 * Math.PI * 100;

    const LOCAL_SOUNDS = [
        { file: 'rain.mp3', name: 'Chuva', emoji: '🌧️', isLocal: true },
        { file: 'forest.mp3', name: 'Floresta', emoji: '🌳', isLocal: true }
];

    (async () => {
        await init();
    })();

    async function init() {
        console.log('[IzyFocus] Starting init');
        
        try {
            localizeHtmlPage();
            await loadDarkMode();
            await loadSoundState();
            await loadPlaybackState();
            
            availableSounds = LOCAL_SOUNDS;
            buildSoundList(availableSounds);
            
            await initializeHomePage();
            
            await setupEventListeners();
            
            console.log('[IzyFocus] listeners setup');
            
            await requestInitialState();
            
            console.log('[IzyFocus] Init complete');
        } catch (e) {
            console.error('[IzyFocus] Init error:', e);
            
            if (elements.homeContainer) {
                elements.homeContainer.style.display = 'flex';
                availableSounds = LOCAL_SOUNDS;
                buildSoundList(availableSounds);
                initializeHomePage();
            }
        }
    }

    function localizeHtmlPage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const msg = chrome.i18n.getMessage(el.dataset.i18n);
            if (msg) el.textContent = msg;
        });
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const msg = chrome.i18n.getMessage(el.dataset.i18nHtml);
            if (msg) el.innerHTML = msg;
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const msg = chrome.i18n.getMessage(el.dataset.i18nTitle);
            if (msg) el.title = msg;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const msg = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
            if (msg) el.placeholder = msg;
        });
    }

    async function loadDarkMode() {
        try {
            const data = await chrome.storage.local.get('darkMode');
            isDarkMode = data.darkMode === true;
            applyDarkMode();
        } catch (e) {
            console.warn('[IzyFocus] Failed to load dark mode:', e);
        }
    }

    function applyDarkMode() {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            elements.darkModeBtn.querySelector('.sun-icon').style.display = 'block';
            elements.darkModeBtn.querySelector('.moon-icon').style.display = 'none';
        } else {
            document.documentElement.classList.remove('dark');
            elements.darkModeBtn.querySelector('.sun-icon').style.display = 'none';
            elements.darkModeBtn.querySelector('.moon-icon').style.display = 'block';
        }
    }

    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        applyDarkMode();
        chrome.storage.local.set({ darkMode: isDarkMode });
    }

    async function loadSoundState() {
        try {
            console.log('[IzyFocus] Loading sound state...');
            const response = await chrome.runtime.sendMessage({ command: 'getSoundState' }).catch(() => null);
            console.log('[IzyFocus] Sound state response:', response);
            if (response) {
                isSoundEnabled = response.enabled;
                applySoundState();
            }
        } catch (e) {
            console.error('[IzyFocus] Failed to load sound state:', e);
        }
    }

    function applySoundState() {
        if (elements.muteBtn) {
            const soundOnIcon = elements.muteBtn.querySelector('.sound-on-icon');
            const soundOffIcon = elements.muteBtn.querySelector('.sound-off-icon');
            if (isSoundEnabled) {
                soundOnIcon.style.display = 'block';
                soundOffIcon.style.display = 'none';
            } else {
                soundOnIcon.style.display = 'none';
                soundOffIcon.style.display = 'block';
            }
        }
    }

    function toggleSoundHandler() {
        isSoundEnabled = !isSoundEnabled;
        applySoundState();
        chrome.runtime.sendMessage({ command: 'toggleSound' }).catch(() => {});
    }

    async function loadPlaybackState() {
        try {
            const data = await chrome.storage.local.get('audioPlaybackState');
            if (data.audioPlaybackState) {
                isAudioPlaying = data.audioPlaybackState.isPlaying;
                updateSoundButtonState();
            }
        } catch (e) {
            console.warn('[IzyFocus] Failed to load playback state:', e);
        }
    }

    function updateSoundButtonState() {
        if (!elements.soundToggleBtn) return;
        
        elements.soundToggleBtn.classList.remove('pulse-glow', 'playing');
        
        if (focusSessionStarted && !isAudioPlaying) {
            elements.soundToggleBtn.classList.add('pulse-glow');
        } else if (isAudioPlaying) {
            elements.soundToggleBtn.classList.add('playing');
        }
    }

    function buildSoundList(sounds) {
        elements.soundList.innerHTML = '';
        
        const stopOption = document.createElement('button');
        stopOption.className = 'sound-option';
        stopOption.dataset.sound = 'stop';
        stopOption.innerHTML = `<span>🔇</span> Silêncio`;
        elements.soundList.appendChild(stopOption);
        
        sounds.forEach(sound => {
            const option = document.createElement('button');
            option.className = 'sound-option';
            option.dataset.sound = sound.file;
            option.dataset.isLocal = sound.isLocal;
            
            const cloudBadge = !sound.isLocal ? `<span class="cloud-badge">Cloud</span>` : '';
            option.innerHTML = `<span>${sound.emoji}</span> ${sound.name}${cloudBadge}`;
            elements.soundList.appendChild(option);
        });
    }

    async function requestInitialState() {
        try {
            console.log('[IzyFocus] Requesting initial state...');
            
            const response = await chrome.runtime.sendMessage({ command: 'getState' }).catch(() => null);
            
            console.log('[IzyFocus] Initial state response:', response);
            
            if (response && response.state && response.state.isActive) {
                render(response.state);
            } else {
                const { focusLists, timerState } = await chrome.storage.local.get(['focusLists', 'timerState']);
                if (timerState && timerState.isActive) {
                    render(timerState);
                } else {
                    console.log('[IzyFocus] Rendering home view');
                    render({ isActive: false });
                }
            }
        } catch (error) {
            console.error('[IzyFocus] Failed to get initial state:', error);
            render({ isActive: false });
        }
    }

    function render(state) {
        console.log('[IzyFocus] Rendering with state:', state);
        clearInterval(timerInterval);
        
        elements.homeContainer.classList.remove('active');
        elements.timerWrapper.classList.remove('active');
        elements.completedWrapper.classList.remove('active');
        elements.app.classList.remove('session-active');
        
        focusSessionStarted = false;
        updateSoundButtonState();

        if (!state || !state.isActive) {
            console.log('[IzyFocus] Rendering home view');
            elements.mainHeaderTitle.textContent = 'Izy Focus';
            elements.homeContainer.classList.add('active');
            initializeHomePage();
        } else {
            console.log('[IzyFocus] Rendering active session view');
            elements.app.classList.add('session-active');
            elements.mainHeaderTitle.textContent = state.listName || 'Izy Focus';

            if (state.currentPhase === 'completed') {
                elements.completedWrapper.classList.add('active');
                completedSessionData = state;
                updateCompletedView(state);
            } else {
                elements.timerWrapper.classList.add('active');
                initTimerView(state);
                startTimerUpdate(state);
            }
        }
    }

    async function initializeHomePage() {
        try {
            const data = await chrome.storage.local.get(['focusLists', 'dayIntention', 'gardenInventory', 'userStats']);
            const inventory = data.gardenInventory || { seeds: 0, stones: 0, xp: 0 };
            const stats = data.userStats || { currentStreak: 0 };
            
            elements.seedCount.textContent = inventory.seeds || 0;
            elements.stoneCount.textContent = inventory.stones || 0;
            elements.streakCount.textContent = stats.currentStreak || 0;
            
            elements.quickStartButtons.innerHTML = '';
            
            if (data.focusLists && data.focusLists.length > 0) {
                data.focusLists.forEach(list => {
                    const btn = document.createElement('button');
                    btn.className = 'quick-start-btn';
                    btn.dataset.listId = list.id;
                    btn.innerHTML = `
                        <span class="name">${list.name.split('(')[0].trim()}</span>
                        <span class="duration">${list.focusTime} min</span>
                    `;
                    elements.quickStartButtons.appendChild(btn);
                });
            } else {
                elements.quickStartButtons.innerHTML = `
                    <div class="empty-state">
                        <p>Nenhuma lista encontrada.</p>
                        <p>Configure nas Configurações.</p>
                    </div>
                `;
            }
            
            if (data.dayIntention) {
                elements.intentionInput.value = data.dayIntention;
                updateCharCount();
            }
        } catch (e) {
            console.error('[IzyFocus] Failed to initialize home page:', e);
        }
    }

    function initTimerView(state) {
        if (!elements.progressRingBar) {
            elements.progressRingBar = elements.timerWrapper.querySelector('.progress-ring__bar');
            elements.progressRingBar.style.strokeDasharray = `${circumference} ${circumference}`;
        }

        const isFocus = state.currentPhase === 'focus';
        elements.statusLabel.textContent = isFocus 
            ? chrome.i18n.getMessage('popup_phase_focus') || 'Focando...'
            : chrome.i18n.getMessage('popup_phase_break') || 'Pausa';
        elements.statusLabel.style.color = isFocus ? 'var(--primary)' : 'var(--secondary)';
        
        elements.soundToggleBtn.style.display = isFocus ? 'flex' : 'none';
        if (!isFocus) elements.soundList.classList.remove('open');
        
        elements.currentTaskLabel.textContent = isFocus 
            ? state.listName 
            : (chrome.i18n.getMessage('popup_break_message') || 'Descanse!');
        
        if (isFocus) {
            focusSessionStarted = true;
            updateSoundButtonState();
        }
    }

    function startTimerUpdate(state) {
        const isFocus = state.currentPhase === 'focus';
        const totalDuration = (isFocus ? state.focusTime : state.breakTime) * 60 * 1000;

        const updateDisplay = () => {
            const remainingTime = state.endTime - Date.now();
            
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                chrome.runtime.sendMessage({ command: 'getState' }).then(response => {
                    if (response && response.state) render(response.state);
                }).catch(() => {});
                return;
            }
            
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            elements.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            const progress = (totalDuration - remainingTime) / totalDuration;
            const offset = circumference * (1 - progress);
            elements.progressRingBar.style.strokeDashoffset = offset;
        };

        updateDisplay();
        timerInterval = setInterval(() => updateDisplay(), 1000);
    }

    async function updateCompletedView(state) {
        const data = await chrome.storage.local.get('gardenInventory');
        const inventory = data.gardenInventory || { xp: 0 };
        const levelInfo = calculateLevel(inventory.xp || 0);
        
        elements.currentLevel.textContent = levelInfo.level;
        elements.currentXp.textContent = inventory.xp || 0;
        elements.nextLevelXp.textContent = levelInfo.nextLevelXp;
        elements.xpProgressFill.style.width = `${levelInfo.progress}%`;
    }

    function calculateLevel(xp) {
        const xpPerLevel = 250;
        const level = 1 + Math.floor(xp / xpPerLevel);
        const nextLevelXp = level * xpPerLevel;
        const currentLevelBaseXp = (level - 1) * xpPerLevel;
        const progress = ((xp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100;
        
        return { level, xp, nextLevelXp, progress };
    }

    function updateCharCount() {
        const count = elements.intentionInput.value.length;
        elements.charCount.textContent = `${count}/200`;
        elements.charCount.classList.remove('warning', 'limit');
        
        if (count >= 200) elements.charCount.classList.add('limit');
        else if (count >= 150) elements.charCount.classList.add('warning');
    }

    function setupEventListeners() {
        elements.gardenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL('garden/garden.html') });
        });
        
        elements.statsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL('stats/stats.html') });
        });
        
        elements.settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage();
        });

        elements.darkModeBtn.addEventListener('click', toggleDarkMode);
        
        if (elements.muteBtn) {
            elements.muteBtn.addEventListener('click', toggleSoundHandler);
        }
        
        elements.emergencyStopBtn.addEventListener('click', () => {
            if (confirm(chrome.i18n.getMessage('popup_confirm_interrupt') || 'Interromper sessão?')) {
                chrome.runtime.sendMessage({ command: 'interruptFocus' }).catch(() => {});
                
                chrome.storage.local.get('timerState').then(data => {
                    render({ isActive: false });
                });
            }
        });
        
        elements.finishSessionBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ command: 'finishSession' }).catch(() => {});
        });
        
        elements.startNextCycleBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ command: 'startNextSession', sessionData: completedSessionData }).catch(() => {});
        });
        
        elements.intentionInput.addEventListener('input', () => {
            updateCharCount();
            chrome.storage.local.set({ dayIntention: elements.intentionInput.value });
        });

        elements.quickStartButtons.addEventListener('click', async (e) => {
            const btn = e.target.closest('.quick-start-btn');
            if (!btn) return;
            
            const listId = parseInt(btn.dataset.listId, 10);
            
            try {
                const { focusLists, dayIntention } = await chrome.storage.local.get(['focusLists', 'dayIntention']);
                const list = focusLists.find(l => l.id === listId);
                
                if (list) {
                    const intention = dayIntention || '';
                    
                    const optimisticState = {
                        isActive: true,
                        currentPhase: 'focus',
                        listName: list.name,
                        focusTime: list.focusTime,
                        breakTime: list.breakTime,
                        endTime: Date.now() + list.focusTime * 60 * 1000,
                        startTime: Date.now(),
                        dayIntention: intention
                    };
                    render(optimisticState);
                    chrome.runtime.sendMessage({ command: 'startFocus', listId: listId, dayIntention: intention }).catch(() => {});
                }
            } catch (e) {
                console.error('[IzyFocus] Failed to start focus:', e);
            }
        });

        elements.soundToggleBtn.addEventListener('click', () => {
            elements.soundList.classList.toggle('open');
        });

        elements.soundList.addEventListener('click', (e) => {
            const option = e.target.closest('.sound-option');
            if (!option) return;

            elements.soundList.querySelectorAll('.sound-option').forEach(btn => btn.classList.remove('active'));
            option.classList.add('active');
            
            const sound = option.dataset.sound;
            const isLocal = option.dataset.isLocal === 'true';
            
            if (sound === 'stop') {
                chrome.runtime.sendMessage({ command: 'stopSound' }).catch(() => {});
                isAudioPlaying = false;
            } else {
                chrome.runtime.sendMessage({ command: 'playSound', source: sound }).catch(() => {});
                isAudioPlaying = true;
            }
            
            updateSoundButtonState();
            elements.soundList.classList.remove('open');
        });

        document.addEventListener('click', (e) => {
            if (!elements.soundToggleBtn.contains(e.target) && !elements.soundList.contains(e.target)) {
                elements.soundList.classList.remove('open');
            }
        });

        chrome.runtime.onMessage.addListener((request) => {
            if (request.command === 'updateState') {
                console.log('[IzyFocus] updateState received:', request.state);
                render(request.state);
            } else if (request.command === 'updateSoundState') {
                isSoundEnabled = request.enabled;
                applySoundState();
            } else if (request.command === 'updatePlaybackState') {
                isAudioPlaying = request.isPlaying;
                updateSoundButtonState();
            }
        });
    }
});
