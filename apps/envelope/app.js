document.addEventListener('DOMContentLoaded', () => {
    // --- State & DOM Elements ---
    let addresses = [];
    let recycledAddresses = [];
    let senders = []; // Multiple FROM profiles
    let categories = [];
    let activeCategoryFilter = "All";
    let selectedIds = [];
    let editingId = null;
    let editingSenderId = null;
    let searchFocusIndex = -1;
    let pendingConfirmCallback = null;
    let duplicateAlertTimeout = null;
    let activeSettings = {
        envelope: {
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 18,
            fontWeight: "400",
            lineHeight: 1.2,
            topMargin: 40,
            leftMargin: 0,
            rightMargin: 0,
            bottomMargin: 0,
            addPrefix: true,
            rotateText: false
        },
        a5: {
            fontSize: 24,
            topMargin: 40,
            leftMargin: 40, // Default to 40mm to prevent printing off the left edge of physical paper
            addPrefix: false,
            fontWeight: "400",
            lineHeight: 1.2
        },
        letterPadCompanies: []
    };
    const API_BASE = window.location.origin;
    const urlParams = new URLSearchParams(window.location.search);
    const PROFILE = urlParams.get('profile') || '1';
    const PROFILE_QUERY = `?profile=${PROFILE}`;
    
    // Set UI Badge
    setTimeout(() => {
        const badge = document.getElementById('profile-badge');
        if(badge) {
            badge.textContent = PROFILE === '1' ? 'MILTON' : 'VESTER';
            if(PROFILE === '2') badge.style.background = '#f43f5e';
        }
    }, 100);

    // --- Startup Connection Check ---
    const initConnection = async (retries = 12) => {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingStatus = document.getElementById('loading-status');
        const repairBtn = document.getElementById('emergency-repair-btn');

        for (let i = 0; i < retries; i++) {
            try {
                const resp = await fetch(`${API_BASE}/api/envelope/status${PROFILE_QUERY}`);
                if (resp.ok) {
                    const data = await resp.json();
                    console.log('✅ Connected to Envelope Pro Server v' + data.version);
                    
                    if (loadingStatus) loadingStatus.textContent = "Finalizing settings...";
                    
                    // Small delay for smooth transition
                    setTimeout(() => {
                        loadingOverlay.classList.add('fade-out');
                    }, 800);
                    
                    // Load data now that we are connected
                    loadAllData();
                    return;
                }
            } catch (err) {
                console.warn(`Attempt ${i+1}: Server not ready yet...`);
                if (loadingStatus) {
                    const progress = Math.round(((i + 1) / retries) * 100);
                    loadingStatus.innerHTML = `Searching for Server... (${i+1}/${retries})<br><small style="opacity: 0.7; font-size: 0.7rem;">Please wait, system is initializing</small>`;
                    const progressBar = document.querySelector('.loader-progress');
                    if (progressBar) progressBar.style.width = `${progress}%`;
                }
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        // If we get here, connection failed
        if (loadingStatus) {
            loadingStatus.innerHTML = `
                <span style="color: var(--danger); font-weight:700;">CONNECTION DELAYED</span><br>
                <div style="font-size: 0.8rem; margin-top: 10px; line-height: 1.4;">
                    The printer software is taking longer than usual to start.<br>
                    <button onclick="window.location.reload()" class="btn secondary" style="margin-top: 15px; padding: 5px 15px; font-size: 0.8rem;">Try Connecting Again</button>
                </div>`;
            if (repairBtn) repairBtn.classList.remove('hidden');
        }
    };

    const loadAllData = () => {
        loadAddresses();
        loadSettings();
        loadSenders();
        loadCategories();
        loadRecycled();
    };

    if (document.getElementById('emergency-repair-btn')) {
        document.getElementById('emergency-repair-btn').addEventListener('click', () => {
            alert("Please run 'FINAL_DIAGNOSTIC_FIX.bat' from the Envelope Pro folder to repair your system.");
        });
    }

    const addressList = document.getElementById('address-list');
    const searchInput = document.getElementById('search-input');
    const statTotal = document.getElementById('stat-total');
    
    // Categories & Modals
    const categoryList = document.getElementById('category-list');
    const newCategoryInput = document.getElementById('new-category-input');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const inputCategory = document.getElementById('input-category');
    const manageCategoryList = document.getElementById('manage-category-list');
    
    // Letter Pad Controls
    const newCompanyInput = document.getElementById('new-company-input');
    const addCompanyBtn = document.getElementById('add-company-btn');
    const manageCompanyList = document.getElementById('manage-company-list');
    
    const modalOverlay = document.getElementById('modal-overlay');
    const addNewBtn = document.getElementById('add-new-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    const unselectAllBtn = document.getElementById('unselect-all-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveAddressBtn = document.getElementById('save-address-btn');
    const bulkPrintBtn = document.getElementById('bulk-print-btn');
    const modalTitle = document.getElementById('modal-title');
    
    const inputName = document.getElementById('input-name');
    const nameWarning = document.getElementById('name-warning');
    const inputCity = document.getElementById('input-city');
    const addressLinesContainer = document.getElementById('address-lines-container');
    const addAddrLineBtn = document.getElementById('add-addr-line-btn');
    const inputPhone = document.getElementById('input-phone');

    // Confirm Modal
    const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmMessage = document.getElementById('confirm-modal-message');
    
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const reloadBtn = document.getElementById('reload-btn');

    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const shareAppBtn = document.getElementById('share-app-btn');

    // Print Options Modal (Kept for final confirmation)
    const printModalOverlay = document.getElementById('print-modal-overlay');
    const closePrintModal = document.getElementById('close-print-modal');
    const confirmPrintBtn = document.getElementById('confirm-print-btn');
    const modalSenderSelect = document.getElementById('modal-sender-select');
    const printSenderSelector = document.getElementById('print-sender-selector');
    const printFormatRadios = document.getElementsByName('print-format');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const exportExcelModalBtn = document.getElementById('export-excel-modal-btn');

    // Envelope Settings Controls
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
    const rightMarginSlider = document.getElementById('right-margin');
    const rightMarginNum = document.getElementById('right-margin-num');
    const bottomMarginSlider = document.getElementById('bottom-margin');
    const bottomMarginNum = document.getElementById('bottom-margin-num');
    const addPrefix = document.getElementById('add-prefix');
    const rotateText = document.getElementById('rotate-text');

    // A5 Settings Controls
    const a5FontSizeSlider = document.getElementById('a5-font-size');
    const a5FontSizeNum = document.getElementById('a5-font-size-num');
    const a5LineHeightSlider = document.getElementById('a5-line-height');
    const a5LineHeightNum = document.getElementById('a5-line-height-num');
    const a5FontWeightSelect = document.getElementById('a5-font-weight');
    const a5TopMarginSlider = document.getElementById('a5-top-margin');
    const a5TopMarginNum = document.getElementById('a5-top-margin-num');
    const a5LeftMarginSlider = document.getElementById('a5-left-margin');
    const a5LeftMarginNum = document.getElementById('a5-left-margin-num');
    const a5AddPrefix = document.getElementById('a5-add-prefix');

    // Sender Management
    const senderList = document.getElementById('sender-list');
    const senderName = document.getElementById('sender-name');
    const senderAddress = document.getElementById('sender-address');
    const senderPhone = document.getElementById('sender-phone');
    const addSenderBtn = document.getElementById('add-sender-btn');

    // Settings Tab Elements (Supports both old tabs and new menu items)
    const settingsTabBtns = document.querySelectorAll('.settings-menu-item, .settings-tab-btn');
    const settingsPanes = document.querySelectorAll('.settings-pane');
    const settingsMenuList = document.getElementById('settings-menu-list');
    const settingsBackBtn = document.getElementById('settings-back-btn');
    const settingsModalTitle = document.getElementById('settings-modal-title');

    // --- Helper Functions ---
    const checkDuplicateName = (name) => {
        if (!name) return null;
        const normalized = name.trim().toLowerCase();
        return addresses.find(a => 
            a.id !== editingId && 
            a.name.trim().toLowerCase() === normalized
        );
    };

    // --- Core Functions ---
    const saveToLocal = async () => {
        // Always maintain alphabetical order in storage
        addresses.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
        try {
            await fetch(`${API_BASE}/api/envelope/addresses${PROFILE_QUERY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addresses)
            });
            updateStats();
        } catch (err) {
            console.error('Failed to save addresses locally', err);
        }
    };

    const updateStats = () => {
        statTotal.textContent = addresses.length;
        
        const count = selectedIds.length;
        const paddedCount = String(count).padStart(4, '0');
        for (let i = 0; i < 4; i++) {
            const digitEl = document.getElementById(`digit-${i + 1}`);
            if (digitEl) {
                digitEl.textContent = paddedCount[i];
            }
        }
        
        const statSelected = document.getElementById('stat-selected');
        if (statSelected) {
            statSelected.textContent = count;
        }
    };

    // --- Export Logic ---
    const exportToExcel = (data) => {
        if (!data || data.length === 0) {
            showNotification('Please select at least one contact to export.', 'warning', 'No selection');
            return;
        }

        // 1. Sort by Category
        data.sort((a, b) => (a.category || "").localeCompare(b.category || ""));

        // 2. Prepare data with category headers
        const rows = [];
        let lastCategory = null;

        data.forEach(item => {
            const currentCategory = item.category || "Uncategorized";
            if (currentCategory !== lastCategory) {
                // Add a header row for the category
                rows.push({
                    "Name": currentCategory.toUpperCase(),
                    "City": "",
                    "Phone": "",
                    "Category": "",
                    "Address": ""
                });
                lastCategory = currentCategory;
            }
            rows.push({
                "Name": item.name || "",
                "City": item.city || "",
                "Phone": item.phone || "",
                "Category": item.category || "Uncategorized",
                "Address": (item.address || "").replace(/\n/g, ', ')
            });
        });

        // 3. Create Workbook
        const worksheet = XLSX.utils.json_to_sheet(rows);
        
        // 4. Set column widths for A4-friendly look
        worksheet['!cols'] = [
            { wch: 30 }, // Name
            { wch: 20 }, // City
            { wch: 15 }, // Phone
            { wch: 15 }, // Category
            { wch: 50 }  // Address
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");

        // 5. Download
        const selectedFont = activeSettings.envelope.fontFamily.replace(/'/g, "").split(',')[0] || "Arial";
        
        XLSX.writeFile(workbook, `EnvelopePro_Export_${new Date().toLocaleDateString('en-IN').replace(/[\/]/g, '-')}.xlsx`);
        
        showNotification('Excel file exported successfully!', 'success', 'Export Complete');
    };

    const applySettingsToInputs = () => {
        const env = activeSettings.envelope;
        if (fontFamilySelect) fontFamilySelect.value = env.fontFamily;
        if (fontSizeSlider) fontSizeSlider.value = fontSizeNum.value = env.fontSize;
        if (fontWeightSelect) fontWeightSelect.value = env.fontWeight;
        if (lineHeightSlider) lineHeightSlider.value = lineHeightNum.value = env.lineHeight;
        if (topMarginSlider) topMarginSlider.value = topMarginNum.value = env.topMargin;
        if (leftMarginSlider) leftMarginSlider.value = leftMarginNum.value = env.leftMargin;
        if (rightMarginSlider) rightMarginSlider.value = rightMarginNum.value = env.rightMargin;
        if (bottomMarginSlider) bottomMarginSlider.value = bottomMarginNum.value = env.bottomMargin;
        if (addPrefix) addPrefix.checked = env.addPrefix;
        if (rotateText) rotateText.checked = env.rotateText;

        const a5 = activeSettings.a5;
        if (a5FontSizeSlider) a5FontSizeSlider.value = a5FontSizeNum.value = a5.fontSize || 24;
        if (a5TopMarginSlider) a5TopMarginSlider.value = a5TopMarginNum.value = a5.topMargin || 40;
        if (a5LeftMarginSlider) a5LeftMarginSlider.value = a5LeftMarginNum.value = a5.leftMargin || 40;
        if (a5AddPrefix) a5AddPrefix.checked = a5.addPrefix || false;
        if (a5LineHeightSlider) a5LineHeightSlider.value = a5LineHeightNum.value = a5.lineHeight || 1.2;
        if (a5FontWeightSelect) a5FontWeightSelect.value = a5.fontWeight || "400";
    };

    const saveSettings = () => {
        const settings = {
            envelope: {
                fontFamily: fontFamilySelect.value,
                fontSize: parseInt(fontSizeSlider.value) || 18,
                fontWeight: fontWeightSelect.value,
                lineHeight: parseFloat(lineHeightSlider.value) || 1.2,
                topMargin: parseInt(topMarginSlider.value) || 40,
                leftMargin: parseInt(leftMarginSlider.value) || 0,
                rightMargin: parseInt(rightMarginSlider.value) || 0,
                bottomMargin: parseInt(bottomMarginSlider.value) || 0,
                addPrefix: addPrefix.checked,
                rotateText: rotateText.checked
            },
            a5: {
                fontSize: parseInt(a5FontSizeSlider.value) || 24,
                topMargin: parseInt(a5TopMarginSlider.value) || 40,
                leftMargin: parseInt(a5LeftMarginSlider.value) || 0,
                addPrefix: a5AddPrefix.checked,
                lineHeight: parseFloat(a5LineHeightSlider.value) || 1.2,
                fontWeight: a5FontWeightSelect.value
            },
            letterPadCompanies: activeSettings.letterPadCompanies || [],
            letterPadData: activeSettings.letterPadData || {}
        };

        // 1. Instantly update memory and hide settings modal to prevent any UI delay or saving lag
        activeSettings = settings;
        if (settingsModal) settingsModal.classList.add('hidden');
        showNotification('Settings Saved to Disk! 💾', 'success', 'Saved');

        // 2. Execute network request in the background
        saveSettingsToServer();
    };

    const saveSettingsToServer = () => {
        fetch(`${API_BASE}/api/envelope/settings${PROFILE_QUERY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activeSettings)
        }).catch(err => {
            console.error('Failed to save settings to server in background', err);
        });
    };

    const loadSettings = async () => {
        try {
            const resp = await fetch(`${API_BASE}/api/envelope/settings${PROFILE_QUERY}`);
            const saved = await resp.json();
            
            if (saved.envelope) {
                activeSettings.envelope = { ...activeSettings.envelope, ...saved.envelope };
            }
            if (saved.a5) {
                activeSettings.a5 = { ...activeSettings.a5, ...saved.a5 };
            }
            if (saved.letterPadCompanies) {
                activeSettings.letterPadCompanies = saved.letterPadCompanies;
            } else {
                activeSettings.letterPadCompanies = [];
            }
            applySettingsToInputs();
            renderManageCompaniesList();
            renderLetterpadCompanies();
        } catch (err) {
            console.warn('Failed to load settings from server.');
        }
    };

    const loadSenders = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/envelope/senders${PROFILE_QUERY}`);
            senders = await res.json();
            renderSendersList();
            updateSenderDropdown();
        } catch (err) {
            console.warn('Failed to load senders.');
        }
    };

    const saveSenders = async () => {
        try {
            await fetch(`${API_BASE}/api/envelope/senders${PROFILE_QUERY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(senders)
            });
            updateSenderDropdown();
        } catch (err) {
            showNotification('Failed to save senders to disk.', 'error', 'Error');
        }
    };

    // --- Categories Methods ---
    const loadCategories = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/envelope/categories${PROFILE_QUERY}`);
            categories = await res.json();
            renderCategories();
        } catch (err) {
            console.warn('Failed to load categories.');
        }
    };

    const saveCategories = async () => {
        try {
            await fetch(`${API_BASE}/api/envelope/categories${PROFILE_QUERY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categories)
            });
            renderCategories();
        } catch (err) {
            showNotification('Failed to save categories.', 'error', 'Error');
        }
    };

    const renderCategories = () => {
        // Render in Sidebar
        if (categoryList) {
            categoryList.innerHTML = `<button class="category-btn ${activeCategoryFilter === 'All' ? 'active' : ''}" data-cat="All">All Contacts</button>`;
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = `category-btn ${activeCategoryFilter === cat ? 'active' : ''}`;
                btn.dataset.cat = cat;
                btn.textContent = cat;
                categoryList.appendChild(btn);
            });
        }

        // Render in Dropdown
        if (inputCategory) {
            const currentValue = inputCategory.value;
            inputCategory.innerHTML = `<option value="">Uncategorized</option>`;
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                inputCategory.appendChild(opt);
            });
            inputCategory.value = currentValue || '';
        }

        renderManageCategoriesList();
    };

    const renderManageCategoriesList = () => {
        if (!manageCategoryList) return;
        manageCategoryList.innerHTML = '';
        
        categories.forEach((cat, index) => {
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

        // Add Event Listeners for Edit/Delete
        manageCategoryList.querySelectorAll('.delete-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const catName = categories[index];
                showNotification(`Are you sure you want to delete the category "${catName}"? Contacts in this category will become Uncategorized.`, 'confirm', 'Delete Category', async () => {
                    // Update addresses
                    addresses.forEach(addr => {
                        if (addr.category === catName) addr.category = "";
                    });
                    // Remove category
                    categories.splice(index, 1);
                    await saveToLocal(); // Save address changes
                    await saveCategories(); // Save category changes
                });
            });
        });

        manageCategoryList.querySelectorAll('.edit-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const oldName = categories[index];
                
                showPromptModal("Rename Category", `Enter a new name for "${oldName}":`, oldName, (newName) => {
                    if (newName && newName.trim() !== "" && newName.trim() !== oldName) {
                        const trimmedNew = newName.trim();
                        
                        if (trimmedNew.toLowerCase() === 'all') {
                            showNotification('Cannot use "All" as a category name.', 'warning', 'Invalid Name');
                            return;
                        }
                        
                        const existingCat = categories.find((c, i) => i !== index && c.toLowerCase() === trimmedNew.toLowerCase());
                        if (existingCat) {
                            showNotification(`Category "${existingCat}" already exists!`, 'warning', 'Duplicate Category');
                            return;
                        }

                        // Update addresses
                        addresses.forEach(addr => {
                            if (addr.category === oldName) addr.category = trimmedNew;
                        });
                        // Update category name
                        categories[index] = trimmedNew;
                        saveToLocal(); // Save address changes
                        saveCategories(); // Save category changes
                        showNotification('Category renamed successfully!', 'success', 'Renamed');
                    }
                });
            });
        });
    };

    // --- Prompt Modal (Centered Input) ---
    let pendingPromptCallback = null;
    const promptModalOverlay = document.getElementById('prompt-modal-overlay');
    const promptModalInput = document.getElementById('prompt-modal-input');
    const promptModalTitle = document.getElementById('prompt-modal-title');
    const promptModalMessage = document.getElementById('prompt-modal-message');
    const promptOkBtn = document.getElementById('prompt-ok-btn');
    const promptCancelBtn = document.getElementById('prompt-cancel-btn');

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

    if (categoryList) {
        categoryList.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                activeCategoryFilter = e.target.dataset.cat;
                renderCategories();
                renderAddresses(searchInput.value);
            }
        });
    }

    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            const newCat = newCategoryInput.value.trim();
            if (!newCat) return;
            
            if (newCat.toLowerCase() === 'all') {
                showNotification('Cannot use "All" as a category name.', 'warning', 'Invalid Name');
                return;
            }
            
            const existingCat = categories.find(c => c.toLowerCase() === newCat.toLowerCase());
            if (existingCat) {
                showNotification(`Category "${existingCat}" already exists!`, 'warning', 'Duplicate Category');
                return;
            }

            categories.push(newCat);
            newCategoryInput.value = '';
            saveCategories();
            showNotification('Category added successfully!', 'success', 'Added');
        });
    }

    // --- Letter Pad Companies Methods ---
    const renderManageCompaniesList = () => {
        if (!manageCompanyList) return;
        manageCompanyList.innerHTML = '';
        
        const companies = activeSettings.letterPadCompanies || [];
        if (companies.length === 0) {
            manageCompanyList.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.8rem; text-align: center; padding: 10px;">No companies added yet.</div>';
            return;
        }
        
        companies.forEach((company, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #F8FAFC; border-radius: 8px; margin-bottom: 8px; border: 1px solid #E2E8F0;';
            item.innerHTML = `
                <span style="font-weight: 600; font-size: 0.9rem;">${company}</span>
                <div style="display: flex; gap: 8px;">
                    <button class="edit-company-btn" data-index="${index}" style="background:none; border:none; color:var(--accent-blue); cursor:pointer; font-size: 0.8rem; font-weight:700;">✏️ Edit</button>
                    <button class="delete-company-btn" data-index="${index}" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size: 0.8rem; font-weight:700;">🗑️ Delete</button>
                </div>
            `;
            manageCompanyList.appendChild(item);
        });

        // Add Event Listeners for Edit/Delete
        manageCompanyList.querySelectorAll('.delete-company-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const companyName = companies[index];
                showNotification(`Are you sure you want to delete the company "${companyName}"?`, 'confirm', 'Delete Company', () => {
                    activeSettings.letterPadCompanies.splice(index, 1);
                    renderManageCompaniesList();
                    saveSettingsToServer();
                    showNotification('Company deleted successfully!', 'success', 'Deleted');
                });
            });
        });

        manageCompanyList.querySelectorAll('.edit-company-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const oldName = companies[index];
                
                showPromptModal("Rename Company", `Enter a new name for "${oldName}":`, oldName, (newName) => {
                    if (newName && newName.trim() !== "" && newName.trim() !== oldName) {
                        const trimmedNew = newName.trim();
                        
                        const existingCompany = companies.find((c, i) => i !== index && c.toLowerCase() === trimmedNew.toLowerCase());
                        if (existingCompany) {
                            showNotification(`Company "${existingCompany}" already exists!`, 'warning', 'Duplicate Company');
                            return;
                        }

                        activeSettings.letterPadCompanies[index] = trimmedNew;
                        renderManageCompaniesList();
                        saveSettingsToServer();
                        showNotification('Company renamed successfully!', 'success', 'Renamed');
                    }
                });
            });
        });
    };

    if (addCompanyBtn) {
        addCompanyBtn.addEventListener('click', () => {
            const newCompany = newCompanyInput.value.trim();
            if (!newCompany) return;
            
            if (!activeSettings.letterPadCompanies) {
                activeSettings.letterPadCompanies = [];
            }
            
            const existingCompany = activeSettings.letterPadCompanies.find(c => c.toLowerCase() === newCompany.toLowerCase());
            if (existingCompany) {
                showNotification(`Company "${existingCompany}" already exists!`, 'warning', 'Duplicate Company');
                return;
            }

            activeSettings.letterPadCompanies.push(newCompany);
            newCompanyInput.value = '';
            renderManageCompaniesList();
            saveSettingsToServer();
            showNotification('Company added successfully!', 'success', 'Added');
        });
    }

    if (newCompanyInput) {
        newCompanyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCompanyBtn.click();
            }
        });
    }

    const renderSendersList = () => {
        senderList.innerHTML = '';
        if (senders.length === 0) {
            senderList.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.8rem; text-align: center;">No senders saved yet.</div>';
            return;
        }

        senders.forEach(s => {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);';
            div.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 0.9rem;">${s.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${s.phone}</div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="action-btn edit-sender" data-id="${s.id}">Edit</button>
                    <button class="action-btn delete delete-sender" data-id="${s.id}">✖</button>
                </div>
            `;
            senderList.appendChild(div);
        });
    };

    const updateSenderDropdown = () => {
        modalSenderSelect.innerHTML = senders.map(s => 
            `<option value="${s.id}">${s.name}</option>`
        ).join('');
        if (senders.length === 0) {
            modalSenderSelect.innerHTML = '<option value="">(No Senders Found - Add in Settings)</option>';
        }
    };

    addSenderBtn.addEventListener('click', () => {
        const name = senderName.value.trim();
        const address = senderAddress.value.trim();
        const phone = senderPhone.value.trim();
        if (!name || !address || !phone) {
            showNotification('Please fill all sender fields (Name, Address, Phone).', 'warning', 'Invalid Input');
            return;
        }

        if (editingSenderId) {
            const index = senders.findIndex(s => s.id === editingSenderId);
            senders[index] = { id: editingSenderId, name, address, phone };
            editingSenderId = null;
            addSenderBtn.textContent = '+ SAVE SENDER';
        } else {
            senders.push({ id: Date.now(), name, address, phone });
        }

        senderName.value = '';
        senderAddress.value = '';
        senderPhone.value = '';
        saveSenders();
        renderSendersList();
        updateSenderDropdown(); // Sync print modal dropdown
        showNotification('Sender saved!', 'success', 'Saved');
    });

    senderList.addEventListener('click', (e) => {
        const rawId = e.target.dataset.id;
        if (!rawId) return;
        
        if (e.target.classList.contains('delete-sender')) {
            senders = senders.filter(s => String(s.id) !== rawId);
            saveSenders();
            renderSendersList();
            updateSenderDropdown(); // Sync print modal dropdown
        } else if (e.target.classList.contains('edit-sender')) {
            const s = senders.find(x => String(x.id) === rawId);
            if (s) {
                editingSenderId = s.id;
                senderName.value = s.name;
                senderAddress.value = s.address;
                senderPhone.value = s.phone;
                addSenderBtn.textContent = 'UPDATE SENDER';
            }
        }
    });

    const loadAddresses = async () => {
        try {
            const resp = await fetch(`${API_BASE}/api/envelope/addresses${PROFILE_QUERY}`);
            addresses = await resp.json();
            renderAddresses();
            updateStats();
        } catch (err) {
            console.error('Failed to load addresses from server.');
        }
    };

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '??';
        
        const firstWord = parts[0];
        if (firstWord.length === 1 && parts.length > 1) {
            const secondWord = parts[1];
            return (firstWord[0] + secondWord[0]).toUpperCase();
        }
        return firstWord.slice(0, 2).toUpperCase();
    };

    const getPastelColor = (name) => {
        const colors = [
            { bg: 'rgba(59, 130, 246, 0.1)', fg: '#3b82f6' }, // Blue
            { bg: 'rgba(236, 72, 153, 0.1)', fg: '#ec4899' }, // Pink
            { bg: 'rgba(249, 115, 22, 0.1)', fg: '#f97316' }, // Orange
            { bg: 'rgba(16, 185, 129, 0.1)', fg: '#10b981' }, // Green
            { bg: 'rgba(139, 92, 246, 0.1)', fg: '#8b5cf6' }, // Purple
            { bg: 'rgba(245, 158, 11, 0.1)', fg: '#f59e0b' }  // Yellow
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    const renderAddresses = (filter = '') => {
        addressList.innerHTML = '';
        
        // Remove spaces and punctuation from filter
        const cleanFilter = filter.toLowerCase().replace(/[^a-z0-9]/gi, '');
        
        // 1. Filter
        let filtered = addresses.filter(addr => {
            if (activeCategoryFilter !== 'All' && addr.category !== activeCategoryFilter) return false;
            if (!filter.trim()) return true;
            
            const rawNameText = (addr.name || '').toLowerCase();
            // Remove spaces and punctuation from the target text as well
            const cleanNameText = rawNameText.replace(/[^a-z0-9]/gi, '');
            
            return cleanNameText.includes(cleanFilter);
        });

        // 2. Sort: Alphabetical (A-Z)
        filtered.sort((a, b) => {
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });

        let index = 0;
        filtered.forEach(addr => {
            const card = document.createElement('div');
            card.className = `address-card ${selectedIds.includes(addr.id) ? 'selected' : ''} ${index === searchFocusIndex ? 'keyboard-focus' : ''}`;
            card.dataset.id = addr.id;
            
            const initials = getInitials(addr.name);
            const color = getPastelColor(addr.name);
            const displayAddress = addr.address ? addr.address.replace(/\n/g, ', ') : '';

            card.innerHTML = `
                <div style="flex: 1; display: flex; align-items: center; gap: 15px; min-width: 0;">
                    <!-- Initials circle -->
                    <div class="initials-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: ${color.bg}; color: ${color.fg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="ti ti-user" style="font-size: 18px;"></i>
                    </div>
                    <div style="min-width: 0; flex: 1;">
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 5px;">${addr.name}</h4>
                    </div>
                </div>
                
                <div class="card-actions-wrapper" style="display: flex; align-items: center; justify-content: flex-end; width: 70px; height: 40px; position: relative; flex-shrink: 0;">
                    <!-- Default Chevron Icon -->
                    <span class="chevron-icon" style="color: var(--text-secondary); opacity: 0.6; font-size: 16px; transition: opacity 0.2s;">
                        <i class="ti ti-chevron-right"></i>
                    </span>
                    <!-- Hover Action Buttons -->
                    <div class="hover-action-buttons" style="display: none; align-items: center; gap: 6px; position: absolute; right: 0;">
                        <button class="action-btn edit" data-id="${addr.id}" title="Edit" style="padding: 6px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"><i class="ti ti-edit" style="font-size: 14px; pointer-events: none;"></i></button>
                        <button class="action-btn delete" data-id="${addr.id}" title="Delete" style="padding: 6px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"><i class="ti ti-trash" style="font-size: 14px; pointer-events: none;"></i></button>
                    </div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if(e.target.className.includes('action-btn')) return;
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
        searchInput.value = '';
        renderAddresses('');
        searchInput.focus();
    };

    // --- Address Line Helpers ---
    const addAddressLine = (value = "") => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'addr-line-input';
        input.placeholder = "Address Line " + (addressLinesContainer.children.length + 1);
        input.value = value;
        input.autocomplete = 'new-password';
        input.style.marginBottom = '5px';
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const next = input.nextElementSibling;
                if (next && next.tagName === 'INPUT') {
                    next.focus();
                } else {
                    addAddressLine(""); // Automatically add new line on Enter
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

    // --- Unified Notification Helper ---
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

    // --- Modal Interactions ---
    addNewBtn.addEventListener('click', () => {
        editingId = null;
        modalTitle.textContent = 'Add New Address';
        inputName.value = '';
        if (inputCity) inputCity.value = '';
        
        addressLinesContainer.innerHTML = '';
        addAddressLine("");
        addAddressLine("");
        addAddressLine("");

        inputPhone.value = '';
        if (inputCategory) inputCategory.value = '';
        if (duplicateAlertTimeout) clearTimeout(duplicateAlertTimeout);
        if (nameWarning) {
            nameWarning.style.display = 'none';
            nameWarning.textContent = '';
        }
        modalOverlay.classList.remove('hidden');
        setTimeout(() => inputName.focus(), 10);
    });

    cancelBtn.addEventListener('click', () => modalOverlay.classList.add('hidden'));

    inputName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            const name = inputName.value.trim();
            if (name !== '') {
                // Block moving to the next field if name is a duplicate
                const existing = checkDuplicateName(name);
                if (existing) {
                    e.preventDefault(); // Stop default Tab behavior
                    showNotification(`Name already exists in ${existing.category || 'Uncategorized'}!`, 'warning', 'Duplicate Entry');
                    return; // Prevent going to next step
                }
                
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (inputCity) inputCity.focus();
                    else inputPhone.focus();
                }
            }
        }
    });

    inputName.addEventListener('input', () => {
        const name = inputName.value.trim();
        if (!name) {
            nameWarning.style.display = 'none';
            return;
        }
        const existing = checkDuplicateName(name);
        if (existing) {
            nameWarning.textContent = `Already exists in ${existing.category || 'Uncategorized'}!`;
            nameWarning.style.display = 'block';
        } else {
            nameWarning.style.display = 'none';
        }
    });

    if (inputCity) {
        inputCity.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                inputPhone.focus();
            }
        });
    }

    inputPhone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (addressLinesContainer.firstElementChild) {
                addressLinesContainer.firstElementChild.focus();
            }
        }
    });

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

        function saveProcessed() {
            if (editingId) {
                const index = addresses.findIndex(a => a.id === editingId);
                addresses[index] = { ...addresses[index], name, city, address, phone, category };
                editingId = null;
            } else {
                addresses.push({ id: Date.now(), name, city, address, phone, category });
            }
            saveToLocal();
            renderAddresses();
            modalOverlay.classList.add('hidden');
        }

        if (name && address) {
            const existing = checkDuplicateName(name);

            if (existing) {
                const catInfo = existing.category ? `"${existing.category}"` : "Uncategorized";
                showNotification(`Duplicate Entry! (Category: ${catInfo})`, 'error', 'Duplicate');
                return;
            }

            saveProcessed();
        } else {
            showNotification('Please fill in both name and address.', 'warning', 'Required');
        }
    });

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const filter = searchInput.value;
            const cleanFilter = filter.toLowerCase().replace(/[^a-z0-9]/gi, '');
            
            addresses.forEach(addr => {
                if (activeCategoryFilter !== 'All' && addr.category !== activeCategoryFilter) return;
                if (filter.trim()) {
                    const rawNameText = (addr.name || '').toLowerCase();
                    const cleanNameText = rawNameText.replace(/[^a-z0-9]/gi, '');
                    if (!cleanNameText.includes(cleanFilter)) return;
                }
                if (!selectedIds.includes(addr.id)) {
                    selectedIds.push(addr.id);
                }
            });
            renderAddresses(filter);
        });
    }

    if (unselectAllBtn) {
        unselectAllBtn.addEventListener('click', () => {
            selectedIds.length = 0;
            renderAddresses(searchInput.value);
        });
    }

    searchInput.addEventListener('input', (e) => {
        searchFocusIndex = -1;
        renderAddresses(e.target.value);
        
        // Show/hide clear button dynamically
        const searchClearBtn = document.getElementById('search-clear-btn');
        if (searchClearBtn) {
            if (e.target.value.trim().length > 0) {
                searchClearBtn.classList.remove('hidden');
            } else {
                searchClearBtn.classList.add('hidden');
            }
        }
    });

    const searchClearBtn = document.getElementById('search-clear-btn');
    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchClearBtn.classList.add('hidden');
            searchFocusIndex = -1;
            renderAddresses('');
        });
    }

    searchInput.addEventListener('keydown', (e) => {
        const cards = addressList.querySelectorAll('.address-card');
        if (cards.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (searchFocusIndex < cards.length - 1) {
                searchFocusIndex = searchFocusIndex + 1;
            }
            renderAddresses(searchInput.value);
            const focusedItem = addressList.querySelectorAll('.address-card')[searchFocusIndex];
            if (focusedItem) focusedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (searchFocusIndex > 0) {
                searchFocusIndex = searchFocusIndex - 1;
            }
            renderAddresses(searchInput.value);
            const focusedItem = addressList.querySelectorAll('.address-card')[searchFocusIndex];
            if (focusedItem) focusedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (searchFocusIndex >= 0 && searchFocusIndex < cards.length) {
                const focusedItem = cards[searchFocusIndex];
                const rawId = focusedItem.dataset.id;
                const addr = addresses.find(a => String(a.id) === rawId);
                if (addr) toggleSelection(addr.id);
            }
        }
    });

    const letterPadBtn = document.getElementById('letter-pad-btn');
    const letterpadModal = document.getElementById('letterpad-modal');
    const closeLetterpadModal = document.getElementById('close-letterpad-modal');
    const letterpadCompanyList = document.getElementById('letterpad-company-list');

    if (letterPadBtn && letterpadModal) {
        letterPadBtn.addEventListener('click', () => {
            renderLetterpadCompanies();
            letterpadModal.classList.remove('hidden');
        });
    }

    if (closeLetterpadModal && letterpadModal) {
        closeLetterpadModal.addEventListener('click', () => {
            letterpadModal.classList.add('hidden');
        });
    }

    const renderLetterpadCompanies = () => {
        if (!letterpadCompanyList) return;
        letterpadCompanyList.innerHTML = '';
        
        const companies = activeSettings.letterPadCompanies || [];
        if (companies.length === 0) {
            letterpadCompanyList.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding: 20px 10px;">
                    <p style="margin: 0 0 10px 0; font-size: 0.9rem;">No companies added yet.</p>
                    <button id="go-to-settings-letterpad" class="btn secondary" style="font-size: 0.8rem; padding: 6px 12px; margin: 0 auto; display: flex; align-items: center; gap: 5px;">⚙️ Add in Settings</button>
                </div>
            `;
            const goBtn = document.getElementById('go-to-settings-letterpad');
            if (goBtn) {
                goBtn.addEventListener('click', () => {
                    letterpadModal.classList.add('hidden');
                    // Open settings modal and select letterpad tab
                    if (openSettingsBtn) openSettingsBtn.click();
                    const letterpadTabBtn = Array.from(settingsTabBtns).find(btn => btn.dataset.tab === 'letterpad');
                    if (letterpadTabBtn) letterpadTabBtn.click();
                });
            }
            return;
        }

        companies.forEach(company => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.cssText = 'width: 100%; text-align: left; padding: 12px 15px; font-weight: 600; font-size: 0.95rem; justify-content: flex-start; background: #fff; border: 1px solid #E2E8F0; color: var(--text-primary); border-radius: var(--radius-md); transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 10px; margin-bottom: 8px; cursor: pointer;';
            btn.innerHTML = `<span style="font-size: 1.2rem;">🏢</span> <span>${company}</span>`;
            
            // Premium hover effects
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'linear-gradient(135deg, #f59e0b, #ea580c)';
                btn.style.color = '#fff';
                btn.style.borderColor = 'transparent';
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.2)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#fff';
                btn.style.color = 'var(--text-primary)';
                btn.style.borderColor = '#E2E8F0';
                btn.style.transform = 'none';
                btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            });

            btn.addEventListener('click', () => {
                letterpadModal.classList.add('hidden');
                window.location.href = `letterpad.html?company=${encodeURIComponent(company)}&profile=${PROFILE}`;
            });

            letterpadCompanyList.appendChild(btn);
        });
    };

    // --- Key Shortcuts ---
    window.addEventListener('keydown', (e) => {
        // Ctrl + P shortcut for printing selected contacts - Robust detection and prevention
        if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyP' || e.key === 'p' || e.key === 'P')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (bulkPrintBtn) bulkPrintBtn.click();
        }
    });

    addressList.addEventListener('click', (e) => {
        const rawId = e.target.dataset.id;
        if (!rawId) return;
        
        if (e.target.classList.contains('delete')) {
            showNotification('Are you sure you want to delete this contact?', 'confirm', 'Confirm Delete', () => {
                const deletedItem = addresses.find(a => String(a.id) === rawId);
                addresses = addresses.filter(a => String(a.id) !== rawId);
                const idx = selectedIds.findIndex(id => String(id) === rawId);
                if (idx !== -1) selectedIds.splice(idx, 1);
                saveToLocal();
                renderAddresses();
                if (deletedItem) {
                    recycledAddresses.push({ ...deletedItem, deletedAt: new Date().toISOString() });
                    saveRecycled();
                    showNotification(`"${deletedItem.name}" moved to Recycle Bin!`, 'success', 'Moved to Trash');
                }
            });
        } else if (e.target.classList.contains('edit')) {
            const addr = addresses.find(a => String(a.id) === rawId);
            if (addr) {
                editingId = addr.id;
                inputName.value = addr.name;
                if (inputCity) inputCity.value = addr.city || '';
                
                // Clear and add lines dynamically
                addressLinesContainer.innerHTML = '';
                const lines = (addr.address || '').split('\n');
                lines.forEach(line => addAddressLine(line));
                if (lines.length === 0) addAddressLine("");

                inputPhone.value = addr.phone || '';
                if (inputCategory) inputCategory.value = addr.category || '';
                modalTitle.textContent = 'Edit Address';
                if (duplicateAlertTimeout) clearTimeout(duplicateAlertTimeout);
                if (nameWarning) {
                    nameWarning.style.display = 'none';
                    nameWarning.textContent = '';
                }
                modalOverlay.classList.remove('hidden');
                setTimeout(() => inputName.focus(), 10);
            }
        }
    });

    // --- Print Logic ---
    bulkPrintBtn.addEventListener('click', () => {
        if (selectedIds.length === 0) {
            showNotification('Please select at least one address to print.', 'warning', 'No selection');
            return;
        }
        // Reset modal selections to default (Envelope) on open to prevent layout/UI mismatches
        const defaultRadio = document.querySelector('input[name="print-format"][value="envelope"]');
        if (defaultRadio) defaultRadio.checked = true;
        if (printSenderSelector) printSenderSelector.classList.add('hidden');
        if (exportExcelModalBtn) exportExcelModalBtn.classList.add('hidden');
        
        printModalOverlay.classList.remove('hidden');
    });

    closePrintModal.addEventListener('click', () => printModalOverlay.classList.add('hidden'));

    // Radio button changes to toggle sender dropdown
    printFormatRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'a5') {
                printSenderSelector.classList.remove('hidden');
                exportExcelModalBtn.classList.add('hidden');
            } else if (radio.value === 'a4-list') {
                printSenderSelector.classList.add('hidden');
                exportExcelModalBtn.classList.remove('hidden');
            } else {
                printSenderSelector.classList.add('hidden');
                exportExcelModalBtn.classList.add('hidden');
            }
        });
    });

    confirmPrintBtn.addEventListener('click', () => {
        const checkedRadio = document.querySelector('input[name="print-format"]:checked');
        const selectedFormat = checkedRadio ? checkedRadio.value : 'envelope';
        const selectedSenderId = modalSenderSelect.value;
        const toPrint = selectedIds.map(id => addresses.find(a => a.id === id)).filter(Boolean);
        
        generatePrintOutput(toPrint, selectedFormat, selectedSenderId);
        printModalOverlay.classList.add('hidden');
    });

    const generatePrintOutput = (data, layoutType, senderId) => {
        if (!data || data.length === 0) return; // Failsafe for empty data

        const root = document.documentElement;
        
        // Remove any existing dynamic print styles
        const oldStyle = document.getElementById('dynamic-print-style');
        if (oldStyle) oldStyle.remove();

        const styleTag = document.createElement('style');
        styleTag.id = 'dynamic-print-style';
        
        let pageSize = 'auto';
        
        const env = activeSettings.envelope;
        const a5 = activeSettings.a5;

        // Apply Correct Settings based on format (Explicitly set/reset all properties to prevent bleed-over)
        if (layoutType === 'a4-list') {
            pageSize = 'A4 portrait';
            root.style.setProperty('--print-font-family', env.fontFamily);
            root.style.setProperty('--print-font-size', '12pt');
            root.style.setProperty('--print-font-weight', '400');
            root.style.setProperty('--print-line-height', '1.2');
            root.style.setProperty('--print-top-margin', '0mm');
            root.style.setProperty('--print-left-margin', '0mm');
            root.style.setProperty('--print-right-margin', '0mm');
            root.style.setProperty('--print-bottom-margin', '0mm');
        } else if (layoutType === 'a5') {
            pageSize = '210mm 148mm landscape'; // Explicit landscape orientation for A5
            root.style.setProperty('--print-font-family', env.fontFamily);
            root.style.setProperty('--print-font-size', a5.fontSize + 'pt');
            root.style.setProperty('--print-font-weight', a5.fontWeight || '400');
            root.style.setProperty('--print-line-height', a5.lineHeight || 1.2);
            root.style.setProperty('--print-top-margin', (a5.topMargin || 10) + 'mm');
            root.style.setProperty('--print-left-margin', a5.leftMargin + 'mm');
            root.style.setProperty('--print-right-margin', '0mm');
            root.style.setProperty('--print-bottom-margin', '0mm');
        } else {
            pageSize = '265mm 114mm landscape'; // Synced with CSS height to avoid blank page
            root.style.setProperty('--print-font-family', env.fontFamily);
            root.style.setProperty('--print-font-size', env.fontSize + 'pt');
            root.style.setProperty('--print-font-weight', env.fontWeight);
            root.style.setProperty('--print-line-height', env.lineHeight);
            root.style.setProperty('--print-top-margin', env.topMargin + 'mm');
            root.style.setProperty('--print-left-margin', env.leftMargin + 'mm');
            root.style.setProperty('--print-right-margin', env.rightMargin + 'mm');
            root.style.setProperty('--print-bottom-margin', env.bottomMargin + 'mm');
        }

        styleTag.innerHTML = `
            @media print { 
                @page { size: ${pageSize}; margin: 0; } 
                html, body { margin: 0 !important; padding: 0 !important; }
            }
        `;
        document.head.appendChild(styleTag);

        const addPrefixChecked = layoutType === 'a5' ? a5.addPrefix : env.addPrefix;
        const rotateTextChecked = env.rotateText;

        // Populate Print Area
        const printArea = document.getElementById('print-temp-container');
        if (!printArea) {
            // Recreate if missing (failsafe)
            const div = document.createElement('div');
            div.id = 'print-temp-container';
            div.className = 'print-only';
            document.body.appendChild(div);
        }
        const actualPrintArea = document.getElementById('print-temp-container');
        actualPrintArea.innerHTML = '';
        actualPrintArea.className = `print-only format-${layoutType}`;

        const activeSender = senders.find(s => s.id == senderId) || {
            name: "MILTON GAREMENTS PRIVATE LIMITED",
            address: "TIRUPUR - 641604",
            phone: "9787243465"
        };

        if (layoutType === 'a4-list') {
            const page = document.createElement('div');
            // Check if there is an active category filter applied for title
            const listTitle = (typeof activeCategoryFilter !== 'undefined' && activeCategoryFilter !== 'All') 
                ? activeCategoryFilter + ' Name List' 
                : 'Selected Contacts List';

            // Group by category for A4 list (Thai Thai yaa)
            data.sort((a, b) => (a.category || "").localeCompare(b.category || ""));

            let tableRows = '';
            let lastCategory = null;
            data.forEach((item) => {
                const currentCategory = item.category || "Uncategorized";
                
                // Add Category Header Row
                if (currentCategory !== lastCategory) {
                    tableRows += `
                        <tr class="a4-category-row">
                            <td colspan="2">${currentCategory.toUpperCase()}</td>
                        </tr>
                    `;
                    lastCategory = currentCategory;
                }

                tableRows += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.city || '-'}</td>
                    </tr>
                `;
            });

            page.innerHTML = `
                <h1>${listTitle}</h1>
                <table class="a4-print-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>City</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `;
            actualPrintArea.appendChild(page);
        } else {
            data.forEach(item => {
                const page = document.createElement('div');
                page.className = 'envelope-page';
                if (layoutType === 'envelope') page.classList.add('format-envelope');
                if (layoutType === 'a5') page.classList.add('format-a5');

                let html = '';
                if (layoutType === 'a5') {
                    html = `
                        <div class="to-section">
                            <div class="label">
                                TO :
                            </div>
                            <div class="address-content">
                                ${addPrefixChecked ? '<div style="margin-bottom: 5px;">To. M/s,</div>' : ''}
                                <div class="name-line" style="font-weight:inherit;">${item.name}</div>
                                <div>${item.address.replace(/\n/g, '<br>')}</div>
                                ${item.phone ? `<div style="margin-top: 5px;">PH: ${item.phone}</div>` : ''}
                            </div>
                        </div>
                        <div class="from-section">
                            <div class="label">FROM :</div>
                            <div class="address-content">
                                <div>${activeSender.name || 'MILTON GARMENTS'}</div>
                                <div>${activeSender.address || 'TIRUPUR - 641604'}</div>
                                <div>PH: ${activeSender.phone || '9787243465'}</div>
                            </div>
                        </div>
                    `;
                } else {
                    html = `<div class="address-content ${rotateTextChecked ? 'rotated-90' : ''}">`;
                    if (addPrefixChecked) html += `<div style="margin-bottom: 2px;">To. M/s,</div>`;
                    html += `<div class="name-line">${item.name}</div>` +
                            `<div>${item.address.replace(/\n/g, '<br>')}</div>` +
                            (item.phone ? `<div style="margin-top: 2px;">PH: ${item.phone}</div>` : '') +
                            `</div>`;
                }
                page.innerHTML = html;
                actualPrintArea.appendChild(page);
            });
        }

        // Trigger Print with small delay to ensure DOM is rendered (prevents blank pages)
        const originalTitle = document.title;
        document.title = ""; 
        
        setTimeout(() => {
            window.print();
            setTimeout(() => { document.title = originalTitle; }, 50);
        }, 150);
    };

    // --- Setup & Initialization ---
    const syncControls = (slider, num) => {
        if (!slider || !num) return;
        slider.addEventListener('input', () => { num.value = slider.value; });
        num.addEventListener('input', () => { slider.value = num.value; });
    };

    syncControls(fontSizeSlider, fontSizeNum);
    syncControls(lineHeightSlider, lineHeightNum);
    syncControls(topMarginSlider, topMarginNum);
    syncControls(leftMarginSlider, leftMarginNum);
    syncControls(rightMarginSlider, rightMarginNum);
    syncControls(bottomMarginSlider, bottomMarginNum);
    syncControls(a5FontSizeSlider, a5FontSizeNum);
    syncControls(a5LineHeightSlider, a5LineHeightNum);
    syncControls(a5TopMarginSlider, a5TopMarginNum);
    syncControls(a5LeftMarginSlider, a5LeftMarginNum);



    unselectAllBtn.addEventListener('click', () => {
        selectedIds = [];
        renderAddresses(searchInput.value);
    });

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => location.reload());
    }

    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            applySettingsToInputs();
            goBackToSettingsMenu();
            settingsModal.classList.remove('hidden');
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            applySettingsToInputs();
            goBackToSettingsMenu();
            settingsModal.classList.add('hidden');
        });
    }
    if (shareAppBtn) {
        shareAppBtn.addEventListener('click', async () => {
            try {
                const res = await fetch(`${API_BASE}/api/server-info`);
                if (res.ok) {
                    const data = await res.json();
                    const url = `http://${data.ip}:${data.port}/envelope`;
                    showNotification(`Access Envelope Pro from any phone or PC on your Wi-Fi by visiting:\n\n${url}\n\n⚠️ Keep this computer running to access the app.`, 'info', '🔗 Network Share');
                }
            } catch (err) {
                showNotification('Failed to get server info', 'error', 'Error');
            }
        });
    }

    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => {
            const toExport = selectedIds.map(id => addresses.find(a => a.id === id)).filter(Boolean);
            exportToExcel(toExport);
        });
    }

    if (exportExcelModalBtn) {
        exportExcelModalBtn.addEventListener('click', () => {
            const toExport = selectedIds.map(id => addresses.find(a => a.id === id)).filter(Boolean);
            exportToExcel(toExport);
            printModalOverlay.classList.add('hidden');
        });
    }

    // Back to Settings Menu helper
    const goBackToSettingsMenu = () => {
        if (settingsMenuList) settingsMenuList.classList.remove('hidden');
        if (settingsBackBtn) settingsBackBtn.classList.add('hidden');
        if (settingsModalTitle) settingsModalTitle.textContent = '⚙️ System Settings';
        
        settingsPanes.forEach(pane => pane.classList.remove('active'));
        if (saveSettingsBtn) saveSettingsBtn.classList.add('hidden');

        // Reset active state for old layout accordion buttons
        settingsTabBtns.forEach(b => {
            b.classList.remove('active');
            const icon = b.querySelector('.accordion-icon');
            if (icon) icon.textContent = '▶';
        });
    };

    if (settingsBackBtn) {
        settingsBackBtn.addEventListener('click', goBackToSettingsMenu);
    }

    settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentBtn = e.currentTarget;
            const target = currentBtn.dataset.tab;
            console.log('Opening/Toggling settings tab/page:', target);
            
            // Check if this pane is already active to toggle it close
            const activePane = document.getElementById(`pane-${target}`);
            const isAlreadyActive = activePane && activePane.classList.contains('active');
            
            if (isAlreadyActive) {
                goBackToSettingsMenu();
                return;
            }
            
            // Check if we are in the new menu navigation mode
            if (settingsMenuList) {
                // New layout: Hide menu list, show back button and title
                settingsMenuList.classList.add('hidden');
                if (settingsBackBtn) settingsBackBtn.classList.remove('hidden');
                if (settingsModalTitle) {
                    const sectionNames = {
                        envelope: '✉️ Envelope Settings',
                        a5: '📄 A5 Paper Settings',
                        categories: '📁 Manage Categories',
                        letterpad: '📝 Manage Letter Pad'
                    };
                    settingsModalTitle.textContent = sectionNames[target] || 'System Settings';
                }
                
                // Show active pane & Save Settings Button
                settingsPanes.forEach(p => {
                    p.classList.remove('active');
                    if (p.id === `pane-${target}`) {
                        p.classList.add('active');
                    }
                });
                if (saveSettingsBtn) saveSettingsBtn.classList.remove('hidden');
            } else {
                // Old layout fallback: Switch active class on buttons
                settingsTabBtns.forEach(b => {
                    b.classList.remove('active');
                    const icon = b.querySelector('.accordion-icon');
                    if (icon) icon.textContent = '▶';
                });
                currentBtn.classList.add('active');
                const activeIcon = currentBtn.querySelector('.accordion-icon');
                if (activeIcon) activeIcon.textContent = '▼';
                
                // Switch active classes on panes
                settingsPanes.forEach(p => {
                    p.classList.remove('active');
                    if (p.id === `pane-${target}`) {
                        p.classList.add('active');
                    }
                });
            }
        });
    });

    // --- Recycle Bin Logic ---
    const loadRecycled = async () => {
        try {
            const resp = await fetch(`${API_BASE}/api/envelope/recycle${PROFILE_QUERY}`);
            recycledAddresses = await resp.json();
            renderRecycleBin();
        } catch (err) {
            console.error('Failed to load recycled items:', err);
        }
    };

    const saveRecycled = async () => {
        try {
            await fetch(`${API_BASE}/api/envelope/recycle${PROFILE_QUERY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recycledAddresses)
            });
            renderRecycleBin();
        } catch (err) {
            console.error('Failed to save recycled items:', err);
        }
    };

    const renderRecycleBin = () => {
        const recycleList = document.getElementById('recycle-list');
        const recycleEmptyMsg = document.getElementById('recycle-empty-msg');
        if (!recycleList || !recycleEmptyMsg) return;
        
        recycleList.innerHTML = '';
        
        // Auto-cleanup: filter out items older than 15 days on client side as a safeguard
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        recycledAddresses = recycledAddresses.filter(item => {
            if (!item.deletedAt) return true;
            return new Date(item.deletedAt) >= fifteenDaysAgo;
        });
        
        if (recycledAddresses.length === 0) {
            recycleEmptyMsg.classList.remove('hidden');
            recycleList.classList.add('hidden');
            return;
        }
        
        recycleEmptyMsg.classList.add('hidden');
        recycleList.classList.remove('hidden');
        
        // Sort recycled items by deletion date (newest first)
        recycledAddresses.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
        
        recycledAddresses.forEach(item => {
            const delDate = new Date(item.deletedAt);
            const diffTime = Math.max(0, new Date(delDate.getTime() + 15 * 24 * 60 * 60 * 1000) - new Date());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; margin-bottom: 8px; transition: all 0.2s;';
            div.innerHTML = `
                <div style="flex: 1; min-width: 0; padding-right: 15px; text-align: left;">
                    <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.city || ''} ${item.phone ? '• PH: ' + item.phone : ''}</div>
                    <div style="font-size: 0.7rem; color: #ef4444; font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                        🕒 ${diffDays} day${diffDays !== 1 ? 's' : ''} left
                    </div>
                </div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <button class="btn secondary restore-btn" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.75rem; border-color: rgba(56, 189, 248, 0.3); color: #38bdf8; background: rgba(56, 189, 248, 0.05);">Restore</button>
                    <button class="btn secondary perm-delete-btn" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.75rem; border-color: rgba(239, 68, 68, 0.3); color: #ef4444; background: rgba(239, 68, 68, 0.05);">Delete</button>
                </div>
            `;
            
            // Restore button handler
            div.querySelector('.restore-btn').addEventListener('click', () => {
                recycledAddresses = recycledAddresses.filter(r => String(r.id) !== String(item.id));
                if (!addresses.some(a => String(a.id) === String(item.id))) {
                    const { deletedAt, ...rest } = item;
                    addresses.push(rest);
                }
                saveToLocal();
                saveRecycled();
                renderAddresses();
                showNotification(`"${item.name}" restored to Address Book!`, 'success', 'Restored');
            });
            
            // Permanent delete button handler
            div.querySelector('.perm-delete-btn').addEventListener('click', () => {
                showNotification(`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`, 'confirm', 'Delete Permanently', () => {
                    recycledAddresses = recycledAddresses.filter(r => String(r.id) !== String(item.id));
                    saveRecycled();
                    showNotification(`"${item.name}" permanently deleted!`, 'success', 'Deleted');
                });
            });
            
            recycleList.appendChild(div);
        });
    };

    const recycleBinBtn = document.getElementById('recycle-bin-btn');
    const recycleBinModal = document.getElementById('recycle-bin-modal');
    const closeRecycleModal = document.getElementById('close-recycle-modal');
    
    if (recycleBinBtn && recycleBinModal) {
        recycleBinBtn.addEventListener('click', () => {
            loadRecycled();
            recycleBinModal.classList.remove('hidden');
        });
    }
    if (closeRecycleModal && recycleBinModal) {
        closeRecycleModal.addEventListener('click', () => {
            recycleBinModal.classList.add('hidden');
        });
    }

    // --- Notebook Logic ---
    let notebookNotes = [];
    const notebookTextarea = document.getElementById('notebook-textarea');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const notebookNotesList = document.getElementById('notebook-notes-list');

    const renderNotebookNotes = () => {
        if (!notebookNotesList) return;
        notebookNotesList.innerHTML = '';
        
        if (notebookNotes.length === 0) {
            notebookNotesList.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem; padding: 20px; opacity: 0.6;">
                    No notes saved yet.
                </div>
            `;
            return;
        }

        notebookNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.innerHTML = `
                <span class="note-text"></span>
                <span class="note-time">${note.time}</span>
                <button class="delete-note-btn" title="Delete Note"><i class="ti ti-trash"></i></button>
            `;
            card.querySelector('.note-text').textContent = note.text;

            // Click event to search/filter contacts in center page
            card.addEventListener('click', (e) => {
                if (e.target.closest('.delete-note-btn')) return;
                
                const searchInput = document.getElementById('search-input');
                const searchClearBtn = document.getElementById('search-clear-btn');
                if (searchInput) {
                    searchInput.value = note.text;
                    if (searchClearBtn) searchClearBtn.classList.remove('hidden');
                    const event = new Event('input', { bubbles: true });
                    searchInput.dispatchEvent(event);
                }
            });

            // Delete event handler
            card.querySelector('.delete-note-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Stop card click from triggering
                showNotification('Are you sure you want to delete this note?', 'confirm', 'Delete Note', () => {
                    notebookNotes = notebookNotes.filter(n => n.id !== note.id);
                    localStorage.setItem('envelope_notebook_notes', JSON.stringify(notebookNotes));
                    
                    // If the current search input matches the deleted note's text, clear the search filter
                    const searchInput = document.getElementById('search-input');
                    if (searchInput && searchInput.value === note.text) {
                        searchInput.value = '';
                        const event = new Event('input', { bubbles: true });
                        searchInput.dispatchEvent(event);
                    }
                    
                    renderNotebookNotes();
                    showNotification('Note deleted!', 'success', 'Deleted');
                });
            });

            notebookNotesList.appendChild(card);
        });
    };

    if (saveNoteBtn && notebookTextarea) {
        saveNoteBtn.addEventListener('click', () => {
            const text = notebookTextarea.value.trim();
            if (!text) {
                showNotification('Please enter some text before saving.', 'warning', 'Empty Note');
                return;
            }

            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + now.toLocaleDateString([], { month: 'short', day: 'numeric' });

            const newNote = {
                id: Date.now(),
                text: text,
                time: timeStr
            };

            notebookNotes.unshift(newNote);
            localStorage.setItem('envelope_notebook_notes', JSON.stringify(notebookNotes));
            notebookTextarea.value = '';
            renderNotebookNotes();
            showNotification('Note saved successfully!', 'success', 'Saved');
        });
    }

    // Load initial notes
    try {
        notebookNotes = JSON.parse(localStorage.getItem('envelope_notebook_notes')) || [];
    } catch (e) {
        console.error('Failed to parse envelope notes:', e);
        notebookNotes = [];
    }
    renderNotebookNotes();

    // --- Initialization ---
    initConnection();
});
