document.addEventListener('DOMContentLoaded', () => {
    // --- Referências de Elementos ---
    const appContainer = document.getElementById('app');
    const mainHeaderTitle = document.getElementById('main-header-title');
    const settingsBtn = document.getElementById('settings-btn');
    const statsBtn = document.getElementById('stats-btn');
    const gardenBtn = document.getElementById('garden-btn');
    const emergencyStopBtn = document.getElementById('emergency-stop-btn');
    const quickStartButtonsContainer = document.getElementById('quick-start-buttons');
    const seedCountDisplay = document.getElementById('seed-count');
    const stoneCountDisplay = document.getElementById('stone-count');
    const intentionInput = document.getElementById('intention-input');
    const homeContainer = document.getElementById('home-container');
    const timerWrapper = document.getElementById('timer-wrapper');
    const completedWrapper = document.getElementById('completed-wrapper');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const soundList = document.getElementById('sound-list');
    const finishSessionBtn = document.getElementById('finish-session-btn');
    const startNextCycleBtn = document.getElementById('start-next-cycle-btn');
    const timerDisplay = document.getElementById('timer-display');
    const currentTaskLabel = document.getElementById('current-task-label');
    const plantContainer = document.getElementById('plant-container');
    const plantLeaves = document.querySelectorAll('#growing-plant .leaf');
    
    let focusRingBar, radius, circumference;
    let timerInterval = null, completedSessionData = null;

    // --- LÓGICA DE ÁUDIO ---
    const SOUNDS = [
        { file: 'rain.mp3', name: 'Chuva', emoji: '🌧️' },
        { file: 'forest.mp3', name: 'Floresta', emoji: '🌳' }
    ];

    function buildSoundList() {
        soundList.innerHTML = ''; 
        const stopOption = document.createElement('button');
        stopOption.className = 'sound-option active';
        stopOption.dataset.sound = 'stop';
        stopOption.innerHTML = '🔇 Silêncio';
        soundList.appendChild(stopOption);
        SOUNDS.forEach(sound => {
            const option = document.createElement('button');
            option.className = 'sound-option';
            option.dataset.sound = sound.file;
            option.innerHTML = `${sound.emoji} ${sound.name}`;
            soundList.appendChild(option);
        });
    }

    // --- Lógica de Renderização ---
    function render(state) {
        clearInterval(timerInterval);
        
        homeContainer.style.display = 'none';
        timerWrapper.style.display = 'none';
        completedWrapper.style.display = 'none';
        appContainer.classList.remove('session-active');

        if (!state || !state.isActive) {
            mainHeaderTitle.textContent = "Izy Focus";
            homeContainer.style.display = 'block';
            initializeHomePage();
        } else {
            appContainer.classList.add('session-active');
            
            if (state.currentPhase === 'completed') {
                mainHeaderTitle.textContent = "Ciclo Concluído!";
                completedWrapper.style.display = 'flex';
                completedSessionData = state;
            } else { 
                timerWrapper.style.display = 'flex';
                
                if (!focusRingBar) {
                    focusRingBar = timerWrapper.querySelector('.progress-ring__bar');
                    radius = focusRingBar.r.baseVal.value;
                    circumference = 2 * Math.PI * radius;
                    focusRingBar.style.strokeDasharray = `${circumference} ${circumference}`;
                }

                const isFocus = state.currentPhase === 'focus';
                mainHeaderTitle.textContent = isFocus ? "Em Foco" : "Pausa";
                focusRingBar.classList.toggle('break-bar', !isFocus);
                soundToggleBtn.style.display = isFocus ? 'flex' : 'none';
                if (!isFocus) soundList.style.display = 'none';
                const totalDuration = (isFocus ? state.focusTime : state.breakTime) * 60 * 1000;
                const updateDisplay = () => {
                    const remainingTime = state.endTime - Date.now();
                    if (remainingTime < 0) {
                        clearInterval(timerInterval);
                        chrome.runtime.sendMessage({ command: 'getState' }); return;
                    }
                    const minutes = Math.floor(remainingTime / 60000), seconds = Math.floor((remainingTime % 60000) / 1000);
                    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                    const progress = (totalDuration - remainingTime) / totalDuration;
                    focusRingBar.style.strokeDashoffset = circumference * (1 - progress);
                    if (isFocus) {
                        currentTaskLabel.textContent = state.listName;
                        updatePlant(progress);
                    } else {
                        currentTaskLabel.textContent = "Respire e alongue-se";
                        updatePlant(0);
                    }
                };
                updateDisplay();
                timerInterval = setInterval(updateDisplay, 1000);
            }
        }
    }

    function updatePlant(progress) {
        plantContainer.style.opacity = 0.5 + (progress * 0.5);
        const scale = progress * 1.2;
        plantLeaves.forEach(leaf => leaf.style.transform = `scale(${Math.min(1, scale)})`);
    }

    // --- Comunicação ---
    chrome.runtime.onMessage.addListener((request) => {
        if (request.command === 'updateState') render(request.state);
    });

    // --- Carregamento da Home ---
    async function initializeHomePage() {
        const data = await chrome.storage.local.get(['focusLists', 'dayIntention', 'gardenInventory']);
        const inventory = data.gardenInventory || { seeds: {}, stones: 0 };

        // Calcula o total de sementes somando as quantidades de cada tipo
        let totalSeeds = 0;
        if (typeof inventory.seeds === 'object' && inventory.seeds !== null) {
            totalSeeds = Object.values(inventory.seeds).reduce((sum, count) => sum + count, 0);
        }

        seedCountDisplay.textContent = totalSeeds;
        stoneCountDisplay.textContent = inventory.stones || 0;
        
        quickStartButtonsContainer.innerHTML = '';
        if (data.focusLists && data.focusLists.length > 0) {
            data.focusLists.forEach(list => {
                const button = document.createElement('button');
                button.className = 'quick-start-btn';
                button.dataset.listId = list.id;
                button.innerHTML = `${list.name.split('(')[0].trim()} <span>${list.focusTime} min</span>`;
                quickStartButtonsContainer.appendChild(button);
            });
        } else { quickStartButtonsContainer.innerHTML = '<p style="font-size: 12px; color: var(--neutral-gray-light);">Crie sua primeira lista nas configurações!</p>'; }
        if (data.dayIntention) intentionInput.value = data.dayIntention;
    }

    // --- Event Listeners ---
    settingsBtn.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
    statsBtn.addEventListener('click', (e) => { e.preventDefault(); chrome.tabs.create({ url: chrome.runtime.getURL('stats/stats.html') }); });
    gardenBtn.addEventListener('click', (e) => { e.preventDefault(); chrome.tabs.create({ url: chrome.runtime.getURL('garden/garden.html') }); });
    emergencyStopBtn.addEventListener('click', () => { if (confirm("Tem certeza? Você ganhará uma Pedra da Pausa.")) chrome.runtime.sendMessage({ command: 'interruptFocus' }); });
    finishSessionBtn.addEventListener('click', () => { chrome.runtime.sendMessage({ command: 'finishSession' }); });
    startNextCycleBtn.addEventListener('click', () => { chrome.runtime.sendMessage({ command: 'startNextSession', sessionData: completedSessionData }); });
    intentionInput.addEventListener('change', () => { chrome.storage.local.set({ dayIntention: intentionInput.value }); });
    
    quickStartButtonsContainer.addEventListener('click', async (e) => {
        const button = e.target.closest('.quick-start-btn');
        if (!button) return;
        const listId = parseInt(button.dataset.listId, 10);
        const { focusLists } = await chrome.storage.local.get('focusLists');
        const list = focusLists.find(l => l.id === listId);
        if (list) {
            const optimisticState = { isActive: true, currentPhase: 'focus', listName: list.name, focusTime: list.focusTime, breakTime: list.breakTime, endTime: Date.now() + list.focusTime * 60 * 1000, startTime: Date.now() };
            render(optimisticState);
            chrome.runtime.sendMessage({ command: 'startFocus', listId: listId });
        }
    });

    soundToggleBtn.addEventListener('click', () => {
        soundList.style.display = soundList.style.display === 'block' ? 'none' : 'block';
    });

    soundList.addEventListener('click', (e) => {
        const button = e.target.closest('.sound-option');
        if (button) {
            soundList.querySelectorAll('.sound-option').forEach(btn => btn.classList.remove('active'));
            const sound = button.dataset.sound;
            
            if (sound === 'stop') {
                chrome.runtime.sendMessage({ command: 'stopSound' });
            } else {
                chrome.runtime.sendMessage({ command: 'playSound', source: `assets/sounds/${sound}` });
            }
            button.classList.add('active');
            soundList.style.display = 'none';
        }
    });

    // --- Chamada Inicial ---
    initializeHomePage();
    buildSoundList();
    chrome.runtime.sendMessage({ command: 'getState' });
});