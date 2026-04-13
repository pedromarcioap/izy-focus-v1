document.addEventListener('DOMContentLoaded', async () => {
    localizeHtmlPage();
    await loadDarkMode();
    setupEventListeners();
    await renderHistory();
    await loadStats();
    await loadFilterOptions();

    function localizeHtmlPage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const msg = chrome.i18n.getMessage(el.dataset.i18n);
            if (msg) el.textContent = msg;
        });
        const titleMsg = chrome.i18n.getMessage('history_title');
        if (titleMsg) document.title = titleMsg;
    }

    async function loadDarkMode() {
        try {
            const data = await chrome.storage.local.get('darkMode');
            if (data.darkMode) {
                document.documentElement.classList.add('dark');
            }
        } catch (e) {
            console.warn('[IzyFocus] Failed to load dark mode:', e);
        }
    }

    function setupEventListeners() {
        const darkModeBtn = document.getElementById('dark-mode-btn');
        darkModeBtn?.addEventListener('click', async () => {
            const isDark = document.documentElement.classList.toggle('dark');
            await chrome.storage.local.set({ darkMode: isDark });
        });

        const exportCsvBtn = document.getElementById('export-csv-btn');
        exportCsvBtn?.addEventListener('click', exportToCSV);

        const filterList = document.getElementById('filter-list');
        const filterPeriod = document.getElementById('filter-period');
        
        filterList?.addEventListener('change', renderHistory);
        filterPeriod?.addEventListener('change', renderHistory);
    }

    async function loadStats() {
        const { focusLog = [], interruptLog = [] } = await chrome.storage.local.get(['focusLog', 'interruptLog']);

        const totalMinutes = focusLog.reduce((sum, entry) => sum + (entry.focusTime || 0), 0);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        document.getElementById('total-time').textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        document.getElementById('total-sessions').textContent = focusLog.length;

        const totalAttempts = focusLog.length + interruptLog.length;
        const rate = totalAttempts > 0 ? Math.round((focusLog.length / totalAttempts) * 100) : 0;
        document.getElementById('completion-rate').textContent = `${rate}%`;
    }

    async function loadFilterOptions() {
        const { focusLists = [] } = await chrome.storage.local.get('focusLists');
        const filterList = document.getElementById('filter-list');
        
        focusLists.forEach(list => {
            const option = document.createElement('option');
            option.value = list.name;
            option.textContent = list.name;
            filterList.appendChild(option);
        });
    }

    async function renderHistory() {
        const logContainer = document.getElementById('history-log-container');
        const filterList = document.getElementById('filter-list')?.value || 'all';
        const filterPeriod = document.getElementById('filter-period')?.value || 'all';

        const { focusLog = [], breakLog = [], interruptLog = [] } = await chrome.storage.local.get(['focusLog', 'breakLog', 'interruptLog']);

        const mappedFocus = focusLog.map(entry => ({ type: 'focus', timestamp: entry.timestamp, data: entry }));
        const mappedBreaks = breakLog.map(entry => ({ type: 'break', timestamp: entry.timestamp, data: entry }));
        const mappedInterrupts = interruptLog.map(entry => ({ type: 'interrupt', timestamp: entry.timestamp, data: entry }));

        let fullLog = [...mappedFocus, ...mappedBreaks, ...mappedInterrupts].sort((a, b) => b.timestamp - a.timestamp);

        if (filterList !== 'all') {
            fullLog = fullLog.filter(item => item.data.listName === filterList);
        }

        const now = new Date();
        fullLog = fullLog.filter(item => {
            const itemDate = new Date(item.timestamp);
            switch (filterPeriod) {
                case 'today':
                    return itemDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                    return itemDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
                    return itemDate >= monthAgo;
                default:
                    return true;
            }
        });

        const filteredMinutes = fullLog
            .filter(item => item.type === 'focus')
            .reduce((sum, item) => sum + (item.data.focusTime || 0), 0);
        const filteredHours = Math.floor(filteredMinutes / 60);
        const filteredMins = filteredMinutes % 60;
        const filteredTimeEl = document.getElementById('filtered-time');
        if (filteredTimeEl) {
            filteredTimeEl.textContent = filteredHours > 0 ? `${filteredHours}h ${filteredMins}m` : `${filteredMins}m`;
        }

        logContainer.innerHTML = '';

        if (fullLog.length === 0) {
            logContainer.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p>Nenhum registro encontrado.</p>
                </div>
            `;
            return;
        }

        const groupedByDate = {};
        fullLog.forEach(item => {
            const date = new Date(item.timestamp);
            const dateKey = date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(item);
        });

        for (const [dateKey, items] of Object.entries(groupedByDate)) {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            dateGroup.innerHTML = `<div class="date-header">${dateKey}</div>`;

            items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'log-item';

                let iconSvg, title, status, duration;

                if (item.type === 'focus') {
                    itemEl.classList.add('log-item--focus');
                    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
                    title = item.data.listName;
                    duration = `${item.data.focusTime} min`;
                    status = 'Concluído';
                } else if (item.type === 'break') {
                    itemEl.classList.add('log-item--break');
                    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>`;
                    title = 'Pausa';
                    duration = `${item.data.breakTime} min`;
                    status = 'Concluída';
                } else if (item.type === 'interrupt') {
                    itemEl.classList.add('log-item--interrupt');
                    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10"/></svg>`;
                    title = item.data.listName;
                    duration = '-';
                    status = 'Interrompido';
                }

                const time = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                itemEl.innerHTML = `
                    <div class="log-icon">${iconSvg}</div>
                    <div class="log-details">
                        <p class="log-title"><strong>${title}</strong></p>
                        <div class="log-meta">
                            <span>${time}</span>
                            <span>${duration}</span>
                            <span class="log-status ${status === 'Interrompido' ? 'interrupted' : 'completed'}">${status}</span>
                        </div>
                    </div>
                `;

                dateGroup.appendChild(itemEl);
            });

            logContainer.appendChild(dateGroup);
        }
    }

    async function exportToCSV() {
        const { focusLog = [], interruptLog = [] } = await chrome.storage.local.get(['focusLog', 'interruptLog']);

        let csv = 'Data,Hora,Lista,Tipo,Duração,Status\n';

        const allLogs = [...focusLog, ...interruptLog].sort((a, b) => b.timestamp - a.timestamp);

        allLogs.forEach(entry => {
            const date = new Date(entry.timestamp);
            const dateStr = date.toLocaleDateString('pt-BR');
            const timeStr = date.toLocaleTimeString('pt-BR');
            const listName = entry.listName || 'N/A';
            const duration = entry.focusTime || entry.breakTime || '-';
            const isInterrupt = entry.hasOwnProperty('interrupt');
            
            csv += `${dateStr},${timeStr},${listName},Foco,${duration},${isInterrupt ? 'Interrompido' : 'Concluído'}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `izy-focus-historico-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
});
