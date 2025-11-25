document.addEventListener('DOMContentLoaded', () => {
    const gardenGrid = document.getElementById('garden-grid');
    const inventoryList = document.getElementById('inventory-list');
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
        // A grade em si é o container, agora vamos preenchê-la com tiles
        gardenGrid.innerHTML = ''; // Limpa a grade antes de recriar
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            const tile = document.createElement('div');
            tile.classList.add('garden-tile');
            tile.dataset.index = i;
            // Por enquanto, todos os tiles são de grama
            tile.style.backgroundImage = `url('../assets/images/garden/tile-grass.svg')`;
            addDropEvents(tile);
            gardenGrid.appendChild(tile);
        }
    }

    function renderGarden() {
        // Remove apenas os itens antigos do jardim, não os tiles
        gardenGrid.querySelectorAll('.garden-item').forEach(item => item.remove());

        gardenData.layout.forEach(plantedItem => {
            const itemElement = createGardenItemElement(plantedItem);

            // Posiciona o item na grade
            const row = Math.floor(plantedItem.position / GRID_SIZE) + 1;
            const col = (plantedItem.position % GRID_SIZE) + 1;
            itemElement.style.gridRowStart = row;
            itemElement.style.gridColumnStart = col;

            gardenGrid.appendChild(itemElement);
        });
    }

    function createGardenItemElement(itemData) {
        const imgElement = document.createElement('img');
        imgElement.classList.add('garden-item', itemData.type);
        imgElement.draggable = isEditMode;
        imgElement.dataset.itemType = itemData.type;
        imgElement.dataset.position = itemData.position;

        let src = '';
        if (itemData.type === 'plant') {
            imgElement.dataset.seedType = itemData.seedType;
            if (itemData.withered) {
                imgElement.classList.add('withered');
                src = '../assets/images/garden/plant-withered.svg';
                // O listener de clique será gerenciado de forma diferente se necessário
            } else {
                const stage = itemData.growthStage || 0;
                src = `../assets/images/garden/plant-stage-${stage}.svg`;
            }
        } else if (itemData.type === 'stone') {
            src = '../assets/images/garden/icon-stone.svg';
        }

        imgElement.src = src;
        imgElement.alt = itemData.type;

        if (isEditMode) {
            addDragEvents(imgElement);
        }
        
        // Adiciona evento de clique para reviver, mesmo fora do modo de edição
        if (itemData.type === 'plant' && itemData.withered) {
             imgElement.addEventListener('click', () => handleWitheredPlantClick(itemData));
             imgElement.style.pointerEvents = 'auto'; // Garante que a planta murcha seja clicável
             imgElement.style.cursor = 'pointer';
        }

        return imgElement;
    }

    function renderInventory() {
        inventoryList.innerHTML = ''; // Limpa a lista inteira

        // Função auxiliar para criar um item de inventário
        const createInventoryItem = (text, itemType, seedType, iconSrc) => {
            const li = document.createElement('li');
            const icon = document.createElement('img');
            icon.src = iconSrc;
            icon.alt = itemType;
            icon.style.width = '24px';
            icon.style.height = '24px';

            const textSpan = document.createElement('span');
            textSpan.textContent = text;

            li.appendChild(icon);
            li.appendChild(textSpan);

            li.draggable = true;
            li.dataset.itemType = itemType;
            if (seedType) {
                li.dataset.seedType = seedType;
            }
            addDragEvents(li);
            inventoryList.appendChild(li);
        };

        // Renderiza as sementes
        if (gardenData.inventory && typeof gardenData.inventory.seeds === 'object') {
            for (const [seedType, count] of Object.entries(gardenData.inventory.seeds)) {
                if (count > 0) {
                    createInventoryItem(`${seedType} (x${count})`, 'seed', seedType, '../assets/images/garden/icon-seed.svg');
                }
            }
        }

        // Renderiza as pedras
        const stoneCount = gardenData.inventory.stones || 0;
        if (stoneCount > 0) {
            createInventoryItem(`Pedra (x${stoneCount})`, 'stone', null, '../assets/images/garden/icon-stone.svg');
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
            const position = e.currentTarget.dataset.position;
            draggedItem = {
                type: e.currentTarget.dataset.itemType,
                originalPosition: position ? parseInt(position, 10) : undefined
            };
            if (e.currentTarget.dataset.seedType) {
                draggedItem.seedType = e.currentTarget.dataset.seedType;
            }
            e.currentTarget.classList.add('dragging');
        });
        item.addEventListener('dragend', (e) => {
            draggedItem = null;
            e.currentTarget.classList.remove('dragging');
        });
    }

    function addDropEvents(tile) {
        tile.addEventListener('dragover', (e) => {
            const targetIndex = parseInt(e.currentTarget.dataset.index, 10);
            const isOccupied = gardenData.layout.some(item => item.position === targetIndex);
            if (!isOccupied) {
                e.preventDefault(); // Permite o drop
            }
        });

        tile.addEventListener('dragenter', (e) => {
            const targetIndex = parseInt(e.currentTarget.dataset.index, 10);
            const isOccupied = gardenData.layout.some(item => item.position === targetIndex);
            if (!isOccupied) {
                e.preventDefault();
                tile.classList.add('drag-over');
            }
        });

        tile.addEventListener('dragleave', () => {
            tile.classList.remove('drag-over');
        });

        tile.addEventListener('drop', async (e) => {
            e.preventDefault();
            tile.classList.remove('drag-over');
            const targetTile = e.currentTarget;
            const newPosition = parseInt(targetTile.dataset.index, 10);
            const isOccupied = gardenData.layout.some(item => item.position === newPosition);

            if (!draggedItem || isOccupied) return;

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
                    return; // Exit if item is not valid or not in stock
                }
            }

            // Await the data saving and then re-render
            await saveData();
            renderAll();
            draggedItem = null;
        });
    }

    initGarden();
});