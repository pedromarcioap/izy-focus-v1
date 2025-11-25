document.addEventListener('DOMContentLoaded', () => {
    // --- Referências de Elementos ---
    const appContainer = document.getElementById('app');
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
        
        // Esconde todas as seções principais por padrão
        homeContainer.style.display = 'none';
        timerWrapper.style.display = 'none';
        completedWrapper.style.display = 'none';

        if (!state || !state.isActive) {
            // Estado inicial ou sessão finalizada
            homeContainer.style.display = 'flex';
            initializeHomePage();
        } else {
            if (state.currentPhase === 'completed') {
                // Tela de ciclo concluído
                completedWrapper.style.display = 'block';
                completedSessionData = state;
            } else { 
                // Tela do timer (foco ou pausa)
                timerWrapper.style.display = 'flex';
                const isFocus = state.currentPhase === 'focus';

                const updateDisplay = () => {
                    const remainingTime = state.endTime - Date.now();
                    if (remainingTime < 0) {
                        clearInterval(timerInterval);
                        chrome.runtime.sendMessage({ command: 'getState' });
                        return;
                    }
                    const minutes = Math.floor(remainingTime / 60000);
                    const seconds = Math.floor((remainingTime % 60000) / 1000);
                    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                    if (isFocus) {
                        currentTaskLabel.textContent = state.listName;
                    } else {
                        currentTaskLabel.textContent = "Tempo de pausa";
                    }
                };
                updateDisplay();
                timerInterval = setInterval(updateDisplay, 1000);
            }
        }
    }

    // --- Comunicação com o Background ---
    chrome.runtime.onMessage.addListener((request) => {
        if (request.command === 'updateState') {
            render(request.state);
        }
    });

    // --- Carregamento da Home ---
    async function initializeHomePage() {
        try {
            const data = await chrome.storage.local.get(['focusLists', 'dayIntention', 'gardenInventory']);
            const inventory = data.gardenInventory || { seeds: {}, stones: 0 };

            // Soma todas as sementes
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
                quickStartButtonsContainer.innerHTML = '<p class="empty-state">Crie sua primeira lista nas configurações!</p>';
            }

            if (data.dayIntention) {
                intentionInput.value = data.dayIntention;
            }
        } catch (error) {
            console.error("Erro ao inicializar a página inicial:", error);
        }
    }

    // --- Event Listeners ---
    settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    statsBtn.addEventListener('click', () => chrome.tabs.create({ url: 'stats/stats.html' }));
    gardenBtn.addEventListener('click', () => chrome.tabs.create({ url: 'garden/garden.html' }));

    emergencyStopBtn.addEventListener('click', () => {
        if (confirm("Tem certeza que deseja interromper?")) {
            chrome.runtime.sendMessage({ command: 'interruptFocus' });
        }
    });

    finishSessionBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ command: 'finishSession' });
    });

    startNextCycleBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ command: 'startNextSession', sessionData: completedSessionData });
    });

    intentionInput.addEventListener('change', () => {
        chrome.storage.local.set({ dayIntention: intentionInput.value });
    });

    quickStartButtonsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.quick-start-btn');
        if (button) {
            const listId = parseInt(button.dataset.listId, 10);
            chrome.runtime.sendMessage({ command: 'startFocus', listId: listId });
        }
    });

    // --- Chamada Inicial ---
    initializeHomePage();
    chrome.runtime.sendMessage({ command: 'getState' });
});
