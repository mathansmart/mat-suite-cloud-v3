document.addEventListener('DOMContentLoaded', () => {
    // --- State & Setup ---
    const urlParams = new URLSearchParams(window.location.search);
    const COMPANY = urlParams.get('company');
    const PROFILE = urlParams.get('profile') || '1';
    const PROFILE_QUERY = `?profile=${PROFILE}`;
    const API_BASE = window.location.origin;

    if (!COMPANY) {
        alert("No company selected. Returning to Address Book.");
        window.location.href = `index.html${PROFILE_QUERY}`;
        return;
    }

    // Active configuration & data cache
    let activeSettings = {}; // Full server settings object
    let companySettings = {
        fontFamily: "'Outfit', sans-serif",
        fontSize: 18,
        fontWeight: "400",
        lineHeight: 1.2,
        topMargin: 50,
        leftMargin: 20,
        printHeader: true,
        addPrefix: true
    };
    let companyCategories = [];
    let companyAddresses = [];

    let activeCategoryFilter = "All";
    let selectedIds = [];
    let editingId = null;
    let searchFocusIndex = -1;
    let pendingConfirmCallback = null;
    let duplicateAlertTimeout = null;

    // --- DOM Elements ---
    document.getElementById('selected-company-badge').textContent = COMPANY;
    document.title = `${COMPANY} - Letter Pad Suite`;
    
    const backBtn = document.getElementById('back-to-addressbook-btn');
    if (backBtn) backBtn.href = `index.html${PROFILE_QUERY}`;

    const addressList = document.getElementById('address-list');
    const searchInput = document.getElementById('search-input');
    
    // Counter
    const statSelected = document.getElementById('stat-selected');
    
    // Sidebar Controls
    const addNewBtn = document.getElementById('add-new-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    const unselectAllBtn = document.getElementById('unselect-all-btn');
    const bulkPrintBtn = document.getElementById('bulk-print-btn');
    const categoryList = document.getElementById('category-list');

    // Settings Modal & Panes
    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
    const settingsPanes = document.querySelectorAll('.settings-pane');

    // Layout Controls
    const fontFamilySelect = document.getElementById('font-family');
    const fontSizeSlider = document.getElementById('font-size');
    const fontSizeNum = document.getElementById('font-size-num');
    const fontWeightSelect = document.getElementById('font-weight');
    const lineHeightSlider = document.getElementById('line-height');
    const lineHeightNum = document.getElementById('line-height-num');
    const topMarginSlider = document.getElementById('top-margin');
    const topMarginNum = document.getElementById('top-margin-num');
    const leftMarginSlider = document.getElementById('left-margin');
    const leftMarginNum = document.getElementById('left-margin-num');
    const printHeaderCheckbox = document.getElementById('print-header');
    const addPrefixCheckbox = document.getElementById('add-prefix');

    // Category Controls
    const newCategoryInput = document.getElementById('new-category-input');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const manageCategoryList = document.getElementById('manage-category-list');

    // Address Modal Controls
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const inputCategory = document.getElementById('input-category');
    const inputName = document.getElementById('input-name');
    const nameWarning = document.getElementById('name-warning');
    const inputCity = document.getElementById('input-city');
    const inputPhone = document.getElementById('input-phone');
    const addressLinesContainer = document.getElementById('address-lines-container');
    const addAddrLineBtn = document.getElementById('add-addr-line-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveAddressBtn = document.getElementById('save-address-btn');

    // Confirm Modal
    const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmMessage = document.getElementById('confirm-modal-message');

    // Prompt Modal
    let pendingPromptCallback = null;
    const promptModalOverlay = document.getElementById('prompt-modal-overlay');
    const promptModalInput = document.getElementById('prompt-modal-input');
    const promptModalTitle = document.getElementById('prompt-modal-title');
    const promptModalMessage = document.getElementById('prompt-modal-message');
    const promptOkBtn = document.getElementById('prompt-ok-btn');
    const promptCancelBtn = document.getElementById('prompt-cancel-btn');

    // --- Helper Functions ---
    const showNotification = (message, type = 'info', title = '', callback = null) => {
        const iconMap = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️',
            'confirm': '❓'
        };
        const colorMap = {
            'success': 'var(--success)',
            'error': 'var(--danger)',
            'warning': '#f59e0b',
            'info': 'var(--accent-blue)',
            'confirm': 'var(--accent-blue)'
        };

        const modalBox = document.getElementById('confirm-modal-box');
        const iconEl = document.getElementById('confirm-modal-icon');
        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        iconEl.textContent = iconMap[type] || 'ℹ️';
        titleEl.textContent = title || type.toUpperCase();
        messageEl.textContent = message;
        if (modalBox) modalBox.style.borderTopColor = colorMap[type] || 'var(--accent-blue)';
        
        okBtn.style.background = colorMap[type] || 'var(--accent-blue)';
        okBtn.textContent = (type === 'confirm') ? 'Yes, Proceed' : 'Got it';

        if (type === 'confirm') {
            cancelBtn.classList.remove('hidden');
        } else {
            cancelBtn.classList.add('hidden');
        }

        pendingConfirmCallback = callback;
        confirmModalOverlay.classList.remove('hidden');
    };

    confirmOkBtn.addEventListener('click', () => {
        if (pendingConfirmCallback) pendingConfirmCallback();
        confirmModalOverlay.classList.add('hidden');
        pendingConfirmCallback = null;
    });

    confirmCancelBtn.addEventListener('click', () => {
        confirmModalOverlay.classList.add('hidden');
        pendingConfirmCallback = null;
    });

    const showPromptModal = (title, message, defaultValue, callback) => {
        promptModalTitle.textContent = title;
        promptModalMessage.textContent = message;
        promptModalInput.value = defaultValue || '';
        pendingPromptCallback = callback;
        promptModalOverlay.classList.remove('hidden');
        setTimeout(() => {
            promptModalInput.focus();
            promptModalInput.select();
        }, 100);
    };

    promptOkBtn.addEventListener('click', () => {
        if (pendingPromptCallback) pendingPromptCallback(promptModalInput.value);
        promptModalOverlay.classList.add('hidden');
        pendingPromptCallback = null;
    });

    promptCancelBtn.addEventListener('click', () => {
        promptModalOverlay.classList.add('hidden');
        pendingPromptCallback = null;
    });

    promptModalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') promptOkBtn.click();
        if (e.key === 'Escape') promptCancelBtn.click();
    });

    const checkDuplicateName = (name) => {
        if (!name) return null;
        const normalized = name.trim().toLowerCase();
        return companyAddresses.find(a => 
            a.id !== editingId && 
            a.name.trim().toLowerCase() === normalized
        );
    };

    const updateStats = () => {
        const count = selectedIds.length;
        const paddedCount = String(count).padStart(4, '0');
        for (let i = 0; i < 4; i++) {
            const digitEl = document.getElementById(`digit-${i + 1}`);
            if (digitEl) digitEl.textContent = paddedCount[i];
        }
        if (statSelected) statSelected.textContent = count;
    };

    // --- Loading & Saving ---
    const loadSettings = async () => {
        try {
            const resp = await fetch(`${API_BASE}/api/envelope/settings${PROFILE_QUERY}`);
            activeSettings = await resp.json();
            
            // Validate structure
            if (!activeSettings.letterPadData) {
                activeSettings.letterPadData = {};
            }

            // Load company data if exists, else setup default
            if (activeSettings.letterPadData[COMPANY]) {
                const compData = activeSettings.letterPadData[COMPANY];
                companySettings = { ...companySettings, ...compData.settings };
                companyCategories = compData.categories || [];
                companyAddresses = compData.addresses || [];
            } else {
                // Initialize company profile
                activeSettings.letterPadData[COMPANY] = {
                    settings: { ...companySettings },
                    categories: [],
                    addresses: []
                };
                companyCategories = [];
                companyAddresses = [];
            }

            applySettingsToInputs();
            renderCategories();
            renderAddresses();
            
            // Remove loading overlay
            setTimeout(() => {
                const loader = document.getElementById('loading-overlay');
                if (loader) loader.classList.add('fade-out');
            }, 500);

        } catch (err) {
            console.error('Failed to load settings', err);
            showNotification('Error loading profile from server.', 'error', 'Error');
        }
    };

    const saveToServer = async () => {
        // Save current memory caches back into master settings
        activeSettings.letterPadData[COMPANY] = {
            settings: companySettings,
            categories: companyCategories,
            addresses: companyAddresses
        };

        try {
            await fetch(`${API_BASE}/api/envelope/settings${PROFILE_QUERY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeSettings)
            });
        } catch (err) {
            console.error('Failed to save to server', err);
        }
    };

    const applySettingsToInputs = () => {
        if (fontFamilySelect) fontFamilySelect.value = companySettings.fontFamily;
        if (fontSizeSlider) fontSizeSlider.value = fontSizeNum.value = companySettings.fontSize;
        if (fontWeightSelect) fontWeightSelect.value = companySettings.fontWeight;
        if (lineHeightSlider) lineHeightSlider.value = lineHeightNum.value = companySettings.lineHeight;
        if (topMarginSlider) topMarginSlider.value = topMarginNum.value = companySettings.topMargin;
        if (leftMarginSlider) leftMarginSlider.value = leftMarginNum.value = companySettings.leftMargin;
        if (printHeaderCheckbox) printHeaderCheckbox.checked = companySettings.printHeader;
        if (addPrefixCheckbox) addPrefixCheckbox.checked = companySettings.addPrefix;
    };

    const saveSettings = () => {
        companySettings = {
            fontFamily: fontFamilySelect.value,
            fontSize: parseInt(fontSizeSlider.value) || 18,
            fontWeight: fontWeightSelect.value,
            lineHeight: parseFloat(lineHeightSlider.value) || 1.2,
            topMargin: parseInt(topMarginSlider.value) || 50,
            leftMargin: parseInt(leftMarginSlider.value) || 20,
            printHeader: printHeaderCheckbox.checked,
            addPrefix: addPrefixCheckbox.checked
        };

        settingsModal.classList.add('hidden');
        showNotification('Letter Pad layout settings saved successfully! 💾', 'success', 'Saved');
        saveToServer();
    };

    // --- Categories Render & Actions ---
    const renderCategories = () => {
        if (categoryList) {
            categoryList.innerHTML = '';
            
            // Custom Category Boxes
            companyCategories.forEach(cat => {
                const btn = document.createElement('button');
                btn.dataset.cat = cat;
                btn.innerHTML = `<span style="font-size: 1.1rem;">📁</span> <span>${cat}</span>`;
                styleCategoryBox(btn, activeCategoryFilter === cat);
                btn.addEventListener('click', () => {
                    activeCategoryFilter = cat;
                    renderCategories();
                    renderAddresses(searchInput.value);
                });
                categoryList.appendChild(btn);
            });
        }

        // Render in Contact dropdown
        if (inputCategory) {
            const currentValue = inputCategory.value;
            inputCategory.innerHTML = `<option value="">Uncategorized</option>`;
            companyCategories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                inputCategory.appendChild(opt);
            });
            inputCategory.value = currentValue || '';
        }

        renderManageCategoriesList();
    };

    const styleCategoryBox = (btn, isActive) => {
        btn.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; font-weight: 700; font-size: 0.85rem; border-radius: 12px; transition: all 0.25s ease; border: 1px solid rgba(0,0,0,0.04); cursor: pointer; box-sizing: border-box;';
        
        if (isActive) {
            btn.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
            btn.style.color = '#fff';
            btn.style.borderColor = 'transparent';
            btn.style.boxShadow = '0 4px 12px rgba(219, 39, 119, 0.25)';
        } else {
            btn.style.background = 'rgba(255, 255, 255, 0.7)';
            btn.style.color = 'var(--text-secondary)';
            btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.02)';
        }

        // Hover events
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
            if (isActive) {
                btn.style.boxShadow = '0 6px 16px rgba(219, 39, 119, 0.35)';
            } else {
                btn.style.background = 'rgba(255, 255, 255, 0.9)';
                btn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.05)';
                btn.style.color = 'var(--text-primary)';
            }
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'none';
            if (isActive) {
                btn.style.boxShadow = '0 4px 12px rgba(219, 39, 119, 0.25)';
            } else {
                btn.style.background = 'rgba(255, 255, 255, 0.7)';
                btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.02)';
                btn.style.color = 'var(--text-secondary)';
            }
        });
    };

    const renderManageCategoriesList = () => {
        if (!manageCategoryList) return;
        manageCategoryList.innerHTML = '';
        
        if (companyCategories.length === 0) {
            manageCategoryList.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.8rem; text-align: center; padding: 10px;">No categories added yet.</div>';
            return;
        }

        companyCategories.forEach((cat, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #F8FAFC; border-radius: 8px; margin-bottom: 8px; border: 1px solid #E2E8F0;';
            item.innerHTML = `
                <span style="font-weight: 600; font-size: 0.9rem;">${cat}</span>
                <div style="display: flex; gap: 8px;">
                    <button class="edit-cat-btn" data-index="${index}" style="background:none; border:none; color:var(--accent-blue); cursor:pointer; font-size: 0.8rem; font-weight:700;">✏️ Edit</button>
                    <button class="delete-cat-btn" data-index="${index}" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size: 0.8rem; font-weight:700;">🗑️ Delete</button>
                </div>
            `;
            manageCategoryList.appendChild(item);
        });

        // Delete Category listener
        manageCategoryList.querySelectorAll('.delete-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const catName = companyCategories[index];
                showNotification(`Are you sure you want to delete the category "${catName}"? Contacts in this category will become Uncategorized.`, 'confirm', 'Delete Category', () => {
                    companyAddresses.forEach(addr => {
                        if (addr.category === catName) addr.category = "";
                    });
                    companyCategories.splice(index, 1);
                    renderCategories();
                    renderAddresses();
                    saveToServer();
                });
            });
        });

        // Edit Category listener
        manageCategoryList.querySelectorAll('.edit-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const oldName = companyCategories[index];
                
                showPromptModal("Rename Category", `Enter a new name for "${oldName}":`, oldName, (newName) => {
                    if (newName && newName.trim() !== "" && newName.trim() !== oldName) {
                        const trimmedNew = newName.trim();
                        
                        const existingCat = companyCategories.find((c, i) => i !== index && c.toLowerCase() === trimmedNew.toLowerCase());
                        if (existingCat) {
                            showNotification(`Category "${existingCat}" already exists!`, 'warning', 'Duplicate Category');
                            return;
                        }

                        companyAddresses.forEach(addr => {
                            if (addr.category === oldName) addr.category = trimmedNew;
                        });
                        companyCategories[index] = trimmedNew;
                        renderCategories();
                        renderAddresses();
                        saveToServer();
                        showNotification('Category renamed successfully!', 'success', 'Renamed');
                    }
                });
            });
        });
    };

    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            const newCat = newCategoryInput.value.trim();
            if (!newCat) return;

            const existingCat = companyCategories.find(c => c.toLowerCase() === newCat.toLowerCase());
            if (existingCat) {
                showNotification(`Category "${existingCat}" already exists!`, 'warning', 'Duplicate Category');
                return;
            }

            companyCategories.push(newCat);
            newCategoryInput.value = '';
            renderCategories();
            saveToServer();
            showNotification('Category added successfully!', 'success', 'Added');
        });
    }



    // --- Address Rendering & Actions ---
    const renderAddresses = (filter = '') => {
        if (!addressList) return;
        addressList.innerHTML = '';
        
        const cleanFilter = filter.toLowerCase().replace(/[^a-z0-9\s]/gi, '');
        const searchTerms = cleanFilter.trim().split(/\s+/).filter(Boolean);
        
        // Filter contacts
        let filtered = companyAddresses.filter(addr => {
            if (activeCategoryFilter !== 'All' && addr.category !== activeCategoryFilter) return false;
            if (!filter.trim()) return true;
            
            const rawCombinedText = [(addr.name || ''), (addr.address || ''), (addr.phone || ''), (addr.city || ''), (addr.category || '')].join(' ').toLowerCase();
            const cleanCombinedText = rawCombinedText.replace(/[^a-z0-9\s]/gi, '');
            
            return searchTerms.every(term => cleanCombinedText.includes(term));
        });

        // Sort: Selected first, then A-Z
        filtered.sort((a, b) => {
            const aSel = selectedIds.includes(a.id);
            const bSel = selectedIds.includes(b.id);
            if (aSel && !bSel) return -1;
            if (!aSel && bSel) return 1;
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });

        if (filtered.length === 0) {
            addressList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; width: 100%; padding: 40px 10px; font-size: 0.95rem;">No contacts found matching search filter.</div>';
            updateStats();
            return;
        }

        let index = 0;
        filtered.forEach(addr => {
            const card = document.createElement('div');
            card.className = `address-card ${selectedIds.includes(addr.id) ? 'selected' : ''} ${index === searchFocusIndex ? 'keyboard-focus' : ''}`;
            card.dataset.id = addr.id;
            card.innerHTML = `
                <div style="flex: 1; display: flex; align-items: center;">
                    <h4 style="margin: 0; font-size: 1rem;">${addr.name}</h4>
                </div>
                <div class="card-actions">
                    <button class="action-btn delete" data-id="${addr.id}">Delete</button>
                    <button class="action-btn edit" data-id="${addr.id}">Edit</button>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.className.includes('action-btn')) return;
                toggleSelection(addr.id);
            });

            addressList.appendChild(card);
            index++;
        });

        updateStats();
    };

    const toggleSelection = (id) => {
        const idx = selectedIds.indexOf(id);
        if (idx !== -1) {
            selectedIds.splice(idx, 1);
        } else {
            selectedIds.push(id);
        }
        renderAddresses(searchInput.value);
    };

    // --- Dynamic Address Lines Helper ---
    const addAddressLine = (value = "") => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'addr-line-input';
        input.placeholder = "Address Line " + (addressLinesContainer.children.length + 1);
        input.value = value;
        input.autocomplete = 'off';
        input.style.marginBottom = '5px';
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const next = input.nextElementSibling;
                if (next && next.tagName === 'INPUT') {
                    next.focus();
                } else {
                    addAddressLine("");
                    setTimeout(() => addressLinesContainer.lastElementChild.focus(), 10);
                }
            } else if (e.key === 'Backspace' && input.value === '') {
                e.preventDefault();
                const prev = input.previousElementSibling;
                if (prev && prev.tagName === 'INPUT') {
                    prev.focus();
                    input.remove();
                }
            }
        });
        
        addressLinesContainer.appendChild(input);
    };

    addAddrLineBtn.addEventListener('click', () => addAddressLine(""));

    // --- Contact Edit Modal Trigger ---
    addNewBtn.addEventListener('click', () => {
        editingId = null;
        modalTitle.textContent = 'Add New Letter Pad Contact';
        inputName.value = '';
        if (inputCity) inputCity.value = '';
        inputPhone.value = '';
        addressLinesContainer.innerHTML = '';
        addAddressLine("");
        addAddressLine("");
        addAddressLine("");
        if (inputCategory) inputCategory.value = activeCategoryFilter !== 'All' ? activeCategoryFilter : '';
        if (nameWarning) {
            nameWarning.style.display = 'none';
            nameWarning.textContent = '';
        }
        modalOverlay.classList.remove('hidden');
        setTimeout(() => inputName.focus(), 10);
    });

    cancelBtn.addEventListener('click', () => modalOverlay.classList.add('hidden'));

    saveAddressBtn.addEventListener('click', () => {
        const name = inputName.value.trim();
        const city = inputCity ? inputCity.value.trim() : '';
        
        const lineInputs = addressLinesContainer.querySelectorAll('input');
        const address = Array.from(lineInputs)
            .map(i => i.value.trim())
            .filter(v => v !== '')
            .join('\n');

        const phone = inputPhone.value.trim();
        const category = inputCategory ? inputCategory.value : '';

        if (!name || !address) {
            showNotification('Please fill in both name and address.', 'warning', 'Required');
            return;
        }

        const existing = checkDuplicateName(name);
        if (existing) {
            showNotification(`Contact with name "${name}" already exists!`, 'error', 'Duplicate');
            return;
        }

        if (editingId) {
            const index = companyAddresses.findIndex(a => a.id === editingId);
            companyAddresses[index] = { id: editingId, name, city, address, phone, category };
            editingId = null;
        } else {
            companyAddresses.push({ id: Date.now(), name, city, address, phone, category });
        }

        // Sort alphabetically
        companyAddresses.sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

        saveToServer();
        renderAddresses();
        modalOverlay.classList.add('hidden');
        showNotification('Contact saved successfully!', 'success', 'Saved');
    });

    addressList.addEventListener('click', (e) => {
        const rawId = e.target.dataset.id;
        if (!rawId) return;

        if (e.target.classList.contains('delete')) {
            showNotification('Are you sure you want to permanently delete this contact?', 'confirm', 'Confirm Delete', () => {
                companyAddresses = companyAddresses.filter(a => String(a.id) !== rawId);
                const idx = selectedIds.findIndex(id => String(id) === rawId);
                if (idx !== -1) selectedIds.splice(idx, 1);
                saveToServer();
                renderAddresses();
            });
        } else if (e.target.classList.contains('edit')) {
            const addr = companyAddresses.find(a => String(a.id) === rawId);
            if (addr) {
                editingId = addr.id;
                inputName.value = addr.name;
                if (inputCity) inputCity.value = addr.city || '';
                inputPhone.value = addr.phone || '';
                
                addressLinesContainer.innerHTML = '';
                const lines = (addr.address || '').split('\n');
                lines.forEach(line => addAddressLine(line));
                if (lines.length === 0) addAddressLine("");

                if (inputCategory) inputCategory.value = addr.category || '';
                modalTitle.textContent = 'Edit Letter Pad Contact';
                modalOverlay.classList.remove('hidden');
                setTimeout(() => inputName.focus(), 10);
            }
        }
    });

    // --- Search Handlers ---
    searchInput.addEventListener('input', (e) => {
        searchFocusIndex = -1;
        renderAddresses(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        const cards = addressList.querySelectorAll('.address-card');
        if (cards.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (searchFocusIndex < cards.length - 1) searchFocusIndex++;
            renderAddresses(searchInput.value);
            const item = addressList.querySelectorAll('.address-card')[searchFocusIndex];
            if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (searchFocusIndex > 0) searchFocusIndex--;
            renderAddresses(searchInput.value);
            const item = addressList.querySelectorAll('.address-card')[searchFocusIndex];
            if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (searchFocusIndex >= 0 && searchFocusIndex < cards.length) {
                const item = cards[searchFocusIndex];
                const rawId = item.dataset.id;
                const addr = companyAddresses.find(a => String(a.id) === rawId);
                if (addr) toggleSelection(addr.id);
            }
        }
    });

    selectAllBtn.addEventListener('click', () => {
        const filter = searchInput.value;
        const cleanFilter = filter.toLowerCase().replace(/[^a-z0-9\s]/gi, '');
        const searchTerms = cleanFilter.trim().split(/\s+/).filter(Boolean);
        
        companyAddresses.forEach(addr => {
            if (activeCategoryFilter !== 'All' && addr.category !== activeCategoryFilter) return;
            if (filter.trim()) {
                const rawCombinedText = [(addr.name || ''), (addr.address || ''), (addr.phone || ''), (addr.city || ''), (addr.category || '')].join(' ').toLowerCase();
                const cleanCombinedText = rawCombinedText.replace(/[^a-z0-9\s]/gi, '');
                if (!searchTerms.every(term => cleanCombinedText.includes(term))) return;
            }
            if (!selectedIds.includes(addr.id)) selectedIds.push(addr.id);
        });
        renderAddresses(filter);
    });

    unselectAllBtn.addEventListener('click', () => {
        selectedIds = [];
        renderAddresses(searchInput.value);
    });

    // --- Settings Modal Tab Switching ---
    settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            settingsTabBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const target = e.currentTarget.dataset.tab;
            settingsPanes.forEach(p => {
                p.classList.remove('active');
                if (p.id === `pane-${target}`) p.classList.add('active');
            });
        });
    });

    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            applySettingsToInputs();
            settingsModal.classList.remove('hidden');
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            applySettingsToInputs();
            settingsModal.classList.add('hidden');
        });
    }

    saveSettingsBtn.addEventListener('click', saveSettings);

    // --- Slider & Num Input Sync ---
    const syncControls = (slider, num) => {
        if (!slider || !num) return;
        slider.addEventListener('input', () => { num.value = slider.value; });
        num.addEventListener('input', () => { slider.value = num.value; });
    };

    syncControls(fontSizeSlider, fontSizeNum);
    syncControls(lineHeightSlider, lineHeightNum);
    syncControls(topMarginSlider, topMarginNum);
    syncControls(leftMarginSlider, leftMarginNum);

    // --- Print Layout Generation ---
    bulkPrintBtn.addEventListener('click', () => {
        if (selectedIds.length === 0) {
            showNotification('Please select at least one contact to print.', 'warning', 'No selection');
            return;
        }
        const toPrint = selectedIds.map(id => companyAddresses.find(a => a.id === id)).filter(Boolean);
        generatePrintOutput(toPrint);
    });

    const generatePrintOutput = (data) => {
        const root = document.documentElement;

        // Clean up old print styles
        const oldStyle = document.getElementById('dynamic-print-style');
        if (oldStyle) oldStyle.remove();

        const styleTag = document.createElement('style');
        styleTag.id = 'dynamic-print-style';

        // Apply variables
        root.style.setProperty('--print-font-family', companySettings.fontFamily);
        root.style.setProperty('--print-font-size', companySettings.fontSize + 'pt');
        root.style.setProperty('--print-font-weight', companySettings.fontWeight);
        root.style.setProperty('--print-line-height', companySettings.lineHeight);
        root.style.setProperty('--print-top-margin', companySettings.topMargin + 'mm');
        root.style.setProperty('--print-left-margin', companySettings.leftMargin + 'mm');

        styleTag.innerHTML = `
            @media print {
                @page { size: A4 portrait; margin: 0; }
                html, body { margin: 0 !important; padding: 0 !important; }
                .print-only { display: block !important; }
                .app-container { display: none !important; }
            }
            .letterpad-page {
                width: 210mm;
                height: 297mm;
                box-sizing: border-box;
                padding-top: var(--print-top-margin);
                padding-left: var(--print-left-margin);
                padding-right: 20mm;
                position: relative;
                font-family: var(--print-font-family);
                font-size: var(--print-font-size);
                font-weight: var(--print-font-weight);
                line-height: var(--print-line-height);
                page-break-after: always;
                background: #fff;
                color: #000;
            }
            .letterpad-header {
                position: absolute;
                top: 15mm;
                left: 0;
                width: 100%;
                text-align: center;
                border-bottom: 2px double #000;
                padding-bottom: 5px;
            }
            .letterpad-header h1 {
                font-size: 20pt;
                font-weight: 800;
                margin: 0;
                letter-spacing: 2px;
                text-transform: uppercase;
                font-family: 'Montserrat', sans-serif;
            }
            .letterpad-body {
                display: flex;
                flex-direction: column;
            }
            .letterpad-to-prefix {
                margin-bottom: 5px;
                font-weight: 600;
            }
            .letterpad-name-line {
                font-weight: 700;
                text-decoration: underline;
                margin-bottom: 3px;
            }
        `;
        document.head.appendChild(styleTag);

        const printContainer = document.getElementById('print-temp-container');
        printContainer.innerHTML = '';

        data.forEach(item => {
            const page = document.createElement('div');
            page.className = 'letterpad-page';

            let headerHtml = '';
            if (companySettings.printHeader) {
                headerHtml = `
                    <div class="letterpad-header">
                        <h1>${COMPANY}</h1>
                    </div>
                `;
            }

            page.innerHTML = `
                ${headerHtml}
                <div class="letterpad-body">
                    ${companySettings.addPrefix ? '<div class="letterpad-to-prefix">To. M/s,</div>' : ''}
                    <div class="letterpad-name-line">${item.name}</div>
                    <div style="white-space: pre-line;">${item.address}</div>
                    ${item.phone ? `<div style="margin-top: 5px; font-weight: 600;">PH: ${item.phone}</div>` : ''}
                </div>
            `;
            printContainer.appendChild(page);
        });

        // Trigger native print dialog
        const originalTitle = document.title;
        document.title = "";
        setTimeout(() => {
            window.print();
            setTimeout(() => { document.title = originalTitle; }, 50);
        }, 150);
    };

    // --- Startup connection ---
    loadSettings();
});
