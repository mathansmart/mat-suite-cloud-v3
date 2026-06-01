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
        fontSize: 14,
        fontWeight: "400",
        fontStyle: "normal",
        textDecoration: "none",
        textAlign: "left",
        lineHeight: 1.2,
        topMargin: 50,
        leftMargin: 20,
        rightMargin: 20,
        printHeader: true,
        headerStyle: 'standard',
        useCustomHeader: false,
        headerImage: null,
        addPrefix: true,
        // Milton Premium layout customizer fields
        miltonLogoTop: "Quality is our motto",
        miltonLogoMid: "MILTON",
        miltonLogoBot: "Garments",
        miltonLogoImg: null,
        miltonCenterName: "MILTON GARMENTS PRIVATE LIMITED",
        miltonCenterSubtitle: "Manufacturers Fancy Hosiery",
        miltonCenterAddress1: "12, SRI KANCHI KAMATCHI NAGAR, KANGAYAM PALAYAM PUDUR,",
        miltonCenterAddress2: "KANGAYAM ROAD, TIRUPUR - 641 604.",
        miltonCenterContact: "E-mail: miltongarmentsprivatelimited@gmail.com &nbsp;&middot;&nbsp; Web: www.miltongarments.com",
        miltonRightPhone1: "0421-2428545",
        miltonRightPhone2: "0421-2429439",
        miltonRightWhatsapp: "99526 07134",
        miltonRightGstin: "33AAQCM3608R1ZU"
    };
    let companyCategories = [];
    let companyAddresses = [];

    let activeCategoryFilter = "All";
    let selectedIds = [];
    let editingId = null;
    let editingOriginalName = null;
    let searchFocusIndex = -1;
    let pendingConfirmCallback = null;
    let duplicateAlertTimeout = null;

    // --- DOM Elements ---
    document.getElementById('selected-company-badge').textContent = COMPANY;
    document.title = `${COMPANY} - Letter Pad Suite`;
    
    const backBtn = document.getElementById('back-to-addressbook-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `index.html${PROFILE_QUERY}`;
        });
    }

    const addressList = document.getElementById('address-list');
    const searchInput = document.getElementById('search-input');
    
    // Counter
    const statSelected = document.getElementById('stat-selected');
    
    // Sidebar Controls
    const addNewBtn = document.getElementById('add-new-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    const unselectAllBtn = document.getElementById('unselect-all-btn');
    const bulkPrintBtn = document.getElementById('bulk-print-btn');
    const bulkPdfBtn = document.getElementById('bulk-pdf-btn');
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
    const rightMarginSlider = document.getElementById('right-margin');
    const rightMarginNum = document.getElementById('right-margin-num');
    const printHeaderCheckbox = document.getElementById('print-header');
    const useCustomHeaderCheckbox = document.getElementById('use-custom-header');
    const headerStyleSelect = document.getElementById('header-style');
    const customHeaderUploadWrapper = document.getElementById('custom-header-upload-wrapper');
    const customHeaderFile = document.getElementById('custom-header-file');
    const customHeaderPreviewContainer = document.getElementById('custom-header-preview-container');
    const removeCustomHeaderBtn = document.getElementById('remove-custom-header-btn');
    const addPrefixCheckbox = document.getElementById('add-prefix');

    // Milton Customizer inputs
    const settingMiltonLogoTop = document.getElementById('setting-milton-logo-top');
    const settingMiltonLogoMid = document.getElementById('setting-milton-logo-mid');
    const settingMiltonLogoBot = document.getElementById('setting-milton-logo-bot');
    const settingMiltonLogoFile = document.getElementById('setting-milton-logo-file');
    const settingMiltonLogoPreview = document.getElementById('setting-milton-logo-preview');
    const settingMiltonLogoRemove = document.getElementById('setting-milton-logo-remove');
    const settingMiltonCenterName = document.getElementById('setting-milton-center-name');
    const settingMiltonCenterSubtitle = document.getElementById('setting-milton-center-subtitle');
    const settingMiltonCenterAddress1 = document.getElementById('setting-milton-center-address1');
    const settingMiltonCenterAddress2 = document.getElementById('setting-milton-center-address2');
    const settingMiltonCenterContact = document.getElementById('setting-milton-center-contact');
    const settingMiltonRightPhone1 = document.getElementById('setting-milton-right-phone1');
    const settingMiltonRightPhone2 = document.getElementById('setting-milton-right-phone2');
    const settingMiltonRightWhatsapp = document.getElementById('setting-milton-right-whatsapp');
    const settingMiltonRightGstin = document.getElementById('setting-milton-right-gstin');

    // Category Controls
    const newCategoryInput = document.getElementById('new-category-input');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const manageCategoryList = document.getElementById('manage-category-list');

    // Address Modal Controls
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const inputCategory = document.getElementById('input-category');
    const inputName = document.getElementById('input-name');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveAddressBtn = document.getElementById('save-address-btn');

    // A4 Editor elements
    const editorTextarea = document.getElementById('editor-textarea');
    const editorCompanyHeader = document.getElementById('editor-company-header');
    const editorHeaderText = document.getElementById('editor-header-text');
    const editorHeaderImage = document.getElementById('editor-header-image');
    const editorMiltonHeader = document.getElementById('editor-milton-header');
    const editorDateLine = document.getElementById('editor-date-line');
    const editorDateVal = document.getElementById('editor-date-val');
    const editorPrefixIndicator = document.getElementById('editor-prefix-indicator');
    const editorA4Sheet = document.getElementById('editor-a4-sheet');

    // Ribbon Toolbar elements
    const editorFontFamily = document.getElementById('editor-font-family');
    const editorFontSize = document.getElementById('editor-font-size');
    const editorBtnBold = document.getElementById('editor-btn-bold');
    const editorBtnItalic = document.getElementById('editor-btn-italic');
    const editorBtnUnderline = document.getElementById('editor-btn-underline');
    const editorBtnFormatPainter = document.getElementById('editor-btn-format-painter');
    const editorAlignLeft = document.getElementById('editor-align-left');
    const editorAlignCenter = document.getElementById('editor-align-center');
    const editorAlignRight = document.getElementById('editor-align-right');
    const editorAlignJustify = document.getElementById('editor-align-justify');
    const editorLineHeight = document.getElementById('editor-line-height');
    const editorTopMargin = document.getElementById('editor-top-margin');
    const editorLeftMargin = document.getElementById('editor-left-margin');
    const editorRightMargin = document.getElementById('editor-right-margin');
    const editorPrintHeader = document.getElementById('editor-print-header');
    const editorAddPrefix = document.getElementById('editor-add-prefix');

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
            }, 20);

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

    const toggleMiltonCustomFields = () => {
        const miltonDiv = document.getElementById('milton-custom-fields');
        if (!miltonDiv) return;
        if (printHeaderCheckbox && printHeaderCheckbox.checked) {
            miltonDiv.style.display = 'flex';
        } else {
            miltonDiv.style.display = 'none';
        }
    };
    if (printHeaderCheckbox) {
        printHeaderCheckbox.addEventListener('change', toggleMiltonCustomFields);
    }

    const getMiltonHeaderHTML = (settings, isPrint = false, letterLogoImg = undefined) => {
        const logoTop = settings.miltonLogoTop || "Quality is our motto";
        const logoMid = settings.miltonLogoMid || "MILTON";
        const logoBot = settings.miltonLogoBot || "Garments";
        const logoImg = letterLogoImg !== undefined ? letterLogoImg : (settings.miltonLogoImg || null);
        
        const centerName = settings.miltonCenterName || "MILTON GARMENTS PRIVATE LIMITED";
        const centerSubtitle = settings.miltonCenterSubtitle || "Manufacturers Fancy Hosiery";
        const centerAddr1 = settings.miltonCenterAddress1 || "12, SRI KANCHI KAMATCHI NAGAR, KANGAYAM PALAYAM PUDUR,";
        const centerAddr2 = settings.miltonCenterAddress2 || "KANGAYAM ROAD, TIRUPUR - 641 604.";
        const centerContact = settings.miltonCenterContact || "E-mail: miltongarmentsprivatelimited@gmail.com &nbsp;&middot;&nbsp; Web: www.miltongarments.com";
        
        const phone1 = settings.miltonRightPhone1 || "0421-2428545";
        const phone2 = settings.miltonRightPhone2 || "0421-2429439";
        const whatsapp = settings.miltonRightWhatsapp || "99526 07134";
        const gstin = settings.miltonRightGstin || "33AAQCM3608R1ZU";

        let logoHtml = '';
        if (logoImg) {
            logoHtml = `
                <div style="display: flex; align-items: center; justify-content: center; width: 115px; flex-shrink: 0; height: auto; box-sizing: border-box; margin-left: 15px; margin-right: 15px; align-self: center; margin-top: 8px;">
                    <img src="${logoImg}" style="width: 100%; max-height: 50px; object-fit: contain;" />
                </div>
            `;
        } else {
            logoHtml = `
                <div style="width: 115px; flex-shrink: 0; margin-left: 15px; margin-right: 15px;"></div>
            `;
        }

        const containerStyle = isPrint 
            ? 'border-bottom: none; padding-bottom: 0; position: static; margin-bottom: 10px; width: 100%; text-align: left; font-family: \'Outfit\', \'Segoe UI\', sans-serif; color: #000; box-sizing: border-box;'
            : 'width: 100%; font-family: \'Outfit\', \'Segoe UI\', sans-serif; color: #000; box-sizing: border-box; text-align: left;';

        const phonePart = phone2 ? `
            <div>Phone : ${phone1}</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" : ${phone2}</div>
        ` : `
            <div>Phone : ${phone1}</div>
        `;

        const whatsappPart = whatsapp ? `
            <div style="margin-top: 1px; display: flex; align-items: center; gap: 3px; justify-content: flex-end;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Whats app : ${whatsapp}
            </div>
        ` : '';

        const gstinPart = gstin ? `
            <div style="margin-top: 3px; font-size: 7.5pt; border: 1px solid #4b5563; padding: 1px 4px; border-radius: 2px; background: #f9fafb; font-weight: 800; display: inline-block;">GSTIN : ${gstin}</div>
        ` : '';

        return `
            <div style="display: flex; justify-content: space-between; align-items: stretch; width: 100%;">
                <!-- Left Logo -->
                ${logoHtml}
                
                <!-- Center Details -->
                <div style="flex: 1; text-align: center; padding: 0 10px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="background: #1f2937; color: #ffffff; padding: 5px 12px; font-weight: 900; font-size: 13pt; border-radius: 2px; letter-spacing: 1px; display: inline-block; text-transform: uppercase; margin-bottom: 3px; font-family: 'Montserrat', sans-serif; text-shadow: none;">
                        ${centerName}
                    </div>
                    ${centerSubtitle ? `
                    <div style="font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 11pt; color: #374151; font-weight: 600; margin-bottom: 3px; line-height: 1;">
                        ${centerSubtitle}
                    </div>` : ''}
                    <div style="font-size: 7.5pt; line-height: 1.3; color: #111827; font-weight: 700;">
                        ${centerAddr1}${centerAddr2 ? `<br>${centerAddr2}` : ''}
                    </div>
                    ${centerContact ? `
                    <div style="font-size: 7pt; margin-top: 2px; color: #4b5563; font-weight: 700;">
                        ${centerContact}
                    </div>` : ''}
                </div>
                
                <!-- Right Details -->
                <div style="text-align: right; font-size: 8pt; line-height: 1.3; color: #111827; font-weight: 700; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; flex-shrink: 0; min-width: 145px;">
                    ${phonePart}
                    ${whatsappPart}
                    ${gstinPart}
                </div>
            </div>
            <div style="border-bottom: 2px dotted #000000; margin-top: 8px; width: 100%;"></div>
        `;
    };

    const applySettingsToInputs = () => {
        if (fontFamilySelect) fontFamilySelect.value = companySettings.fontFamily;
        if (fontSizeSlider) fontSizeSlider.value = fontSizeNum.value = companySettings.fontSize;
        if (fontWeightSelect) fontWeightSelect.value = companySettings.fontWeight;
        if (lineHeightSlider) lineHeightSlider.value = lineHeightNum.value = companySettings.lineHeight;
        if (topMarginSlider) topMarginSlider.value = topMarginNum.value = companySettings.topMargin;
        if (leftMarginSlider) leftMarginSlider.value = leftMarginNum.value = companySettings.leftMargin;
        if (rightMarginSlider) rightMarginSlider.value = rightMarginNum.value = companySettings.rightMargin || 20;
        if (printHeaderCheckbox) printHeaderCheckbox.checked = companySettings.printHeader;
        if (addPrefixCheckbox) addPrefixCheckbox.checked = companySettings.addPrefix;
        
        toggleMiltonCustomFields();

        // Apply Milton Custom inputs
        if (settingMiltonLogoTop) settingMiltonLogoTop.value = companySettings.miltonLogoTop || "Quality is our motto";
        if (settingMiltonLogoMid) settingMiltonLogoMid.value = companySettings.miltonLogoMid || "MILTON";
        if (settingMiltonLogoBot) settingMiltonLogoBot.value = companySettings.miltonLogoBot || "Garments";
        if (settingMiltonCenterName) settingMiltonCenterName.value = companySettings.miltonCenterName || "";
        if (settingMiltonCenterSubtitle) settingMiltonCenterSubtitle.value = companySettings.miltonCenterSubtitle || "";
        if (settingMiltonCenterAddress1) settingMiltonCenterAddress1.value = companySettings.miltonCenterAddress1 || "";
        if (settingMiltonCenterAddress2) settingMiltonCenterAddress2.value = companySettings.miltonCenterAddress2 || "";
        if (settingMiltonCenterContact) settingMiltonCenterContact.value = (companySettings.miltonCenterContact || "").replace(/&nbsp;&middot;&nbsp;/g, ' · ').replace(/&middot;/g, ' · ');
        if (settingMiltonRightPhone1) settingMiltonRightPhone1.value = companySettings.miltonRightPhone1 || "";
        if (settingMiltonRightPhone2) settingMiltonRightPhone2.value = companySettings.miltonRightPhone2 || "";
        if (settingMiltonRightWhatsapp) settingMiltonRightWhatsapp.value = companySettings.miltonRightWhatsapp || "";
        if (settingMiltonRightGstin) settingMiltonRightGstin.value = companySettings.miltonRightGstin || "";
        
        if (settingMiltonLogoPreview) {
            if (companySettings.miltonLogoImg) {
                settingMiltonLogoPreview.style.display = 'flex';
            } else {
                settingMiltonLogoPreview.style.display = 'none';
            }
        }

        if (useCustomHeaderCheckbox) {
            useCustomHeaderCheckbox.checked = companySettings.useCustomHeader || false;
            if (useCustomHeaderCheckbox.checked) {
                customHeaderUploadWrapper.style.display = 'flex';
            } else {
                customHeaderUploadWrapper.style.display = 'none';
            }
        }
        
        if (companySettings.headerImage) {
            if (customHeaderPreviewContainer) customHeaderPreviewContainer.style.display = 'flex';
        } else {
            if (customHeaderPreviewContainer) customHeaderPreviewContainer.style.display = 'none';
        }
    };

    const saveSettings = () => {
        companySettings = {
            fontFamily: fontFamilySelect.value,
            fontSize: parseInt(fontSizeSlider.value) || 14,
            fontWeight: fontWeightSelect.value,
            lineHeight: parseFloat(lineHeightSlider.value) || 1.2,
            topMargin: parseInt(topMarginSlider.value) || 50,
            leftMargin: parseInt(leftMarginSlider.value) || 20,
            rightMargin: parseInt(rightMarginSlider.value) || 20,
            printHeader: printHeaderCheckbox.checked,
            headerStyle: 'milton',
            useCustomHeader: useCustomHeaderCheckbox ? useCustomHeaderCheckbox.checked : false,
            headerImage: companySettings.headerImage,
            addPrefix: addPrefixCheckbox.checked,
            
            // Milton customized fields
            miltonLogoTop: settingMiltonLogoTop ? settingMiltonLogoTop.value : "Quality is our motto",
            miltonLogoMid: settingMiltonLogoMid ? settingMiltonLogoMid.value : "MILTON",
            miltonLogoBot: settingMiltonLogoBot ? settingMiltonLogoBot.value : "Garments",
            miltonLogoImg: companySettings.miltonLogoImg,
            miltonCenterName: settingMiltonCenterName ? settingMiltonCenterName.value : "",
            miltonCenterSubtitle: settingMiltonCenterSubtitle ? settingMiltonCenterSubtitle.value : "",
            miltonCenterAddress1: settingMiltonCenterAddress1 ? settingMiltonCenterAddress1.value : "",
            miltonCenterAddress2: settingMiltonCenterAddress2 ? settingMiltonCenterAddress2.value : "",
            miltonCenterContact: settingMiltonCenterContact ? settingMiltonCenterContact.value.replace(/ · /g, ' &nbsp;&middot;&nbsp; ') : "",
            miltonRightPhone1: settingMiltonRightPhone1 ? settingMiltonRightPhone1.value : "",
            miltonRightPhone2: settingMiltonRightPhone2 ? settingMiltonRightPhone2.value : "",
            miltonRightWhatsapp: settingMiltonRightWhatsapp ? settingMiltonRightWhatsapp.value : "",
            miltonRightGstin: settingMiltonRightGstin ? settingMiltonRightGstin.value : ""
        };

        settingsModal.classList.add('hidden');
        showNotification('Letter Pad layout settings saved successfully! 💾', 'success', 'Saved');
        saveToServer();
        formatEditorA4Sheet();
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
            btn.style.background = 'linear-gradient(135deg, #f59e0b, #ea580c)';
            btn.style.color = '#fff';
            btn.style.borderColor = 'transparent';
            btn.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.25)';
        } else {
            btn.style.background = 'rgba(255, 255, 255, 0.7)';
            btn.style.color = 'var(--text-secondary)';
            btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.02)';
        }

        // Hover events
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
            if (isActive) {
                btn.style.boxShadow = '0 6px 16px rgba(234, 88, 12, 0.35)';
            } else {
                btn.style.background = 'rgba(255, 255, 255, 0.9)';
                btn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.05)';
                btn.style.color = 'var(--text-primary)';
            }
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'none';
            if (isActive) {
                btn.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.25)';
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

    // Helper to format/apply styles to the A4 Editor Workspace
    const formatEditorA4Sheet = () => {
        if (!editorA4Sheet || !editorTextarea) return;

        // Sync ribbon toolbar inputs with companySettings
        if (editorFontFamily) editorFontFamily.value = companySettings.fontFamily;
        if (editorFontSize) editorFontSize.value = companySettings.fontSize;
        if (editorLineHeight) editorLineHeight.value = companySettings.lineHeight;
        if (editorTopMargin) editorTopMargin.value = companySettings.topMargin;
        if (editorLeftMargin) editorLeftMargin.value = companySettings.leftMargin;
        if (editorRightMargin) editorRightMargin.value = companySettings.rightMargin || 20;
        if (editorPrintHeader) editorPrintHeader.checked = companySettings.printHeader;
        if (editorAddPrefix) editorAddPrefix.checked = companySettings.addPrefix;

        // Sync ribbon buttons active classes
        if (editorBtnBold) {
            if (companySettings.fontWeight === "700") {
                editorBtnBold.classList.add('active');
            } else {
                editorBtnBold.classList.remove('active');
            }
        }
        if (editorBtnItalic) {
            if (companySettings.fontStyle === "italic") {
                editorBtnItalic.classList.add('active');
            } else {
                editorBtnItalic.classList.remove('active');
            }
        }
        if (editorBtnUnderline) {
            if (companySettings.textDecoration === "underline") {
                editorBtnUnderline.classList.add('active');
            } else {
                editorBtnUnderline.classList.remove('active');
            }
        }

        // Alignment active class sync
        if (editorAlignLeft) editorAlignLeft.classList.remove('active');
        if (editorAlignCenter) editorAlignCenter.classList.remove('active');
        if (editorAlignRight) editorAlignRight.classList.remove('active');
        if (editorAlignJustify) editorAlignJustify.classList.remove('active');

        const align = companySettings.textAlign || "left";
        if (align === "left" && editorAlignLeft) editorAlignLeft.classList.add('active');
        if (align === "center" && editorAlignCenter) editorAlignCenter.classList.add('active');
        if (align === "right" && editorAlignRight) editorAlignRight.classList.add('active');
        if (align === "justify" && editorAlignJustify) editorAlignJustify.classList.add('active');
        
        // Apply Margins (padding on sheet)
        editorA4Sheet.style.paddingTop = companySettings.topMargin + 'mm';
        editorA4Sheet.style.paddingLeft = companySettings.leftMargin + 'mm';
        editorA4Sheet.style.paddingRight = (companySettings.rightMargin || 20) + 'mm';
        editorA4Sheet.style.paddingBottom = '20mm';
        
        // Apply Font configurations to text area
        editorTextarea.style.fontFamily = companySettings.fontFamily;
        editorTextarea.style.fontSize = companySettings.fontSize + 'pt';
        editorTextarea.style.fontWeight = companySettings.fontWeight;
        editorTextarea.style.lineHeight = companySettings.lineHeight;
        editorTextarea.style.fontStyle = companySettings.fontStyle || 'normal';
        editorTextarea.style.textDecoration = companySettings.textDecoration || 'none';
        editorTextarea.style.textAlign = companySettings.textAlign || 'left';

        // Apply Header Display
        if (companySettings.printHeader) {
            editorCompanyHeader.style.display = 'block';
            
            const style = 'milton';
            
            if (style === 'milton') {
                if (editorHeaderText) editorHeaderText.style.display = 'none';
                if (editorHeaderImage) editorHeaderImage.style.display = 'none';
                if (editorMiltonHeader) {
                    editorMiltonHeader.style.display = 'block';
                    editorMiltonHeader.innerHTML = getMiltonHeaderHTML(companySettings, false);
                }
                if (editorDateLine) editorDateLine.style.display = 'flex';
                
                // Set default current date if not set or placeholder is present
                if (editorDateVal && (editorDateVal.textContent.trim() === '' || editorDateVal.textContent.includes('Date'))) {
                    const today = new Date();
                    const dd = String(today.getDate()).padStart(2, '0');
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const yyyy = today.getFullYear();
                    editorDateVal.textContent = `${dd}.${mm}.${yyyy}`;
                }
            } else {
                if (editorMiltonHeader) editorMiltonHeader.style.display = 'none';
                if (editorDateLine) editorDateLine.style.display = 'none';
                
                if (companySettings.useCustomHeader && companySettings.headerImage) {
                    if (editorHeaderText) editorHeaderText.style.display = 'none';
                    if (editorHeaderImage) {
                        editorHeaderImage.style.display = 'block';
                        editorHeaderImage.src = companySettings.headerImage;
                    }
                } else {
                    if (editorHeaderText) {
                        editorHeaderText.style.display = 'block';
                        editorHeaderText.textContent = COMPANY;
                    }
                    if (editorHeaderImage) editorHeaderImage.style.display = 'none';
                }
            }
        } else {
            editorCompanyHeader.style.display = 'none';
            if (editorMiltonHeader) editorMiltonHeader.style.display = 'none';
            if (editorDateLine) editorDateLine.style.display = 'none';
        }

        // Apply Prefix Display
        if (companySettings.addPrefix) {
            editorPrefixIndicator.style.display = 'block';
        } else {
            editorPrefixIndicator.style.display = 'none';
        }
    };

    // --- Contact Edit Modal Trigger ---
    addNewBtn.addEventListener('click', () => {
        editingId = null;
        modalTitle.textContent = 'Create New Letter';
        inputName.value = '';
        if (editorTextarea) editorTextarea.innerHTML = '';
        
        if (inputCategory) inputCategory.value = activeCategoryFilter !== 'All' ? activeCategoryFilter : '';
        
        formatEditorA4Sheet();
        modalOverlay.classList.remove('hidden');
        setTimeout(() => inputName.focus(), 10);
    });

    cancelBtn.addEventListener('click', () => modalOverlay.classList.add('hidden'));

    saveAddressBtn.addEventListener('click', () => {
        const name = inputName.value.trim();
        const address = editorTextarea ? editorTextarea.innerHTML.trim() : '';
        const category = inputCategory ? inputCategory.value : '';

        if (!name || !address) {
            showNotification('Please fill in both Document Name and Content.', 'warning', 'Required');
            return;
        }

        const existing = checkDuplicateName(name);
        if (existing) {
            showNotification(`A document with name "${name}" already exists!`, 'error', 'Duplicate');
            return;
        }

        if (editingId) {
            const nameChanged = (editingOriginalName && editingOriginalName.trim().toLowerCase() !== name.toLowerCase());
            
            if (nameChanged) {
                // Save As: Create as a new document
                companyAddresses.push({ 
                    id: Date.now(), 
                    name, 
                    address, 
                    category, 
                    logoImg: companySettings.miltonLogoImg || null 
                });
                showNotification('Saved as a new document!', 'success', 'Save As');
            } else {
                // Save: Overwrite existing document
                const index = companyAddresses.findIndex(a => a.id === editingId);
                if (index !== -1) {
                    companyAddresses[index] = { 
                        id: editingId, 
                        name, 
                        address, 
                        category, 
                        logoImg: companySettings.miltonLogoImg || null 
                    };
                }
                showNotification('Document updated successfully!', 'success', 'Saved');
            }
            editingId = null;
            editingOriginalName = null;
        } else {
            companyAddresses.push({ 
                id: Date.now(), 
                name, 
                address, 
                category, 
                logoImg: companySettings.miltonLogoImg || null 
            });
            showNotification('Document saved successfully!', 'success', 'Saved');
        }

        // Sort alphabetically
        companyAddresses.sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

        saveToServer();
        renderAddresses();
        modalOverlay.classList.add('hidden');
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
                editingOriginalName = addr.name;
                inputName.value = addr.name;
                if (editorTextarea) editorTextarea.innerHTML = addr.address || '';
                if (inputCategory) inputCategory.value = addr.category || '';
                
                modalTitle.textContent = 'Edit Letter';
                formatEditorA4Sheet();
                modalOverlay.classList.remove('hidden');
                setTimeout(() => editorTextarea.focus(), 10);
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
    syncControls(rightMarginSlider, rightMarginNum);

    // --- Ribbon Event Listeners ---
    const updateFromRibbon = () => {
        companySettings.fontFamily = editorFontFamily.value;
        companySettings.fontSize = parseInt(editorFontSize.value) || 14;
        companySettings.lineHeight = parseFloat(editorLineHeight.value) || 1.2;
        companySettings.topMargin = parseInt(editorTopMargin.value) || 50;
        companySettings.leftMargin = parseInt(editorLeftMargin.value) || 20;
        companySettings.rightMargin = parseInt(editorRightMargin.value) || 20;
        companySettings.printHeader = editorPrintHeader.checked;
        companySettings.addPrefix = editorAddPrefix.checked;

        // Apply style to A4 page preview immediately
        editorA4Sheet.style.paddingTop = companySettings.topMargin + 'mm';
        editorA4Sheet.style.paddingLeft = companySettings.leftMargin + 'mm';
        editorA4Sheet.style.paddingRight = (companySettings.rightMargin || 20) + 'mm';
        editorA4Sheet.style.paddingBottom = '20mm';
        editorTextarea.style.fontFamily = companySettings.fontFamily;
        editorTextarea.style.fontSize = companySettings.fontSize + 'pt';
        editorTextarea.style.lineHeight = companySettings.lineHeight;

        if (companySettings.printHeader) {
            editorCompanyHeader.style.display = 'block';
            editorHeaderText.textContent = COMPANY;
        } else {
            editorCompanyHeader.style.display = 'none';
        }

        if (companySettings.addPrefix) {
            editorPrefixIndicator.style.display = 'block';
        } else {
            editorPrefixIndicator.style.display = 'none';
        }
    };

    if (editorFontFamily) editorFontFamily.addEventListener('change', updateFromRibbon);
    if (editorFontSize) editorFontSize.addEventListener('change', updateFromRibbon);
    if (editorLineHeight) editorLineHeight.addEventListener('change', updateFromRibbon);
    if (editorTopMargin) editorTopMargin.addEventListener('input', updateFromRibbon);
    if (editorLeftMargin) editorLeftMargin.addEventListener('input', updateFromRibbon);
    if (editorRightMargin) editorRightMargin.addEventListener('input', updateFromRibbon);
    if (editorPrintHeader) editorPrintHeader.addEventListener('change', updateFromRibbon);
    if (editorAddPrefix) editorAddPrefix.addEventListener('change', updateFromRibbon);

    // Sync ribbon button active states from browser cursor selection state
    const updateRibbonFromSelection = () => {
        if (!editorTextarea) return;
        
        if (editorBtnBold) {
            if (document.queryCommandState('bold')) editorBtnBold.classList.add('active');
            else editorBtnBold.classList.remove('active');
        }
        
        if (editorBtnItalic) {
            if (document.queryCommandState('italic')) editorBtnItalic.classList.add('active');
            else editorBtnItalic.classList.remove('active');
        }
        
        if (editorBtnUnderline) {
            if (document.queryCommandState('underline')) editorBtnUnderline.classList.add('active');
            else editorBtnUnderline.classList.remove('active');
        }

        // Alignments
        if (editorAlignLeft) {
            if (document.queryCommandState('justifyLeft')) editorAlignLeft.classList.add('active');
            else editorAlignLeft.classList.remove('active');
        }
        if (editorAlignCenter) {
            if (document.queryCommandState('justifyCenter')) editorAlignCenter.classList.add('active');
            else editorAlignCenter.classList.remove('active');
        }
        if (editorAlignRight) {
            if (document.queryCommandState('justifyRight')) editorAlignRight.classList.add('active');
            else editorAlignRight.classList.remove('active');
        }
        if (editorAlignJustify) {
            if (document.queryCommandState('justifyFull')) editorAlignJustify.classList.add('active');
            else editorAlignJustify.classList.remove('active');
        }
    };

    if (editorTextarea) {
        editorTextarea.addEventListener('keyup', updateRibbonFromSelection);
        editorTextarea.addEventListener('mouseup', updateRibbonFromSelection);
        document.addEventListener('selectionchange', () => {
            if (document.activeElement === editorTextarea) {
                updateRibbonFromSelection();
            }
        });
    }

    // Ribbon Toggle Button Listeners via document.execCommand
    if (editorBtnBold) {
        editorBtnBold.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('bold', false, null);
            updateRibbonFromSelection();
        });
    }
    if (editorBtnItalic) {
        editorBtnItalic.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('italic', false, null);
            updateRibbonFromSelection();
        });
    }
    if (editorBtnUnderline) {
        editorBtnUnderline.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('underline', false, null);
            updateRibbonFromSelection();
        });
    }

    // --- Format Painter Logic ---
    let paintBrushFormat = null;
    let paintBrushActive = false;
    let paintBrushPersistent = false;

    function copyFormatting() {
        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) {
            showNotification("Please select some styled text first to copy formatting.", "warning", "No Text Selected");
            return null;
        }

        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        const computed = window.getComputedStyle(node);

        const isBold = document.queryCommandState('bold') || 
                       computed.fontWeight === 'bold' || 
                       parseInt(computed.fontWeight) >= 600;

        const isItalic = document.queryCommandState('italic') || 
                         computed.fontStyle === 'italic';

        const isUnderline = document.queryCommandState('underline') || 
                            computed.textDecoration.includes('underline');

        return {
            bold: isBold,
            italic: isItalic,
            underline: isUnderline,
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            color: computed.color,
            backgroundColor: computed.backgroundColor
        };
    }

    function applyFormatting(format) {
        if (!format) return;
        
        // Match selection command states with source format
        const targetBold = document.queryCommandState('bold');
        if (targetBold !== format.bold) {
            document.execCommand('bold', false, null);
        }
        
        const targetItalic = document.queryCommandState('italic');
        if (targetItalic !== format.italic) {
            document.execCommand('italic', false, null);
        }
        
        const targetUnderline = document.queryCommandState('underline');
        if (targetUnderline !== format.underline) {
            document.execCommand('underline', false, null);
        }

        // Apply text and highlight colors
        if (format.color && format.color !== 'rgba(0, 0, 0, 0)') {
            document.execCommand('foreColor', false, format.color);
        }
        
        if (format.backgroundColor && format.backgroundColor !== 'rgba(0, 0, 0, 0)' && format.backgroundColor !== 'transparent') {
            document.execCommand('hiliteColor', false, format.backgroundColor);
        }

        if (format.fontFamily) {
            document.execCommand('fontName', false, format.fontFamily);
        }
    }

    const deactivateFormatPainter = () => {
        paintBrushActive = false;
        paintBrushPersistent = false;
        paintBrushFormat = null;
        if (editorBtnFormatPainter) {
            editorBtnFormatPainter.classList.remove('active');
            editorBtnFormatPainter.style.background = 'transparent';
            editorBtnFormatPainter.style.borderColor = 'transparent';
        }
        if (editorTextarea) {
            editorTextarea.classList.remove('format-painting-mode');
        }
    };

    const activateFormatPainter = (persistent = false) => {
        const format = copyFormatting();
        if (!format) {
            deactivateFormatPainter();
            return;
        }
        
        paintBrushFormat = format;
        paintBrushActive = true;
        paintBrushPersistent = persistent;
        
        if (editorBtnFormatPainter) {
            editorBtnFormatPainter.classList.add('active');
        }
        if (editorTextarea) {
            editorTextarea.classList.add('format-painting-mode');
        }
    };

    if (editorBtnFormatPainter) {
        editorBtnFormatPainter.addEventListener('click', (e) => {
            e.preventDefault();
            if (paintBrushActive) {
                deactivateFormatPainter();
            } else {
                activateFormatPainter(false);
            }
        });

        editorBtnFormatPainter.addEventListener('dblclick', (e) => {
            e.preventDefault();
            activateFormatPainter(true);
        });
    }

    if (editorTextarea) {
        editorTextarea.addEventListener('mouseup', () => {
            if (paintBrushActive && paintBrushFormat) {
                const selection = window.getSelection();
                if (selection.rangeCount && !selection.isCollapsed) {
                    applyFormatting(paintBrushFormat);
                    
                    if (!paintBrushPersistent) {
                        deactivateFormatPainter();
                    }
                }
            }
        });

        // Cancel with Escape key
        editorTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && paintBrushActive) {
                deactivateFormatPainter();
            }
        });
    }

    // Alignment buttons listeners
    if (editorAlignLeft) {
        editorAlignLeft.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('justifyLeft', false, null);
            updateRibbonFromSelection();
        });
    }
    if (editorAlignCenter) {
        editorAlignCenter.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('justifyCenter', false, null);
            updateRibbonFromSelection();
        });
    }
    if (editorAlignRight) {
        editorAlignRight.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('justifyRight', false, null);
            updateRibbonFromSelection();
        });
    }
    if (editorAlignJustify) {
        editorAlignJustify.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('justifyFull', false, null);
            updateRibbonFromSelection();
        });
    }

    // --- Print Layout Generation ---
    bulkPrintBtn.addEventListener('click', () => {
        if (selectedIds.length === 0) {
            showNotification('Please select at least one contact to print.', 'warning', 'No selection');
            return;
        }
        const toPrint = selectedIds.map(id => companyAddresses.find(a => a.id === id)).filter(Boolean);
        generatePrintOutput(toPrint, false);
    });

    if (bulkPdfBtn) {
        bulkPdfBtn.addEventListener('click', () => {
            if (selectedIds.length === 0) {
                showNotification('Please select at least one contact to save as PDF.', 'warning', 'No selection');
                return;
            }
            const toPrint = selectedIds.map(id => companyAddresses.find(a => a.id === id)).filter(Boolean);
            generatePrintOutput(toPrint, true);
        });
    }

    const generatePrintOutput = (data, isPDF = false) => {
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
        root.style.setProperty('--print-font-style', companySettings.fontStyle || 'normal');
        root.style.setProperty('--print-text-decoration', companySettings.textDecoration || 'none');
        root.style.setProperty('--print-text-align', companySettings.textAlign || 'left');
        root.style.setProperty('--print-line-height', companySettings.lineHeight);
        if (companySettings.printHeader && (companySettings.headerStyle || 'standard') === 'milton') {
            root.style.setProperty('--print-top-margin', '15mm');
        } else {
            root.style.setProperty('--print-top-margin', companySettings.topMargin + 'mm');
        }
        root.style.setProperty('--print-left-margin', companySettings.leftMargin + 'mm');
        root.style.setProperty('--print-right-margin', (companySettings.rightMargin || 20) + 'mm');

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
                padding-right: var(--print-right-margin);
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
                font-style: var(--print-font-style);
                text-decoration: var(--print-text-decoration);
                text-align: var(--print-text-align);
            }
            .letterpad-body * {
                white-space: pre-wrap !important;
                word-break: normal !important;
                overflow-wrap: break-word !important;
            }
            .letterpad-body table {
                width: 100% !important;
                max-width: 100% !important;
                border-collapse: collapse !important;
                margin: 15px 0 !important;
                table-layout: auto !important;
            }
            .letterpad-body td, .letterpad-body th {
                border: 1px solid #000 !important;
                padding: 8px 12px !important;
                min-width: 40px;
                font-size: inherit;
                font-family: inherit;
                line-height: inherit;
            }
            .letterpad-body img {
                max-width: 100% !important;
                height: auto !important;
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
            let dateHtml = '';
            if (companySettings.printHeader) {
                const style = 'milton';
                if (style === 'milton') {
                    headerHtml = getMiltonHeaderHTML(companySettings, true, item.logoImg);
                    
                    const currentDate = editorDateVal ? editorDateVal.textContent : '';
                    dateHtml = `
                        <div style="display: flex; justify-content: flex-end; font-size: 11pt; font-weight: 700; margin-top: 8px; margin-bottom: 12px; font-family: 'Outfit', sans-serif; width: 100%;">
                            Date : &nbsp;<span style="border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; text-align: center;">${currentDate}</span>
                        </div>
                    `;
                } else if (companySettings.useCustomHeader && companySettings.headerImage) {
                    headerHtml = `
                        <div class="letterpad-header" style="border-bottom: none; padding-bottom: 0; display: flex; justify-content: center; align-items: center;">
                            <img src="${companySettings.headerImage}" style="width: 100%; max-height: 120px; object-fit: contain;" />
                        </div>
                    `;
                } else {
                    headerHtml = `
                        <div class="letterpad-header">
                            <h1>${COMPANY}</h1>
                        </div>
                    `;
                }
            }

            page.innerHTML = `
                ${headerHtml}
                ${dateHtml}
                <div class="letterpad-body">
                    ${companySettings.addPrefix ? '<div class="letterpad-to-prefix">To. M/s,</div>' : ''}
                    <div style="white-space: pre-wrap; word-break: normal; overflow-wrap: break-word; width: 100%;">${item.address}</div>
                    ${item.phone ? `<div style="margin-top: 5px; font-weight: 600;">PH: ${item.phone}</div>` : ''}
                </div>
            `;
            printContainer.appendChild(page);
        });

        if (isPDF) {
            showNotification('Converting document to PDF...', 'info', 'Generating PDF');
            const opt = {
                margin: [0, 0, 0, 0],
                filename: `${COMPANY}_LetterPad_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            printContainer.classList.remove('print-only');
            printContainer.style.position = 'fixed';
            printContainer.style.left = '-9999px';
            printContainer.style.top = '0';
            printContainer.style.display = 'block';
            printContainer.style.zIndex = '99999';

            html2pdf().set(opt).from(printContainer).save().then(() => {
                printContainer.innerHTML = '';
                printContainer.classList.add('print-only');
                printContainer.style.position = '';
                printContainer.style.left = '';
                printContainer.style.top = '';
                printContainer.style.display = '';
                printContainer.style.zIndex = '';
                showNotification('PDF downloaded successfully.', 'success', 'PDF Saved');
            }).catch(err => {
                printContainer.classList.add('print-only');
                printContainer.innerHTML = '';
                printContainer.style.position = '';
                printContainer.style.left = '';
                printContainer.style.top = '';
                printContainer.style.display = '';
                printContainer.style.zIndex = '';
                console.error('PDF generation failed:', err);
                showNotification('Failed to generate PDF. Please try again.', 'error', 'Error');
            });
            return;
        }

        // Trigger native print dialog
        const originalTitle = document.title;
        document.title = "";
        setTimeout(() => {
            window.print();
            setTimeout(() => { document.title = originalTitle; }, 50);
        }, 150);
    };

    // --- PDF to Image Conversion (using PDF.js CDN) ---
    const loadPdfJsAndConvert = (file, callback) => {
        if (typeof pdfjsLib === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
            script.onload = () => {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                convertPdfToImage(file, callback);
            };
            script.onerror = () => {
                showNotification('Failed to load PDF converter helper. Please upload PNG/JPG directly.', 'error', 'Conversion Error');
            };
            document.head.appendChild(script);
        } else {
            convertPdfToImage(file, callback);
        }
    };

    const convertPdfToImage = (file, callback) => {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const typedarray = new Uint8Array(event.target.result);
            try {
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                const page = await pdf.getPage(1);
                
                // Use scale 4.0 for extreme crispness (HD quality)
                const viewport = page.getViewport({ scale: 4.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                await page.render(renderContext).promise;
                const base64Img = canvas.toDataURL('image/png');
                callback(base64Img);
            } catch (err) {
                console.error('PDF.js render error', err);
                showNotification('Failed to read or render PDF logo. Please upload a standard PNG/JPG image.', 'error', 'Rendering Error');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // --- Automatic White Space Border Cropping Algorithm ---
    const cropCanvasWhiteMargins = (canvas) => {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        let minX = width, minY = height, maxX = 0, maxY = 0;
        
        // Scan pixel grid for non-white/non-transparent pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];
                
                // Pixel is considered blank/white if RGB values are near 255 or alpha is 0
                const isWhite = (r > 248 && g > 248 && b > 248) || a === 0;
                
                if (!isWhite) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }
        
        // If the canvas is completely blank, return original
        if (maxX < minX || maxY < minY) return canvas;
        
        // Add small safety padding around the bounds
        const padding = 15;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(width - 1, maxX + padding);
        maxY = Math.min(height - 1, maxY + padding);
        
        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;
        
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        
        return croppedCanvas;
    };

    const cropImageWhiteMargins = (dataURL, callback) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            try {
                const croppedCanvas = cropCanvasWhiteMargins(canvas);
                callback(croppedCanvas.toDataURL('image/png'));
            } catch (err) {
                console.error('Cropping error, falling back to original image', err);
                callback(dataURL);
            }
        };
        img.onerror = () => {
            callback(dataURL);
        };
        img.src = dataURL;
    };

    // --- Custom Header Upload Listeners ---
    if (useCustomHeaderCheckbox) {
        useCustomHeaderCheckbox.addEventListener('change', () => {
            if (useCustomHeaderCheckbox.checked) {
                customHeaderUploadWrapper.style.display = 'flex';
            } else {
                customHeaderUploadWrapper.style.display = 'none';
            }
            formatEditorA4Sheet();
        });
    }

    if (customHeaderFile) {
        customHeaderFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                loadPdfJsAndConvert(file, (base64Img) => {
                    cropImageWhiteMargins(base64Img, (croppedImg) => {
                        companySettings.headerImage = croppedImg;
                        if (customHeaderPreviewContainer) customHeaderPreviewContainer.style.display = 'flex';
                        formatEditorA4Sheet();
                    });
                });
            } else {
                const reader = new FileReader();
                reader.onload = (event) => {
                    cropImageWhiteMargins(event.target.result, (croppedImg) => {
                        companySettings.headerImage = croppedImg;
                        if (customHeaderPreviewContainer) customHeaderPreviewContainer.style.display = 'flex';
                        formatEditorA4Sheet();
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeCustomHeaderBtn) {
        removeCustomHeaderBtn.addEventListener('click', () => {
            companySettings.headerImage = null;
            if (customHeaderFile) customHeaderFile.value = '';
            if (customHeaderPreviewContainer) customHeaderPreviewContainer.style.display = 'none';
            formatEditorA4Sheet();
        });
    }

    // --- Milton Custom Logo Upload Listeners ---
    if (settingMiltonLogoFile) {
        settingMiltonLogoFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                loadPdfJsAndConvert(file, (base64Img) => {
                    cropImageWhiteMargins(base64Img, (croppedImg) => {
                        companySettings.miltonLogoImg = croppedImg;
                        if (settingMiltonLogoPreview) settingMiltonLogoPreview.style.display = 'flex';
                        formatEditorA4Sheet();
                    });
                });
            } else {
                const reader = new FileReader();
                reader.onload = (event) => {
                    cropImageWhiteMargins(event.target.result, (croppedImg) => {
                        companySettings.miltonLogoImg = croppedImg;
                        if (settingMiltonLogoPreview) settingMiltonLogoPreview.style.display = 'flex';
                        formatEditorA4Sheet();
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (settingMiltonLogoRemove) {
        settingMiltonLogoRemove.addEventListener('click', () => {
            companySettings.miltonLogoImg = null;
            if (settingMiltonLogoFile) settingMiltonLogoFile.value = '';
            if (settingMiltonLogoPreview) settingMiltonLogoPreview.style.display = 'none';
            formatEditorA4Sheet();
        });
    }

    // --- Startup connection ---
    loadSettings();
});
