document.addEventListener('DOMContentLoaded', async () => {
    const totalCyclesEl = document.getElementById('total-cycles');
    const mostUsedEl = document.getElementById('most-used');
    const mostEffectiveEl = document.getElementById('most-effective');
    const detailedListContainer = document.getElementById('detailed-list-container');

    // Carrega TODOS os logs necessários para os cálculos
    const { focusLog = [], interruptLog = [] } = await chrome.storage.local.get(['focusLog', 'interruptLog']);
    
    // --- Processar Dados ---
    const stats = {};

    // Contabiliza as conclusões a partir do focusLog
    focusLog.forEach(entry => {
        if (!stats[entry.listName]) {
            stats[entry.listName] = { completions: 0, interruptions: 0 };
        }
        stats[entry.listName].completions++;
    });

    // Contabiliza as interrupções a partir do interruptLog
    interruptLog.forEach(entry => {
        if (!stats[entry.listName]) {
            stats[entry.listName] = { completions: 0, interruptions: 0 };
        }
        stats[entry.listName].interruptions++;
    });

    // --- Calcular Insights ---
    let totalCompletions = focusLog.length; // CORREÇÃO: Total de ciclos é simplesmente o tamanho do focusLog
    let mostUsed = { name: '--', count: 0 };
    let mostEffective = { name: '--', rate: -1 };

    for (const listName in stats) {
        const data = stats[listName];
        const totalRuns = data.completions + data.interruptions;
        const completionRate = totalRuns > 0 ? (data.completions / totalRuns) * 100 : 0;
        
        // Armazena a taxa de conclusão para uso posterior
        stats[listName].completionRate = completionRate;

        if (totalRuns > mostUsed.count) {
            mostUsed = { name: listName, count: totalRuns };
        }
        // Apenas considera "mais eficaz" se tiver sido executado pelo menos uma vez
        if (completionRate > mostEffective.rate && totalRuns > 0) {
            mostEffective = { name: listName, rate: completionRate };
        }
    }

    // --- Renderizar Highlights ---
    totalCyclesEl.textContent = totalCompletions;
    mostUsedEl.textContent = mostUsed.name.split('(')[0].trim();
    mostEffectiveEl.textContent = mostEffective.name.split('(')[0].trim();

    // --- Renderizar Lista Detalhada ---
    detailedListContainer.innerHTML = '';
    const sortedLists = Object.entries(stats).sort((a, b) => (b[1].completions + b[1].interruptions) - (a[1].completions + a[1].interruptions));
    
    if (sortedLists.length === 0) {
        detailedListContainer.innerHTML = `<div class="empty-state"><p>Seu progresso aparecerá aqui.<br>Complete seu primeiro ciclo de foco para começar!</p></div>`;
    } else {
        sortedLists.forEach(([listName, data]) => {
            const item = document.createElement('div');
            item.className = 'stat-item';
            const completionRateFormatted = data.completionRate.toFixed(0);
            item.innerHTML = `
                <div class="stat-item-info">
                    <div class="stat-item-name">${listName.split('(')[0].trim()}</div>
                    <div class="stat-item-progress">
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${completionRateFormatted}%"></div>
                        </div>
                        <div class="progress-label">${completionRateFormatted}% de Taxa de Conclusão</div>
                    </div>
                </div>
                <div class="stat-item-metrics">
                    <div class="metric">
                        <div class="metric-label">Concluídos</div>
                        <div class="metric-value">${data.completions}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Interrompidos</div>
                        <div class="metric-value">${data.interruptions}</div>
                    </div>
                </div>
            `;
            detailedListContainer.appendChild(item);
        });
    }
});