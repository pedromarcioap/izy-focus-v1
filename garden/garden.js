document.addEventListener('DOMContentLoaded', () => {
    const gardenGrid = document.getElementById('garden-grid');
    const seedsList = document.getElementById('seeds-list');
    const stoneCountDisplay = document.getElementById('stone-count');
    const stoneInventory = document.getElementById('stones-inventory');
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
            addDropEvents(cell);

            const plantedItem = gardenData.layout.find(p => p.position === i);
            if (plantedItem) {
                const itemElement = document.createElement('div');
                itemElement.classList.add(plantedItem.type);

                if (plantedItem.type === 'plant') {
                    if (plantedItem.withered) {
                        itemElement.classList.add('withered');
                        itemElement.style.backgroundImage = `url('../assets/icons/withered_plant.png')`;
                        itemElement.addEventListener('click', () => handleWitheredPlantClick(plantedItem));
                    } else {
                        const stage = plantedItem.growthStage || 0;
                        itemElement.style.backgroundImage = `url('../assets/icons/${plantedItem.seedType || 'Padrao'}_plant_stage${stage}.png')`;
                    }
                } else if (plantedItem.type === 'stone') {
                    itemElement.style.backgroundImage = `url('../assets/icons/stone.svg')`;
                }

                cell.appendChild(itemElement);
            }
            
            gardenGrid.appendChild(cell);
        }
    }

    function renderInventory() {
        seedsList.innerHTML = '';
        if (gardenData.inventory && typeof gardenData.inventory.seeds === 'object') {
            for (const [seedType, count] of Object.entries(gardenData.inventory.seeds)) {
                if (count > 0) {
                    const li = document.createElement('li');
                    li.textContent = `${seedType} (x${count})`;
                    li.draggable = true;
                    li.dataset.itemType = 'seed';
                    li.dataset.seedType = seedType;
                    addDragEvents(li);
                    seedsList.appendChild(li);
                }
            }
        }
        
        stoneCountDisplay.textContent = gardenData.inventory.stones || 0;
        if (gardenData.inventory.stones > 0) {
            stoneInventory.draggable = true;
            stoneInventory.dataset.itemType = 'stone';
            addDragEvents(stoneInventory);
        } else {
            stoneInventory.draggable = false;
        }
    }

    // --- LÓGICA DE INTERAÇÃO ---
    async function handleWitheredPlantClick(plant) {
        if (gardenData.inventory.stones > 0) {
            if (confirm("Você deseja usar 1 Pedra 🪨 para reviver esta planta?")) {
                gardenData.inventory.stones--;
                const plantInLayout = gardenData.layout.find(p => p.position === plant.position);
                if (plantInLayout) {
                    delete plantInLayout.withered;
                }
                await saveData();
                renderGarden();
                renderInventory();
            }
        } else {
            alert("Você não tem Pedras suficientes para reviver esta planta.");
        }
    }

    function addDragEvents(item) {
        item.addEventListener('dragstart', (e) => {
            draggedItem = { type: e.currentTarget.dataset.itemType, seedType: e.currentTarget.dataset.seedType };
            e.currentTarget.classList.add('dragging');
        });
        item.addEventListener('dragend', (e) => {
            draggedItem = null;
            e.currentTarget.classList.remove('dragging');
        });
    }

    function addDropEvents(cell) {
        cell.addEventListener('dragover', (e) => {
            if (!cell.hasChildNodes()) e.preventDefault();
        });

        cell.addEventListener('dragenter', (e) => {
            if (!cell.hasChildNodes()) {
                e.preventDefault();
                cell.classList.add('drag-over');
            }
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over');
        });

        cell.addEventListener('drop', async (e) => {
            e.preventDefault();
            const targetCell = e.currentTarget;
            if (!draggedItem || targetCell.hasChildNodes()) return;
            const position = parseInt(targetCell.dataset.index, 10);
            if (isNaN(position)) return;

            if (draggedItem.type === 'seed' && gardenData.inventory.seeds[draggedItem.seedType] > 0) {
                gardenData.inventory.seeds[draggedItem.seedType]--;
                gardenData.layout.push({ type: 'plant', seedType: draggedItem.seedType, position, growthStage: 0, plantedAt: Date.now() });
            } else if (draggedItem.type === 'stone' && gardenData.inventory.stones > 0) {
                gardenData.inventory.stones--;
                gardenData.layout.push({ type: 'stone', position });
            } else {
                return;
            }

            await saveData();
            renderGarden();
            renderInventory();
            draggedItem = null;
        });
    }

    initGarden();
});