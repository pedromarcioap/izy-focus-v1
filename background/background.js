const STORAGE_KEYS = { TIMER_STATE: 'timerState', FOCUS_LISTS: 'focusLists', BLOCK_LISTS: 'blockLists', WHITELISTS: 'whitelists' };
const ALARM_NAME = 'izyFocusTimer';
const BLOCK_RULE_ID = 1;

// --- LÓGICA DE BLOQUEIO ---
async function synchronizeBlockingState() {
    const data = await chrome.storage.local.get([STORAGE_KEYS.TIMER_STATE, STORAGE_KEYS.BLOCK_LISTS, STORAGE_KEYS.WHITELISTS]);
    const { [STORAGE_KEYS.TIMER_STATE]: timerState, [STORAGE_KEYS.BLOCK_LISTS]: blockLists = [], [STORAGE_KEYS.WHITELISTS]: whitelists = [] } = data;

    // --- Condições para desativar o bloqueio ---
    if (!timerState || !timerState.isActive || timerState.currentPhase !== 'focus') {
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [BLOCK_RULE_ID] });
        return;
    }

    const { blockMode, associatedListId } = timerState;
    let newRule = null;

    if (blockMode === 'blocklist') {
        const list = blockLists.find(l => l.id === associatedListId);
        if (list && list.sites && list.sites.length > 0) {
            newRule = {
                id: BLOCK_RULE_ID,
                priority: 1,
                action: { type: 'redirect', redirect: { extensionPath: '/blocked/blocked.html' } },
                condition: { requestDomains: list.sites, resourceTypes: ['main_frame'] }
            };
        }
    } else if (blockMode === 'whitelist') {
        const list = whitelists.find(l => l.id === associatedListId);
        // Bloqueia tudo EXCETO os sites na whitelist
        if (list && list.sites && list.sites.length > 0) {
            newRule = {
                id: BLOCK_RULE_ID,
                priority: 1,
                action: { type: 'redirect', redirect: { extensionPath: '/blocked/blocked.html' } },
                condition: {
                    // Aplica a regra a todos os domínios...
                    requestDomains: ["*"],
                    // ...exceto os que estão na whitelist.
                    excludedRequestDomains: list.sites,
                    resourceTypes: ['main_frame']
                }
            };
        }
    }

    // --- Aplica a nova regra ou limpa as regras existentes ---
    if (newRule) {
        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [BLOCK_RULE_ID],
                addRules: [newRule]
            });
        } catch (error) {
            console.error("Erro ao atualizar as regras de bloqueio:", error);
            // Opcional: Tentar limpar as regras em caso de erro para não deixar o usuário bloqueado
            await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [BLOCK_RULE_ID] });
        }
    } else {
        // Se nenhuma regra for criada (ex: lista vazia), garante que as regras antigas sejam removidas
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [BLOCK_RULE_ID] });
    }
}

// --- INICIALIZAÇÃO E CICLO DE VIDA ---
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
    if (!timerState || !timerState.isActive || timerState.currentPhase !== 'focus') return;

    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (!tab.url || !tab.url.startsWith('http')) return; // Ignora URLs internas ou inválidas

        const data = await chrome.storage.local.get([STORAGE_KEYS.BLOCK_LISTS, STORAGE_KEYS.WHITELISTS]);
        const tabHostname = new URL(tab.url).hostname.replace(/^www\./, '');
        let shouldBlock = false;

        if (timerState.blockMode === 'whitelist') {
            const whitelists = data[STORAGE_KEYS.WHITELISTS] || [];
            const list = whitelists.find(l => l.id === timerState.associatedListId);
            const sitesToAllow = list ? list.sites : [];
            // Bloqueia se a whitelist estiver ativa e o site não estiver nela
            if (sitesToAllow.length > 0 && !sitesToAllow.includes(tabHostname)) {
                shouldBlock = true;
            }
        } else { // blocklist mode
            const blockLists = data[STORAGE_KEYS.BLOCK_LISTS] || [];
            const list = blockLists.find(l => l.id === timerState.associatedListId);
            const sitesToBlock = list ? list.sites : [];
            // Bloqueia se o site estiver na blocklist
            if (sitesToBlock.includes(tabHostname)) {
                shouldBlock = true;
            }
        }

        if (shouldBlock) {
            await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('blocked/blocked.html') });
        }
    } catch (error) {
        console.warn(`Não foi possível verificar a aba ativa: ${error.message}`);
    }
});

