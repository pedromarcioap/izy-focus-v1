document.addEventListener('DOMContentLoaded', () => {
    // Element References
    const elements = {
        app: document.getElementById('app'),
        headerTitle: document.getElementById('main-header-title'),
        settingsBtn: document.getElementById('settings-btn'),
        statsBtn: document.getElementById('stats-btn'),
        gardenBtn: document.getElementById('garden-btn'),
        emergencyStopBtn: document.getElementById('emergency-stop-btn'),
        quickStartButtons: document.getElementById('quick-start-buttons'),
        seedCount: document.getElementById('seed-count'),
        stoneCount: document.getElementById('stone-count'),
        intentionInput: document.getElementById('intention-input'),
        homeContainer: document.getElementById('home-container'),
        timerWrapper: document.getElementById('timer-wrapper'),
        completedWrapper: document.getElementById('completed-wrapper'),
        soundToggleBtn: document.getElementById('sound-toggle-btn'),
        soundList: document.getElementById('sound-list'),
        finishSessionBtn: document.getElementById('finish-session-btn'),
        startNextCycleBtn: document.getElementById('start-next-cycle-btn'),
        timerDisplay: document.getElementById('timer-display'),
        currentTaskLabel: document.getElementById('current-task-label'),
        plantContainer: document.getElementById('plant-container'),
        plantLeaves: document.querySelectorAll('#growing-plant .leaf')
    };

    let focusRingBar, radius, circumference;
    let timerInterval = null, completedSessionData = null;

    // Audio Logic
    const SOUNDS = [
        { file: 'rain.mp3', name: 'Chuva', emoji: '🌧️' },
        { file: 'forest.mp3', name: 'Floresta', emoji: '🌳' }
    ];

    function buildSoundList() {
        elements.soundList.innerHTML = '';
        const stopOption = document.createElement('button');
        stopOption.className = 'sound-option active';
        stopOption.dataset.sound = 'stop';
        stopOption.innerHTML = '🔇 Silêncio';
        elements.soundList.appendChild(stopOption);
        
        SOUNDS.forEach(sound => {
            const option = document.createElement('button');
            option.className = 'sound-option';
            option.dataset.sound = sound.file;
            option.innerHTML = `${sound.emoji} ${sound.name}`;
            elements.soundList.appendChild(option);
        });
    }

    // Render Logic
    function render(state) {
        clearInterval(timerInterval);
        
        elements.homeContainer.style.display = 'none';
        elements.timerWrapper.style.display = 'none';
        elements.completedWrapper.style.display = 'none';
        elements.app.classList.remove('session-active');

        if (!state || !state.isActive) {
            elements.headerTitle.textContent = "Izy Focus";
            elements.homeContainer.style.display = 'block';
            initializeHomePage();
        } else {
            elements.app.classList.add('session-active');

            if (state.currentPhase === 'completed') {
                elements.headerTitle.textContent = "Ciclo Concluído!";
                elements.completedWrapper.style.display = 'flex';
                completedSessionData = state;
            } else {
                elements.timerWrapper.style.display = 'flex';

                if (!focusRingBar) {
                    focusRingBar = elements.timerWrapper.querySelector('.progress-ring__bar');
                    radius = focusRingBar.r.baseVal.value;
                    circumference = 2 * Math.PI * radius;
                    focusRingBar.style.strokeDasharray = `${circumference} ${circumference}`;
                }

                const isFocus = state.currentPhase === 'focus';
                elements.headerTitle.textContent = isFocus ? "Em Foco" : "Pausa";
                focusRingBar.classList.toggle('break-bar', !isFocus);
                elements.soundToggleBtn.style.display = isFocus ? 'flex' : 'none';
                if (!isFocus) elements.soundList.style.display = 'none';
                
                const totalDuration = (isFocus ? state.focusTime : state.breakTime) * 60 * 1000;
                const updateDisplay = () => {
                    const remainingTime = state.endTime - Date.now();
                    if (remainingTime < 0) {
                        clearInterval(timerInterval);
                        chrome.runtime.sendMessage({ command: 'getState' });
                        return;
                    }
                    
                    const minutes = Math.floor(remainingTime / 60000);
                    const seconds = Math.floor((remainingTime % 60000) / 1000);
                    elements.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                    
                    const progress = (totalDuration - remainingTime) / totalDuration;
                    focusRingBar.style.strokeDashoffset = circumference * (1 - progress);
                    
                    if (isFocus) {
                        elements.currentTaskLabel.textContent = state.listName;
                        updatePlant(progress);
                    } else {
                        elements.currentTaskLabel.textContent = "Respire e alongue-se";
                        updatePlant(0);
                    }
                };
                
                updateDisplay();
                timerInterval = setInterval(updateDisplay, 1000);
            }
        }
    }

    function updatePlant(progress) {
        elements.plantContainer.style.opacity = 0.5 + (progress * 0.5);
        const scale = progress * 1.2;
        elements.plantLeaves.forEach(leaf => leaf.style.transform = `scale(${Math.min(1, scale)})`);
    }

    // --- Comunicação ---
    chrome.runtime.onMessage.addListener((request) => {
        if (request.command === 'updateState') render(request.state);
    });

    // Initialize Home Page
    async function initializeHomePage() {
        const data = await chrome.storage.local.get(['focusLists', 'dayIntention', 'gardenInventory']);
        const inventory = data.gardenInventory || { seeds: 0, stones: 0 };
        elements.seedCount.textContent = inventory.seeds;
        elements.stoneCount.textContent = inventory.stones;
        
        elements.quickStartButtons.innerHTML = '';
        if (data.focusLists && data.focusLists.length > 0) {
            data.focusLists.forEach(list => {
                const button = document.createElement('button');
                button.className = 'quick-start-btn';
                button.dataset.listId = list.id;
                button.innerHTML = `${list.name.split('(')[0].trim()} <span>${list.focusTime} min</span>`;
                elements.quickStartButtons.appendChild(button);
            });
        } else {
            elements.quickStartButtons.innerHTML = '<p style="font-size: 12px; color: var(--text-tertiary);">Crie sua primeira lista nas configurações!</p>';
        }
        if (data.dayIntention) elements.intentionInput.value = data.dayIntention;
    }

    // Event Listeners
    elements.settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });
    
    elements.statsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL('stats/stats.html') });
    });
    
    elements.gardenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL('garden/garden.html') });
    });
    
    elements.emergencyStopBtn.addEventListener('click', () => {
        if (confirm("Tem certeza? Você ganhará uma Pedra da Pausa.")) {
            chrome.runtime.sendMessage({ command: 'interruptFocus' });
        }
    });
    
    elements.finishSessionBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ command: 'finishSession' });
    });
    
    elements.startNextCycleBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ command: 'startNextSession', sessionData: completedSessionData });
    });
    
    elements.intentionInput.addEventListener('change', () => {
        chrome.storage.local.set({ dayIntention: elements.intentionInput.value });
    });

    elements.quickStartButtons.addEventListener('click', async (e) => {
        const button = e.target.closest('.quick-start-btn');
        if (!button) return;
        
        const listId = parseInt(button.dataset.listId, 10);
        const { focusLists } = await chrome.storage.local.get('focusLists');
        const list = focusLists.find(l => l.id === listId);
        
        if (list) {
            const optimisticState = {
                isActive: true,
                currentPhase: 'focus',
                listName: list.name,
                focusTime: list.focusTime,
                breakTime: list.breakTime,
                endTime: Date.now() + list.focusTime * 60 * 1000,
                startTime: Date.now()
            };
            render(optimisticState);
            chrome.runtime.sendMessage({ command: 'startFocus', listId: listId });
        }
    });

    elements.soundToggleBtn.addEventListener('click', () => {
        elements.soundList.style.display = elements.soundList.style.display === 'block' ? 'none' : 'block';
    });

    elements.soundList.addEventListener('click', (e) => {
        const button = e.target.closest('.sound-option');
        if (button) {
            elements.soundList.querySelectorAll('.sound-option').forEach(btn => btn.classList.remove('active'));
            const sound = button.dataset.sound;

            if (sound === 'stop') {
                chrome.runtime.sendMessage({ command: 'stopSound' });
            } else {
                chrome.runtime.sendMessage({ command: 'playSound', source: `assets/sounds/${sound}` });
            }
            button.classList.add('active');
            elements.soundList.style.display = 'none';
        }
    });

    // Initial Setup
    initializeHomePage();
    buildSoundList();
    chrome.runtime.sendMessage({ command: 'getState' });
});