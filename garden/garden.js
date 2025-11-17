document.addEventListener('DOMContentLoaded', () => {
    const gardenGrid = document.getElementById('garden-grid');
    const seedsList = document.getElementById('seeds-list');
    const stoneCountDisplay = document.getElementById('stone-count');
    const GRID_SIZE = 8;

    let gardenData = { layout: [], inventory: { seeds: {}, stones: 0 } };
    let draggedItem = null;

    // --- INICIALIZAÇÃO ---
    async function initGarden() {
        await loadData();
        renderGarden();
        renderInventory();
    }

    async function loadData() {
        const data = await chrome.storage.local.get(['gardenLayout', 'gardenInventory']);
        gardenData.layout = data.gardenLayout || [];
        gardenData.inventory = data.gardenInventory || { seeds: {}, stones: 0 };
    }

    async function saveData() {
        await chrome.storage.local.set({
            gardenLayout: gardenData.layout,
            gardenInventory: gardenData.inventory
        });
    }

    // --- RENDERIZAÇÃO ---
    function renderGarden() {
        gardenGrid.innerHTML = '';
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.classList.add('garden-cell');
            cell.dataset.index = i;

            const plantedItem = gardenData.layout.find(p => p.position === i);
            if (plantedItem) {
                const itemElement = document.createElement('div');
                itemElement.classList.add(plantedItem.type); // 'plant' or 'stone'
                // Aqui, em uma versão futura, podemos adicionar diferentes estágios de crescimento
                itemElement.style.backgroundImage = `url('../assets/icons/${plantedItem.seedType || 'Padrao'}_plant.png')`;
                cell.appendChild(itemElement);
            }
            
            addDropEvents(cell);
            gardenGrid.appendChild(cell);
        }
    }

    function renderInventory() {
        seedsList.innerHTML = '';
        for (const [seedType, count] of Object.entries(gardenData.inventory.seeds)) {
            if (count > 0) {
                const li = document.createElement('li');
                li.textContent = `${seedType} (x${count})`;
                li.draggable = true;
                li.dataset.seedType = seedType;
                addDragEvents(li);
                seedsList.appendChild(li);
            }
        }
        stoneCountDisplay.textContent = gardenData.inventory.stones;
    }

    // --- LÓGICA DE DRAG & DROP ---
    function addDragEvents(item) {
        item.addEventListener('dragstart', (e) => {
            draggedItem = {
                type: 'seed',
                seedType: e.target.dataset.seedType
            };
            e.target.classList.add('dragging');
        });

        item.addEventListener('dragend', (e) => {
            draggedItem = null;
            e.target.classList.remove('dragging');
        });
    }

    function addDropEvents(cell) {
        cell.addEventListener('dragover', (e) => {
            // Permite o drop apenas se a célula estiver vazia
            if (!cell.hasChildNodes()) {
                e.preventDefault();
            }
        });

        cell.addEventListener('drop', async (e) => {
            e.preventDefault();

            // Garante que o alvo do drop seja a célula e que ela esteja vazia.
            const targetCell = e.currentTarget;
            if (draggedItem && draggedItem.type === 'seed' && !targetCell.hasChildNodes()) {
                const position = parseInt(targetCell.dataset.index, 10);
                if (isNaN(position)) return; // Sai se o índice for inválido

                const { seedType } = draggedItem;

                // 1. Atualizar o inventário
                if (gardenData.inventory.seeds[seedType] > 0) {
                    gardenData.inventory.seeds[seedType]--;

                    // 2. Adicionar ao layout do jardim
                    gardenData.layout.push({
                        type: 'plant',
                        seedType: seedType,
                        position: position,
                        growthStage: 0,
                        plantedAt: Date.now()
                    });

                    // 3. Salvar e re-renderizar
                    await saveData();
                    renderGarden();
                    renderInventory();
                }
            }
            draggedItem = null;
        });
    }

    // --- CHAMADA INICIAL ---
    initGarden();
});