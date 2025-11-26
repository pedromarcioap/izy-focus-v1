document.addEventListener('DOMContentLoaded', () => {
    // --- Referências de Elementos ---
    const inventoryList = document.getElementById('inventory-list');
    const gardenDisplay = document.getElementById('garden-display');
    const editGardenBtn = document.getElementById('edit-garden-btn');

    let gardenData = { layout: [], inventory: { seeds: {}, stones: 0 } };
    let isEditMode = false;
    let draggedItemInfo = null; // Renomeado para clareza
    let draggedGardenItem = { element: null, index: -1 };

    // --- Inicialização ---
    async function init() {
        await loadData();
        renderAll();
        addEventListeners();
    }

    async function loadData() {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            console.log("API do Chrome não disponível. Usando dados mocados para o jardim.");
            gardenData = {
                layout: [
                    { type: 'plant', seedType: 'Estudo', growthStage: 2 },
                    { type: 'plant', seedType: 'Trabalho', growthStage: 1 },
                    { type: 'stone' },
                    { type: 'plant', seedType: 'Pessoal', growthStage: 0, withered: true },
                ],
                inventory: { seeds: { 'Estudo': 2, 'Lazer': 5 }, stones: 3 }
            };
            return;
        }
        const data = await chrome.storage.local.get(['gardenLayout', 'gardenInventory']);
        gardenData.layout = data.gardenLayout || [];
        gardenData.inventory = data.gardenInventory || { seeds: {}, stones: 0 };
    }

    async function saveData() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.set({
                gardenLayout: gardenData.layout,
                gardenInventory: gardenData.inventory
            });
        }
    }

    // --- Renderização ---
    function renderAll() {
        renderInventory();
        renderGarden();
    }

    function renderInventory() {
        inventoryList.innerHTML = '';
        if (!gardenData.inventory) return;

        if (gardenData.inventory.seeds) {
            for (const [seedType, count] of Object.entries(gardenData.inventory.seeds)) {
                if (count > 0) {
                    const item = createInventoryItem(`Semente ${seedType} (x${count})`, 'seed', seedType);
                    inventoryList.appendChild(item);
                }
            }
        }

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
        if (seedType) li.dataset.seedType = seedType;
        return li;
    }

    function renderGarden() {
        gardenDisplay.innerHTML = '';
        gardenData.layout.forEach((item, index) => {
            const div = document.createElement('div');
            // Mantém a classe 'garden-item' para a lógica de arrastar e soltar
            div.className = 'garden-item ' + item.type;
            div.dataset.index = index;
            div.draggable = isEditMode;

            const img = document.createElement('img');
            img.className = 'garden-item-img'; // Classe para estilização da imagem

            let imagePath = '';
            if (item.type === 'plant') {
                if (item.withered) {
                    imagePath = '../images/withered_plant.png';
                } else {
                    const seedTypeNormalized = (item.seedType || 'padrao').toLowerCase();
                    const plantType = seedTypeNormalized === 'estudo' ? 'estudo' : 'padrao';
                    const growthStage = item.growthStage || 0;
                    imagePath = `../images/${plantType}_plant_stage${growthStage}.png`;
                }
            } else if (item.type === 'stone') {
                imagePath = '../images/stone.png';
            }

            img.src = imagePath;
            img.alt = item.type; // Adiciona texto alternativo para acessibilidade

            if (item.type === 'plant') {
                // Mantém os atributos de dados para a lógica existente (reviver, etc.)
                div.dataset.growth = item.growthStage || 0;
                if (item.withered) div.classList.add('withered');
            }

            div.appendChild(img); // Adiciona a imagem à div

            if (isEditMode) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-item-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.dataset.index = index;
                div.appendChild(removeBtn);
            }
            gardenDisplay.appendChild(div);
        });
    }

    // --- Lógica de Interação ---
    function addEventListeners() {
        editGardenBtn.addEventListener('click', toggleEditMode);

        // Eventos para arrastar do inventário
        inventoryList.addEventListener('dragstart', handleInventoryDragStart);
        inventoryList.addEventListener('dragend', handleInventoryDragEnd);

        // Eventos para o display do jardim (soltar item do inventário OU reorganizar)
        gardenDisplay.addEventListener('dragover', handleGardenDragOver);
        gardenDisplay.addEventListener('dragenter', (e) => e.target.classList.add('drop-target'));
        gardenDisplay.addEventListener('dragleave', (e) => e.target.classList.remove('drop-target'));
        gardenDisplay.addEventListener('drop', handleGardenDrop);

        // Eventos para arrastar itens DENTRO do jardim (reorganizar)
        gardenDisplay.addEventListener('dragstart', handleGardenDragStart);
        gardenDisplay.addEventListener('dragend', handleGardenDragEnd);

        // Evento para remover itens
        gardenDisplay.addEventListener('click', handleGardenClick);
    }

    function toggleEditMode() {
        isEditMode = !isEditMode;
        gardenDisplay.classList.toggle('edit-mode', isEditMode);
        editGardenBtn.textContent = isEditMode ? 'Concluir Edição' : 'Editar Jardim';
        renderGarden(); // Re-renderiza o jardim para mostrar/ocultar botões de remoção e mudar draggable
    }

    // --- Handlers de Eventos ---

    function handleInventoryDragStart(e) {
        if (e.target.classList.contains('inventory-item')) {
            draggedItemInfo = { type: e.target.dataset.itemType, seedType: e.target.dataset.seedType, source: 'inventory' };
            e.target.classList.add('dragging');
        }
    }

    function handleInventoryDragEnd(e) {
        if (e.target.classList.contains('inventory-item')) {
            e.target.classList.remove('dragging');
        }
        draggedItemInfo = null;
    }

    function handleGardenDragStart(e) {
        if (isEditMode && e.target.classList.contains('garden-item')) {
            draggedGardenItem.element = e.target;
            draggedGardenItem.index = parseInt(e.target.dataset.index, 10);
            draggedItemInfo = { source: 'garden', index: draggedGardenItem.index };
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    }

    function handleGardenDragEnd(e) {
        if (draggedGardenItem.element) {
            draggedGardenItem.element.classList.remove('dragging');
        }
        draggedGardenItem = { element: null, index: -1 };
        draggedItemInfo = null;
    }

    function handleGardenDragOver(e) {
        e.preventDefault();
        if (!isEditMode && draggedItemInfo?.source === 'garden') return; // Previne reorganização fora do modo de edição
    }

    async function handleGardenDrop(e) {
        e.preventDefault();
        gardenDisplay.classList.remove('drop-target');
        if (!draggedItemInfo) return;

        if (draggedItemInfo.source === 'inventory') {
            // Adicionar novo item do inventário
            if (draggedItemInfo.type === 'seed' && gardenData.inventory.seeds[draggedItemInfo.seedType] > 0) {
                gardenData.inventory.seeds[draggedItemInfo.seedType]--;
                gardenData.layout.push({ type: 'plant', seedType: draggedItemInfo.seedType, growthStage: 0 });
            } else if (draggedItemInfo.type === 'stone' && gardenData.inventory.stones > 0) {
                gardenData.inventory.stones--;
                gardenData.layout.push({ type: 'stone' });
            }
        } else if (draggedItemInfo.source === 'garden' && isEditMode) {
            // Reorganizar item existente
            const targetElement = e.target.closest('.garden-item');
            const fromIndex = draggedItemInfo.index;
            const toIndex = targetElement ? parseInt(targetElement.dataset.index, 10) : gardenData.layout.length -1;

            if (fromIndex !== toIndex) {
                const [movedItem] = gardenData.layout.splice(fromIndex, 1);
                gardenData.layout.splice(toIndex, 0, movedItem);
            }
        }
        
        await saveData();
        renderAll();
    }

    async function handleGardenClick(e) {
        const target = e.target;
        // Lógica de remoção
        if (isEditMode && target.classList.contains('remove-item-btn')) {
            const indexToRemove = parseInt(target.dataset.index, 10);
            gardenData.layout.splice(indexToRemove, 1);
            await saveData();
            renderAll();
            return;
        }

        // Lógica para reviver planta
        const gardenItem = target.closest('.garden-item.withered');
        if (!isEditMode && gardenItem) {
            if (gardenData.inventory.stones > 0) {
                const indexToRevive = parseInt(gardenItem.dataset.index, 10);
                const plant = gardenData.layout[indexToRevive];

                if (plant && plant.withered) {
                    gardenData.inventory.stones--;
                    plant.withered = false;
                    await saveData();
                    renderAll();
                }
            } else {
                // Futuramente: mostrar uma notificação de que não há pedras.
                console.log("Você não tem pedras para reviver esta planta.");
            }
        }
    }

    init();
});
