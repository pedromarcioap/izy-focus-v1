document.addEventListener('DOMContentLoaded', () => {
    const gardenGrid = document.getElementById('garden-grid');
    const seedCountEl = document.getElementById('seed-count');
    const stoneCountEl = document.getElementById('stone-count');
    const toolSelect = document.getElementById('tool-select');
    const toolSeed = document.getElementById('tool-seed');
    const toolStone = document.getElementById('tool-stone');
    const resetGardenBtn = document.getElementById('reset-garden-btn');

    let inventory = { seeds: 0, stones: 0 };
    let gardenLayout = {};
    let activeTool = 'select'; 
    const gridSize = 100; 

    async function initializeGarden() {
        const data = await chrome.storage.local.get(['gardenInventory', 'gardenLayout']);
        // Correção de segurança: garante que inventory existe
        inventory = data.gardenInventory || { seeds: 0, stones: 0 };
        gardenLayout = data.gardenLayout || {};
        render();
    }

    function render() {
        seedCountEl.textContent = inventory.seeds;
        stoneCountEl.textContent = inventory.stones;
        toolSeed.classList.toggle('disabled', inventory.seeds === 0);
        toolStone.classList.toggle('disabled', inventory.stones === 0);

        gardenGrid.innerHTML = '';
        for (let i = 0; i < gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'garden-cell';
            cell.dataset.id = i;
            const content = document.createElement('div');
            content.className = 'content';
            
            if (gardenLayout[i] === 'tree') {
                content.textContent = '🌳';
            } else if (gardenLayout[i] === 'stone') {
                // Usar o SVG da pedra em vez do emoji
                const img = document.createElement('img');
                img.src = '/assets/icons/stone.svg';
                img.style.width = '32px';
                img.style.height = '32px';
                content.appendChild(img);
            }
            
            if (gardenLayout[i] !== 'stone') cell.appendChild(content);
            else cell.appendChild(content); // (Redundante, mas mantém lógica)
            
            gardenGrid.appendChild(cell);
        }
    }

    function setActiveTool(tool) {
        if (tool === 'seed' && inventory.seeds === 0) return;
        if (tool === 'stone' && inventory.stones === 0) return;
        activeTool = tool;
        document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`tool-${tool}`).classList.add('active');
    }

    toolSelect.addEventListener('click', () => setActiveTool('select'));
    toolSeed.addEventListener('click', () => setActiveTool('seed'));
    toolStone.addEventListener('click', () => setActiveTool('stone'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setActiveTool('select'); });

    gardenGrid.addEventListener('click', async (e) => {
        const cell = e.target.closest('.garden-cell');
        if (!cell) return;
        const cellId = cell.dataset.id;
        let changed = false;

        if (activeTool === 'seed' && inventory.seeds > 0 && !gardenLayout[cellId]) {
            gardenLayout[cellId] = 'tree'; inventory.seeds--; changed = true;
        } else if (activeTool === 'stone' && inventory.stones > 0 && !gardenLayout[cellId]) {
            gardenLayout[cellId] = 'stone'; inventory.stones--; changed = true;
        } else if (activeTool === 'select' && gardenLayout[cellId]) {
            if (gardenLayout[cellId] === 'tree') inventory.seeds++;
            else if (gardenLayout[cellId] === 'stone') inventory.stones++;
            delete gardenLayout[cellId]; changed = true;
        }
        
        if (changed) {
            await chrome.storage.local.set({ gardenLayout, gardenInventory: inventory });
            render();
            if (activeTool !== 'select') setActiveTool('select');
        }
    });

    resetGardenBtn.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja limpar seu jardim?')) {
            let seedsInGarden = 0; let stonesInGarden = 0;
            for (const id in gardenLayout) {
                if (gardenLayout[id] === 'tree') seedsInGarden++;
                if (gardenLayout[id] === 'stone') stonesInGarden++;
            }
            inventory.seeds += seedsInGarden; inventory.stones += stonesInGarden;
            gardenLayout = {};
            await chrome.storage.local.set({ gardenLayout, gardenInventory: inventory });
            render();
        }
    });

    initializeGarden();
});