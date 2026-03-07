document.addEventListener('DOMContentLoaded', async () => {
    // --- i18n ---
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const msg = chrome.i18n.getMessage(el.dataset.i18n);
        if (msg) el.textContent = msg;
    });
    const titleMsg = chrome.i18n.getMessage('history_title');
    if (titleMsg) document.title = titleMsg;

    const logContainer = document.getElementById('history-log-container');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // --- FUNÇÃO PARA RENDERIZAR O HISTÓRICO ---
    async function renderHistory() {
        logContainer.innerHTML = ''; // Limpa o container antes de renderizar
        const { focusLog = [], breakLog = [], interruptLog = [] } = await chrome.storage.local.get(['focusLog', 'breakLog', 'interruptLog']);
        
        const mappedFocus = focusLog.map(entry => ({ type: 'focus', timestamp: entry.timestamp, data: entry }));
        const mappedBreaks = breakLog.map(entry => ({ type: 'break', timestamp: entry.timestamp, data: entry }));
        const mappedInterrupts = interruptLog.map(entry => ({ type: 'interrupt', timestamp: entry.timestamp, data: entry }));

        const fullLog = [...mappedFocus, ...mappedBreaks, ...mappedInterrupts].sort((a, b) => b.timestamp - a.timestamp);

        if (fullLog.length === 0) {
            logContainer.innerHTML = `<div class="empty-state"><p>${chrome.i18n.getMessage('history_empty_state')}</p></div>`;
            return;
        }

        fullLog.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.classList.add('log-item', `log-item--${item.type}`);
            let icon, title, time;
            const date = new Date(item.timestamp).toLocaleString(chrome.i18n.getUILanguage(), { dateStyle: 'short', timeStyle: 'short' });

            switch (item.type) {
                case 'focus':
                    icon = '🎯';
                    title = chrome.i18n.getMessage('history_focus_completed', [item.data.listName.split('(')[0].trim(), String(item.data.focusTime)]);
                    time = date;
                    break;
                case 'break':
                    icon = '☕';
                    title = chrome.i18n.getMessage('history_break_completed', [String(item.data.breakTime)]);
                    time = date;
                    break;
                case 'interrupt':
                    icon = '⚡';
                    title = chrome.i18n.getMessage('history_session_interrupted', [item.data.listName.split('(')[0].trim()]);
                    time = date;
                    break;
            }
            itemEl.innerHTML = `<div class="log-icon">${icon}</div><div class="log-details"><p class="log-title">${title}</p><p class="log-time">${time}</p></div>`;
            logContainer.appendChild(itemEl);
        });
    }

    // --- LÓGICA DO BOTÃO DE LIMPAR ---
    clearHistoryBtn.addEventListener('click', async () => {
        // Pede confirmação antes de apagar
        if (confirm(chrome.i18n.getMessage('history_confirm_clear'))) {
            // Define os logs como arrays vazios no armazenamento
            await chrome.storage.local.set({
                focusLog: [],
                breakLog: [],
                interruptLog: []
            });
            // Recarrega a página para mostrar o estado vazio
            renderHistory();
        }
    });

    // --- RENDERIZAÇÃO INICIAL ---
    renderHistory();
});