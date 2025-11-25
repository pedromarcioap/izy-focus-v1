document.addEventListener('DOMContentLoaded', async () => {
    // --- Referências de Elementos ---
    const totalCyclesEl = document.getElementById('total-cycles');
    const mostUsedEl = document.getElementById('most-used');
    const totalInterruptionsEl = document.getElementById('total-interruptions');
    const detailedListContainer = document.getElementById('detailed-list-container');

    try {
        const { focusLog = [], interruptLog = [] } = await chrome.storage.local.get(['focusLog', 'interruptLog']);

        // --- Processamento de Dados ---
        const stats = {};

        focusLog.forEach(entry => {
            const listName = entry.listName || 'Desconhecido';
            if (!stats[listName]) {
                stats[listName] = { completions: 0, interruptions: 0 };
            }
            stats[listName].completions++;
        });

        interruptLog.forEach(entry => {
            const listName = entry.listName || 'Desconhecido';
            if (!stats[listName]) {
                stats[listName] = { completions: 0, interruptions: 0 };
            }
            stats[listName].interruptions++;
        });

        // --- Cálculos dos Destaques ---
        let mostUsed = { name: '--', count: 0 };
        for (const listName in stats) {
            const totalRuns = stats[listName].completions + stats[listName].interruptions;
            if (totalRuns > mostUsed.count) {
                mostUsed = { name: listName, count: totalRuns };
            }
        }

        // --- Renderização dos Destaques ---
        totalCyclesEl.textContent = focusLog.length;
        totalInterruptionsEl.textContent = interruptLog.length;
        mostUsedEl.textContent = mostUsed.name;

        // --- Renderização da Lista Detalhada ---
        detailedListContainer.innerHTML = '';
        const sortedLists = Object.entries(stats).sort((a, b) => (b[1].completions + b[1].interruptions) - (a[1].completions + a[1].interruptions));

        if (sortedLists.length === 0) {
            detailedListContainer.innerHTML = `<div class="empty-state"><p>Seus dados aparecerão aqui após você completar algumas sessões.</p></div>`;
        } else {
            sortedLists.forEach(([listName, data]) => {
                const item = document.createElement('div');
                item.className = 'stat-item';
                item.innerHTML = `
                    <span class="stat-item-name">${listName}</span>
                    <div class="stat-item-details">
                        <div class="metric">
                            <span class="metric-value">${data.completions}</span>
                            <span class="metric-label">Concluídos</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">${data.interruptions}</span>
                            <span class="metric-label">Interrompidos</span>
                        </div>
                    </div>
                `;
                detailedListContainer.appendChild(item);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        detailedListContainer.innerHTML = `<div class="empty-state"><p>Ocorreu um erro ao carregar seus dados.</p></div>`;
    }
});
