document.addEventListener('DOMContentLoaded', () => {
    const gardenGrid = document.getElementById('garden-grid');
    const seedsList = document.getElementById('seeds-list');
    const stoneCountDisplay = document.getElementById('stone-count');
    const stoneInventory = document.getElementById('stones-inventory');
    const editGardenBtn = document.getElementById('edit-garden-btn');
    const GRID_SIZE = 8;

    let gardenData = { layout: [], inventory: { seeds: {}, stones: 0 } };
    let draggedItem = null;
    let isEditMode = false;

    // --- INITIALIZATION ---
    async function initGarden() {
        createGardenGrid();
        // Use more realistic mock data for verification from the start
        await loadData(true);
        renderAll();
        if (editGardenBtn) {
            editGardenBtn.addEventListener('click', toggleEditMode);
        }
    }

    function renderAll() {
        renderGarden();
        renderInventory();
    }

    async function loadData(useMock = false) {
        if (!useMock && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const data = await chrome.storage.local.get(['gardenLayout', 'gardenInventory']);
            gardenData.layout = data.gardenLayout || [];
            gardenData.inventory = data.gardenInventory || { seeds: {}, stones: 0 };
        } else {
            console.log("Using realistic mock data for verification.");
            gardenData.inventory = { seeds: { 'Padrão': 5, 'Estudo': 2 }, stones: 3 };
            gardenData.layout = [
                { type: 'plant', seedType: 'Padrão', position: 10, growthStage: 1, plantedAt: Date.now() },
                { type: 'plant', seedType: 'Estudo', position: 22, growthStage: 2, plantedAt: Date.now() },
                { type: 'plant', seedType: 'Padrão', position: 35, growthStage: 0, withered: true, plantedAt: Date.now() },
                { type: 'stone', position: 5 }
            ];
        }
    }

    async function saveData() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({
                gardenLayout: gardenData.layout,
                gardenInventory: gardenData.inventory
            });
        } else {
            console.log("Chrome storage not available. Data not saved.");
        }
    }

    // --- UI RENDERING ---
    function createGardenGrid() {
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.classList.add('garden-cell');
            cell.dataset.index = i;
            addDropEvents(cell);
            gardenGrid.appendChild(cell);
        }
    }

    function renderGarden() {
        Array.from(gardenGrid.children).forEach(cell => {
            cell.innerHTML = '';
        });

        gardenData.layout.forEach(plantedItem => {
            const cell = gardenGrid.querySelector(`.garden-cell[data-index='${plantedItem.position}']`);
            if (cell) {
                const itemElement = createGardenItemElement(plantedItem);
                cell.appendChild(itemElement);
            }
        });
    }

    function createGardenItemElement(itemData) {
        const imgElement = document.createElement('img');
        imgElement.classList.add(itemData.type);
        imgElement.draggable = isEditMode;
        imgElement.dataset.itemType = itemData.type;
        imgElement.dataset.position = itemData.position;

        let src = '';
        if (itemData.type === 'plant') {
            imgElement.dataset.seedType = itemData.seedType;
            if (itemData.withered) {
                imgElement.classList.add('withered');
                src = '/assets/icons/withered_plant.png';
                imgElement.addEventListener('click', () => handleWitheredPlantClick(itemData));
            } else {
                const stage = itemData.growthStage || 0;
                // Normalize seedType to remove diacritics and convert to lowercase for path matching
                const normalizedSeedType = (itemData.seedType || 'padrao')
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();
                src = `/assets/icons/${normalizedSeedType}_plant_stage${stage}.png`;
            }
        } else if (itemData.type === 'stone') {
            src = '/assets/icons/stone.svg';
        }

        imgElement.src = src;
        imgElement.alt = itemData.type; // Add alt text for accessibility

        addDragEvents(imgElement);
        return imgElement;
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
        stoneInventory.draggable = (gardenData.inventory.stones > 0);
        if (stoneInventory.draggable) {
             stoneInventory.dataset.itemType = 'stone';
             addDragEvents(stoneInventory);
        }
    }

    // --- INTERACTION LOGIC ---
    function toggleEditMode() {
        isEditMode = !isEditMode;
        gardenGrid.classList.toggle('edit-mode', isEditMode);
        editGardenBtn.textContent = isEditMode ? 'Salvar' : 'Editar';
        editGardenBtn.classList.toggle('active', isEditMode);

        renderGarden();
    }

    async function handleWitheredPlantClick(plant) {
        if (gardenData.inventory.stones > 0) {
            if (confirm("Você deseja usar 1 Pedra 🪨 para reviver esta planta?")) {
                gardenData.inventory.stones--;
                const plantInLayout = gardenData.layout.find(p => p.position === plant.position);
                if (plantInLayout) {
                    delete plantInLayout.withered;
                }
                renderAll();
                await saveData();
            }
        } else {
            alert("Você não tem Pedras suficientes para reviver esta planta.");
        }
    }

    function addDragEvents(item) {
        item.addEventListener('dragstart', (e) => {
            if (!e.currentTarget.draggable) {
                e.preventDefault();
                return;
            }
            const position = e.currentTarget.dataset.position;
            draggedItem = {
                type: e.currentTarget.dataset.itemType,
                seedType: e.currentTarget.dataset.seedType,
                originalPosition: position ? parseInt(position, 10) : undefined
            };
            e.currentTarget.classList.add('dragging');
        });
        item.addEventListener('dragend', (e) => {
            draggedItem = null;
            e.currentTarget.classList.remove('dragging');
        });
    }

    function addDropEvents(cell) {
        cell.addEventListener('dragover', (e) => {
            if (!cell.hasChildNodes()) {
                if ( (draggedItem?.originalPosition !== undefined && isEditMode) || (draggedItem?.originalPosition === undefined) ) {
                    e.preventDefault();
                }
            }
        });

        cell.addEventListener('dragenter', (e) => {
             if (!cell.hasChildNodes()) {
                if ( (draggedItem?.originalPosition !== undefined && isEditMode) || (draggedItem?.originalPosition === undefined) ) {
                    e.preventDefault();
                    cell.classList.add('drag-over');
                }
            }
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over');
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            const targetCell = e.currentTarget;
            if (!draggedItem || targetCell.hasChildNodes()) return;

            const newPosition = parseInt(targetCell.dataset.index, 10);
            if (isNaN(newPosition)) return;

            if (draggedItem.originalPosition !== undefined) {
                if (!isEditMode) return;
                const itemToMove = gardenData.layout.find(item => item.position === draggedItem.originalPosition);
                if (itemToMove) {
                    itemToMove.position = newPosition;
                }
            } else {
                if (draggedItem.type === 'seed' && gardenData.inventory.seeds[draggedItem.seedType] > 0) {
                    gardenData.inventory.seeds[draggedItem.seedType]--;
                    gardenData.layout.push({ type: 'plant', seedType: draggedItem.seedType, position: newPosition, growthStage: 0, plantedAt: Date.now() });
                } else if (draggedItem.type === 'stone' && gardenData.inventory.stones > 0) {
                    gardenData.inventory.stones--;
                    gardenData.layout.push({ type: 'stone', position: newPosition });
                } else {
                    return;
                }
            }

            renderAll();
            saveData();
            draggedItem = null;
        });
    }

    initGarden();
});