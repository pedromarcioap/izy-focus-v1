document.addEventListener('DOMContentLoaded', () => {
    // --- Referências de Elementos ---
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
    const finishSessionBtn = document.getElementById('finish-session-btn');
    const startNextCycleBtn = document.getElementById('start-next-cycle-btn');
    const timerDisplay = document.getElementById('timer-display');
    const currentTaskLabel = document.getElementById('current-task-label');
    
    let timerInterval = null;
    let completedSessionData = null;

    // --- Lógica de Renderização ---
    function render(state) {
        clearInterval(timerInterval);
        
        homeContainer.style.display = 'none';
        timerWrapper.style.display = 'none';
        completedWrapper.style.display = 'none';

        if (!state || !state.isActive) {
            homeContainer.style.display = 'flex';
            initializeHomePage();
        } else {
            if (state.currentPhase === 'completed') {
                completedWrapper.style.display = 'block';
                completedSessionData = state;
            } else { 
                timerWrapper.style.display = 'flex';
                const isFocus = state.currentPhase === 'focus';

                const updateDisplay = () => {
                    const remainingTime = state.endTime - Date.now();
                    if (remainingTime < 0) {
                        clearInterval(timerInterval);
                        if (chrome && chrome.runtime) {
                            chrome.runtime.sendMessage({ command: 'getState' });
                        }
                        return;
                    }
                    const minutes = Math.floor(remainingTime / 60000);
                    const seconds = Math.floor((remainingTime % 60000) / 1000);
                    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                    currentTaskLabel.textContent = isFocus ? state.listName : "Tempo de pausa";
                };

                updateDisplay();
                timerInterval = setInterval(updateDisplay, 1000);
            }
        }
    }

    // --- Carregamento e Comunicação ---
    async function initializeApp() {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            console.log("API do Chrome não disponível. Renderizando com dados mocados.");
            initializeHomePage({ focusLists: [{id: 1, name: "Teste", focusTime: 25}], gardenInventory: { seeds: { 'Teste': 10 }, stones: 5 } });
            return;
        }

        chrome.runtime.onMessage.addListener((request) => {
            if (request.command === 'updateState') {
                render(request.state);
            }
        });

        await initializeHomePage();
        chrome.runtime.sendMessage({ command: 'getState' });
    }

    async function initializeHomePage(mockData = null) {
        const data = mockData || await chrome.storage.local.get(['focusLists', 'dayIntention', 'gardenInventory']);
        const inventory = data.gardenInventory || { seeds: {}, stones: 0 };

        const totalSeeds = Object.values(inventory.seeds || {}).reduce((sum, count) => sum + count, 0);
        seedCountDisplay.textContent = totalSeeds;
        stoneCountDisplay.textContent = inventory.stones || 0;
        
        quickStartButtonsContainer.innerHTML = '';
        if (data.focusLists && data.focusLists.length > 0) {
            data.focusLists.forEach(list => {
                const button = document.createElement('button');
                button.className = 'quick-start-btn';
                button.dataset.listId = list.id;
                button.innerHTML = `${list.name} <span>${list.focusTime} min</span>`;
                quickStartButtonsContainer.appendChild(button);
            });
        } else {
            quickStartButtonsContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px;">Crie uma lista nas configurações.</p>';
        }

        if (data.dayIntention) {
            intentionInput.value = data.dayIntention;
        }
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
        statsBtn.addEventListener('click', () => chrome.tabs.create({ url: 'stats/stats.html' }));
        gardenBtn.addEventListener('click', () => chrome.tabs.create({ url: 'garden/garden.html' }));

        emergencyStopBtn.addEventListener('click', () => {
            if (confirm("Tem certeza que deseja interromper?")) {
                chrome.runtime.sendMessage({ command: 'interruptFocus' });
            }
        });

        finishSessionBtn.addEventListener('click', () => chrome.runtime.sendMessage({ command: 'finishSession' }));
        startNextCycleBtn.addEventListener('click', () => chrome.runtime.sendMessage({ command: 'startNextSession', sessionData: completedSessionData }));
        intentionInput.addEventListener('change', () => chrome.storage.local.set({ dayIntention: intentionInput.value }));

        quickStartButtonsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.quick-start-btn');
            if (button) {
                chrome.runtime.sendMessage({ command: 'startFocus', listId: parseInt(button.dataset.listId) });
            }
        });
    }

    // --- Inicialização ---
    setupEventListeners();
    initializeApp();
});
