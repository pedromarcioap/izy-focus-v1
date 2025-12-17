document.addEventListener('DOMContentLoaded', () => {
    // --- REFERÊNCIAS DO DOM ---
    const focusListsContainer = document.getElementById('focus-lists-container'), addFocusListForm = document.getElementById('add-focus-list-form'), focusFormTitle = document.getElementById('focus-form-title'), submitFocusFormBtn = document.getElementById('submit-focus-form-btn'), cancelEditFocusBtn = document.getElementById('cancel-edit-focus-btn');
    const blockListsContainer = document.getElementById('block-lists-container'), addBlockListForm = document.getElementById('add-block-list-form'), blockFormTitle = document.getElementById('block-form-title'), submitBlockFormBtn = document.getElementById('submit-block-form-btn'), cancelEditBlockBtn = document.getElementById('cancel-edit-block-btn');
    const whiteListsContainer = document.getElementById('white-lists-container'), addWhiteListForm = document.getElementById('add-white-list-form'), whiteFormTitle = document.getElementById('white-form-title'), submitWhiteFormBtn = document.getElementById('submit-white-form-btn'), cancelEditWhiteBtn = document.getElementById('cancel-edit-white-btn');
    const blockListAssociationSelect = document.getElementById('block-list-association'), whiteListAssociationSelect = document.getElementById('white-list-association');
    const blocklistSection = document.getElementById('blocklist-section'), whitelistSection = document.getElementById('whitelist-section');
    const blockModeRadios = document.querySelectorAll('input[name="block-mode"]');
    let editingState = { type: null, id: null };

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    async function renderAll() {
        const data = await chrome.storage.local.get(['focusLists', 'blockLists', 'whitelists']);
        const focusLists = data.focusLists || [], blockLists = data.blockLists || [], whitelists = data.whitelists || [];

        focusListsContainer.innerHTML = ''; blockListsContainer.innerHTML = ''; whiteListsContainer.innerHTML = '';
        blockListAssociationSelect.innerHTML = ''; whiteListAssociationSelect.innerHTML = '';

        if (blockLists.length === 0) blockListAssociationSelect.innerHTML = '<option disabled selected>Crie uma blocklist</option>';
        blockLists.forEach(list => {
            renderListItem(list, blockListsContainer, () => startEditing('block', list.id), () => deleteList('block', list.id));
            const option = document.createElement('option'); option.value = list.id; option.textContent = list.name;
            blockListAssociationSelect.appendChild(option);
        });

        if (whitelists.length === 0) whiteListAssociationSelect.innerHTML = '<option disabled selected>Crie uma whitelist</option>';
        whitelists.forEach(list => {
            renderListItem(list, whiteListsContainer, () => startEditing('white', list.id), () => deleteList('white', list.id));
            const option = document.createElement('option'); option.value = list.id; option.textContent = list.name;
            whiteListAssociationSelect.appendChild(option);
        });

        focusLists.forEach(list => {
            let associationName = 'Nenhuma';
            if (list.blockMode === 'whitelist') {
                const associated = whitelists.find(l => l.id === list.associatedListId);
                if (associated) associationName = `Permitindo: ${associated.name}`;
            } else {
                const associated = blockLists.find(l => l.id === list.associatedListId);
                if (associated) associationName = `Bloqueando: ${associated.name}`;
            }
            renderFocusListItem(list, associationName, () => startEditing('focus', list.id), () => deleteList('focus', list.id));
        });
    }

    function renderListItem(list, container, onEdit, onDelete) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `<div class="info"><strong>${list.name}</strong><br><span>${list.sites.length} site(s)</span></div>`;
        item.appendChild(createActionsDiv(onEdit, onDelete));
        container.appendChild(item);
    }

    function renderFocusListItem(list, associationName, onEdit, onDelete) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `<div class="info"><strong>${list.name}</strong><br><span>${list.focusTime}m Foco / ${list.breakTime}m Pausa &bull; ${associationName}</span></div>`;
        item.appendChild(createActionsDiv(onEdit, onDelete));
        focusListsContainer.appendChild(item);
    }

    function createActionsDiv(onEdit, onDelete) {
        const div = document.createElement('div');
        div.className = 'list-item-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit-btn'; editBtn.title = 'Editar';
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>`;
        editBtn.addEventListener('click', onEdit);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn'; deleteBtn.title = 'Excluir';
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`;
        deleteBtn.addEventListener('click', onDelete);
        div.appendChild(editBtn); div.appendChild(deleteBtn);
        return div;
    }

    // --- LÓGICA DE EDIÇÃO ---
    async function startEditing(type, id) {
        editingState = { type, id };
        const data = await chrome.storage.local.get(['focusLists', 'blockLists', 'whitelists']);
        if (type === 'focus') {
            const list = data.focusLists.find(l => l.id === id);
            document.getElementById('focus-list-name').value = list.name;
            document.getElementById('focus-time').value = list.focusTime;
            document.getElementById('break-time').value = list.breakTime;
            document.getElementById(list.blockMode === 'whitelist' ? 'mode-whitelist' : 'mode-blocklist').checked = true;
            blockModeRadios.forEach(radio => radio.dispatchEvent(new Event('change')));
            if (list.blockMode === 'whitelist') whiteListAssociationSelect.value = list.associatedListId;
            else blockListAssociationSelect.value = list.associatedListId;
            addFocusListForm.classList.add('editing'); focusFormTitle.textContent = 'Editando Lista de Foco'; submitFocusFormBtn.textContent = 'Salvar Alterações'; addFocusListForm.scrollIntoView({ behavior: 'smooth' });
        } else if (type === 'block' || type === 'white') {
            const isBlock = type === 'block';
            const list = (isBlock ? data.blockLists : data.whitelists).find(l => l.id === id);
            document.getElementById(isBlock ? 'block-list-name' : 'white-list-name').value = list.name;
            document.getElementById(isBlock ? 'block-list-sites' : 'white-list-sites').value = list.sites.join('\n');
            (isBlock ? addBlockListForm : addWhiteListForm).classList.add('editing');
            (isBlock ? blockFormTitle : whiteFormTitle).textContent = `Editando ${isBlock ? 'Blocklist' : 'Whitelist'}`;
            (isBlock ? submitBlockFormBtn : submitWhiteFormBtn).textContent = 'Salvar Alterações';
            (isBlock ? addBlockListForm : addWhiteListForm).scrollIntoView({ behavior: 'smooth' });
        }
    }

    function cancelEditing() {
        addFocusListForm.classList.remove('editing'); focusFormTitle.textContent = 'Adicionar Nova Lista de Foco'; submitFocusFormBtn.textContent = 'Adicionar Lista de Foco'; addFocusListForm.reset();
        addBlockListForm.classList.remove('editing'); blockFormTitle.textContent = 'Adicionar Nova Blocklist'; submitBlockFormBtn.textContent = 'Adicionar Blocklist'; addBlockListForm.reset();
        addWhiteListForm.classList.remove('editing'); whiteFormTitle.textContent = 'Adicionar Nova Whitelist'; submitWhiteFormBtn.textContent = 'Adicionar Whitelist'; addWhiteListForm.reset();
        editingState = { type: null, id: null };
        document.getElementById('mode-blocklist').checked = true;
        blockModeRadios.forEach(radio => radio.dispatchEvent(new Event('change')));
    }
    cancelEditFocusBtn.addEventListener('click', cancelEditing);
    cancelEditBlockBtn.addEventListener('click', cancelEditing);
    cancelEditWhiteBtn.addEventListener('click', cancelEditing);

    // --- MANIPULAÇÃO DE DADOS ---
    addFocusListForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { focusLists, nextListId = 1 } = await chrome.storage.local.get(['focusLists', 'nextListId']);
        const blockMode = document.querySelector('input[name="block-mode"]:checked').value;
        const selectElement = blockMode === 'whitelist' ? whiteListAssociationSelect : blockListAssociationSelect;
        const associatedListId = parseInt(selectElement.value, 10);

        if (isNaN(associatedListId)) {
            alert(`Por favor, crie e selecione uma ${blockMode} antes de salvar.`);
            return;
        }

        const updatedList = { id: editingState.id, name: document.getElementById('focus-list-name').value, focusTime: parseInt(document.getElementById('focus-time').value, 10), breakTime: parseInt(document.getElementById('break-time').value, 10), blockMode, associatedListId };
        let newFocusLists = [], newNextListId = nextListId;
        if (editingState.type === 'focus') { newFocusLists = focusLists.map(list => list.id === editingState.id ? updatedList : list); }
        else { updatedList.id = nextListId; newFocusLists = [...(focusLists || []), updatedList]; newNextListId++; }
        await chrome.storage.local.set({ focusLists: newFocusLists, nextListId: newNextListId });
        cancelEditing(); await renderAll();
    });

    async function handleListForm(e, type) {
        e.preventDefault();
        const isBlock = type === 'block';
        const storageKey = isBlock ? 'blockLists' : 'whitelists';
        const nextIdKey = isBlock ? 'nextBlockListId' : 'nextWhiteListId';
        const { [storageKey]: lists, [nextIdKey]: nextId = 1 } = await chrome.storage.local.get([storageKey, nextIdKey]);
        const sites = document.getElementById(isBlock ? 'block-list-sites' : 'white-list-sites').value.split('\n').map(s => s.trim().replace(/^(https?:\/\/)?(www\.)?/, '')).filter(s => s.length > 0 && s.includes('.'));
        const updatedList = { id: editingState.id, name: document.getElementById(isBlock ? 'block-list-name' : 'white-list-name').value, sites };
        let newLists = [], newNextId = nextId;
        if (editingState.type === type) { newLists = lists.map(list => list.id === editingState.id ? updatedList : list); }
        else { updatedList.id = nextId; newLists = [...(lists || []), updatedList]; newNextId++; }
        await chrome.storage.local.set({ [storageKey]: newLists, [nextIdKey]: newNextId });
        cancelEditing(); await renderAll();
    }
    addBlockListForm.addEventListener('submit', (e) => handleListForm(e, 'block'));
    addWhiteListForm.addEventListener('submit', (e) => handleListForm(e, 'white'));

    async function deleteList(type, id) {
        let key, name;
        if (type === 'focus') { key = 'focusLists'; name = 'lista de foco'; }
        else if (type === 'block') { key = 'blockLists'; name = 'blocklist'; }
        else { key = 'whitelists'; name = 'whitelist'; }

        if (!confirm(`Tem certeza que deseja excluir esta ${name}?`)) return;
        const { [key]: lists } = await chrome.storage.local.get(key);
        const updatedLists = lists.filter(list => list.id !== id);
        await chrome.storage.local.set({ [key]: updatedLists });
        await renderAll();
    }

    blockModeRadios.forEach(radio => radio.addEventListener('change', (e) => {
        whitelistSection.style.display = e.target.value === 'whitelist' ? 'flex' : 'none';
        blocklistSection.style.display = e.target.value === 'blocklist' ? 'flex' : 'none';
    }));

    renderAll();
});