synchronizeBlockingState();
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(null, (result) => {
        if (!result.focusLists) {
            chrome.storage.local.set({
                focusLists: [{ id: 1, name: "Estudo Profundo", focusTime: 45, breakTime: 10, blockMode: 'blocklist', associatedListId: 1, seedType: 'Estudo' }],
                blockLists: [{ id: 1, name: "Redes Sociais", sites: ["facebook.com", "twitter.com", "instagram.com", "youtube.com", "x.com"] }],
                whitelists: [{ id: 1, name: "Ferramentas de Trabalho", sites: ["docs.google.com", "github.com"] }],
                nextListId: 2, nextBlockListId: 2, nextWhiteListId: 2,
                gardenInventory: {
                    seeds: { 'Estudo': 1 }, // Começa com 1 semente do tipo 'Estudo'
                    stones: 0
                },
                gardenLayout: [], // Layout agora é um array de objetos
                focusLog: [], interruptLog: [], breakLog: []
            });
        }
    });
});
chrome.runtime.onStartup.addListener(async () => {
    const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
    if (timerState && timerState.isActive) {
        const alarm = await chrome.alarms.get(ALARM_NAME);
        if (!alarm) await stopFocusSession(false);
    }
});

// --- OUVINTES DE MENSAGENS ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === 'startFocus') startFocusSession(request.listId);
    else if (request.command === 'interruptFocus') stopFocusSession(true);
    else if (request.command === 'startNextSession') {
        const { sessionData } = request;
        if (sessionData && sessionData.listId) {
            startFocusSession(sessionData.listId);
        }
    }
    else if (request.command === 'finishSession') {
        stopFocusSession(false);
    }
    else if (request.command === 'getState') sendStateToPopup();
    else if (request.command === 'playSound') {
        playAudioInBackground(request.source);
    }
    else if (request.command === 'stopSound') {
        stopAudioInBackground();
    }
    else if (request.command === 'applyGardenPenalty') {
        applyPenalty();
    }
    return true; 
});

async function applyPenalty() {
    const { gardenLayout = [] } = await chrome.storage.local.get('gardenLayout');

    // Encontra o índice da última planta que não está murcha
    let lastHealthyPlantIndex = -1;
    for (let i = gardenLayout.length - 1; i >= 0; i--) {
        if (gardenLayout[i].type === 'plant' && !gardenLayout[i].withered) {
            lastHealthyPlantIndex = i;
            break;
        }
    }

    if (lastHealthyPlantIndex !== -1) {
        gardenLayout[lastHealthyPlantIndex].withered = true;
        await chrome.storage.local.set({ gardenLayout });
        // Opcional: notificar o usuário sobre a penalidade
        createNotification("Distração Detectada", "Uma de suas plantas murchou por falta de foco.");
    }
}

async function sendStateToPopup() {
    try {
        const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
        await chrome.runtime.sendMessage({ command: 'updateState', state: timerState });
    } catch (error) { /* Ignora se popup fechado */ }
}

// --- LÓGICA DO TIMER E SESSÃO ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== ALARM_NAME) return;
    const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
    if (!timerState || !timerState.isActive) return;

    if (timerState.currentPhase === 'focus') {
        playNotificationSound('focus_complete.mp3');
        await startBreak(timerState);
    } else if (timerState.currentPhase === 'break') {
        await completeSession(timerState);
    }
});

async function completeSession(timerState) {
    playNotificationSound('break_complete.mp3');
    await logBreakCompletion(timerState);
    await chrome.alarms.clear(ALARM_NAME);
    await processCompletedSession(timerState);
    const completedState = { ...timerState, currentPhase: 'completed' };
    await chrome.storage.local.set({ [STORAGE_KEYS.TIMER_STATE]: completedState });
    sendStateToPopup();
}

async function startFocusSession(listId) {
    const { focusLists } = await chrome.storage.local.get('focusLists');
    const list = focusLists.find(l => l.id == listId);
    if (!list) return;

    const endTime = Date.now() + list.focusTime * 60 * 1000;
    const newState = {
        isActive: true, listId: list.id, listName: list.name,
        focusTime: list.focusTime, breakTime: list.breakTime,
        blockMode: list.blockMode, associatedListId: list.associatedListId,
        seedType: list.seedType || 'Padrao', // Adiciona o tipo de semente ao estado
        endTime, currentPhase: 'focus', startTime: Date.now()
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.TIMER_STATE]: newState });
    chrome.alarms.create(ALARM_NAME, { when: endTime });
    await synchronizeBlockingState();
    sendStateToPopup();
}

async function startBreak(prevState) {
    const endTime = Date.now() + prevState.breakTime * 60 * 1000;
    const breakState = { ...prevState, endTime, currentPhase: 'break' };
    await chrome.storage.local.set({ [STORAGE_KEYS.TIMER_STATE]: breakState });
    chrome.alarms.create(ALARM_NAME, { when: endTime });
    await synchronizeBlockingState();
    sendStateToPopup();
    createNotification('Hora da Pausa!', `Bom trabalho! Descanse por ${prevState.breakTime} minutos.`);
}

