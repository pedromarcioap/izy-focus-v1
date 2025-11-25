document.addEventListener('DOMContentLoaded', () => {
    // --- Referências de Elementos ---
    const inventoryList = document.getElementById('inventory-list');
    const gardenDisplay = document.getElementById('garden-display');
    const editGardenBtn = document.getElementById('edit-garden-btn');

    let gardenData = { layout: [], inventory: { seeds: {}, stones: 0 } };
    let isEditMode = false;
    let draggedItem = null;

    // --- Inicialização ---
    async function init() {
        await loadData();
        renderAll();
        addEventListeners();
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

    // --- Renderização ---
    function renderAll() {
        renderInventory();
        renderGarden();
    }

    function renderInventory() {
        inventoryList.innerHTML = '';

        // Renderiza Sementes
        for (const [seedType, count] of Object.entries(gardenData.inventory.seeds)) {
            if (count > 0) {
                const item = createInventoryItem(`Semente ${seedType} (x${count})`, 'seed', seedType);
                inventoryList.appendChild(item);
            }
        }

        // Renderiza Pedras
        if (gardenData.inventory.stones > 0) {
            const item = createInventoryItem(`Pedra (x${gardenData.inventory.stones})`, 'stone');
            inventoryList.appendChild(item);
        }
    }

    function createInventoryItem(text, type, seedType = null) {
        const li = document.createElement('li');
        li.className = 'inventory-item';
        li.textContent = text;
        li.draggable = true;
        li.dataset.itemType = type;
        if (seedType) {
            li.dataset.seedType = seedType;
        }
        return li;
    }

    function renderGarden() {
        gardenDisplay.innerHTML = '';
        gardenData.layout.forEach(item => {
            const div = document.createElement('div');
            div.className = 'garden-item ' + item.type;

            if (item.type === 'plant') {
                div.dataset.growth = item.growthStage || 0;
                if (item.withered) {
                    div.classList.add('withered');
                }
            }

            gardenDisplay.appendChild(div);
        });
    }

    // --- Lógica de Interação ---
    function addEventListeners() {
        editGardenBtn.addEventListener('click', toggleEditMode);
        
        inventoryList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('inventory-item')) {
                draggedItem = {
                    type: e.target.dataset.itemType,
                    seedType: e.target.dataset.seedType
                };
                e.target.classList.add('dragging');
            }
        });

        inventoryList.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('inventory-item')) {
                draggedItem = null;
                e.target.classList.remove('dragging');
            }
        });

        gardenDisplay.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        gardenDisplay.addEventListener('dragenter', () => gardenDisplay.classList.add('drop-target'));
        gardenDisplay.addEventListener('dragleave', () => gardenDisplay.classList.remove('drop-target'));

        gardenDisplay.addEventListener('drop', async (e) => {
            e.preventDefault();
            gardenDisplay.classList.remove('drop-target');
            if (!draggedItem) return;

            // Lógica para adicionar o item ao layout
            if (draggedItem.type === 'seed' && gardenData.inventory.seeds[draggedItem.seedType] > 0) {
                gardenData.inventory.seeds[draggedItem.seedType]--;
                gardenData.layout.push({ type: 'plant', seedType: draggedItem.seedType, growthStage: 0 });
            } else if (draggedItem.type === 'stone' && gardenData.inventory.stones > 0) {
                gardenData.inventory.stones--;
                gardenData.layout.push({ type: 'stone' });
            }

            await saveData();
            renderAll();
            draggedItem = null;
        });
    }

    function toggleEditMode() {
        isEditMode = !isEditMode;
        gardenDisplay.classList.toggle('edit-mode', isEditMode);
        editGardenBtn.textContent = isEditMode ? 'Salvar' : 'Editar';
        // Adicionar lógica de arrastar itens *dentro* do jardim se necessário
    }

    init();
});