async function stopFocusSession(wasInterrupted) {
    if (wasInterrupted) {
        const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
        if (timerState && timerState.isActive) await logInterruption(timerState);
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.TIMER_STATE]: { isActive: false } });
    await synchronizeBlockingState();
    await stopAudioInBackground();
    await closeOffscreenDocument();
    chrome.alarms.clear(ALARM_NAME);
    sendStateToPopup();
}

// --- LÓGICA DE GAMIFICAÇÃO E LOGS ---
const GROWTH_STAGES = 3; // Total de estágios de crescimento (0, 1, 2)

async function processCompletedSession(sessionData) {
    const data = await chrome.storage.local.get(['focusLog', 'gardenInventory', 'gardenLayout']);
    const newLogEntry = { id: Date.now(), timestamp: Date.now(), listName: sessionData.listName, focusTime: sessionData.focusTime };
    const updatedFocusLog = [...(data.focusLog || []), newLogEntry];

    // 1. Lógica de recompensa (ganhar semente)
    const updatedInventory = data.gardenInventory || { seeds: {}, stones: 0 };
    const seedType = sessionData.seedType || 'Padrao';
    if (!updatedInventory.seeds[seedType]) {
        updatedInventory.seeds[seedType] = 0;
    }
    updatedInventory.seeds[seedType]++;

    // 2. Lógica de crescimento das plantas
    const updatedLayout = (data.gardenLayout || []).map(plant => {
        if (plant.type === 'plant' && !plant.withered && plant.growthStage < GROWTH_STAGES - 1) {
            plant.growthStage = (plant.growthStage || 0) + 1;
        }
        return plant;
    });

    await chrome.storage.local.set({
        focusLog: updatedFocusLog,
        gardenInventory: updatedInventory,
        gardenLayout: updatedLayout
    });

    createNotification(`Ciclo Concluído!`, `Você ganhou 1 Semente de ${seedType} e suas plantas cresceram! 🌱`);
}

async function logInterruption(sessionData) {
    const data = await chrome.storage.local.get(['interruptLog', 'gardenInventory']);
    const interruptLog = data.interruptLog || [];
    const newEntry = { timestamp: Date.now(), listName: sessionData.listName };

    // Garante que o inventário seja inicializado corretamente se não existir
    const updatedInventory = data.gardenInventory || { seeds: {}, stones: 0 };
    if (typeof updatedInventory.seeds !== 'object') {
        updatedInventory.seeds = {}; // Previne erro se 'seeds' não for um objeto
    }
    updatedInventory.stones = (updatedInventory.stones || 0) + 1;

    await chrome.storage.local.set({ interruptLog: [...interruptLog, newEntry], gardenInventory: updatedInventory });
    createNotification(`Ciclo Interrompido.`, `Você ganhou 1 Pedra 🪨.`);
}

async function logBreakCompletion(sessionData) {
    const { breakLog = [] } = await chrome.storage.local.get('breakLog');
    const newEntry = { timestamp: Date.now(), breakTime: sessionData.breakTime };
    await chrome.storage.local.set({ breakLog: [...breakLog, newEntry] });
}

// --- UTILITÁRIOS DE ÁUDIO ---
async function playAudioInBackground(source) {
    await setupOffscreenDocument('offscreen.html');
    await chrome.runtime.sendMessage({ command: 'offscreenPlay', source: source });
}
async function stopAudioInBackground() {
    if (await hasOffscreenDocument()) {
        await chrome.runtime.sendMessage({ command: 'offscreenStop' });
    }
}
async function playNotificationSound(file) {
    await setupOffscreenDocument('offscreen.html');
    await chrome.runtime.sendMessage({ command: 'offscreenPlayNotification', source: `assets/sounds/${file}` });
}
let creatingOffscreen;
async function hasOffscreenDocument() {
    if (chrome.runtime.getContexts) {
        const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
        return contexts.length > 0;
    }
    return false;
}
async function setupOffscreenDocument(path) {
    if (!chrome.offscreen) return;
    if (await hasOffscreenDocument()) return;
    if (creatingOffscreen) { await creatingOffscreen; return; }
    creatingOffscreen = chrome.offscreen.createDocument({ url: path, reasons: ['AUDIO_PLAYBACK'], justification: 'Tocar sons de notificação.' });
    await creatingOffscreen;
    creatingOffscreen = null;
}
async function closeOffscreenDocument() {
    if (!chrome.offscreen) return;
    if (await hasOffscreenDocument()) {
        await chrome.offscreen.closeDocument();
    }
}
function createNotification(title, message) {
    chrome.notifications.create({ type: 'basic', iconUrl: '/assets/icons/icon128.png', title, message });
}