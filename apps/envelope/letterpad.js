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
        fontSize: 12,
        fontWeight: "300",
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
    let savedSelectionRange = null;

    // --- DOM Elements ---
    document.getElementById('selected-company-badge').textContent = COMPANY;
    document.title = `${COMPANY} - Letter Pad Suite`;
    
    const backBtn = document.getElementById('back-to-addressbook-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `index.html${PROFILE_QUERY}&openLetterpad=true`;
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
    const editorWatermark = document.getElementById('editor-watermark');

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
            String(a.id) !== String(editingId) && 
            (a.name || '').trim().toLowerCase() === normalized
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
            const resp = await fetch(`${API_BASE}/api/envelope/settings${PROFILE_QUERY}&t=${Date.now()}`);
            activeSettings = await resp.json();
            
            // Validate structure
            if (!activeSettings.letterPadData) {
                activeSettings.letterPadData = {};
            }

            // Load company data if exists, else setup default
            if (activeSettings.letterPadData[COMPANY]) {
                const compData = activeSettings.letterPadData[COMPANY];
                companySettings = { ...companySettings, ...compData.settings };
                
                // Migrate database old defaults (14 or 16 size, and bold weights) to 12pt and Regular (400)
                if (companySettings.fontSize === 14 || companySettings.fontSize === 16) {
                    companySettings.fontSize = 12;
                }
                if (companySettings.fontWeight === "600" || companySettings.fontWeight === "700" || companySettings.fontWeight === "bold" || companySettings.fontWeight === "400") {
                    companySettings.fontWeight = "300";
                }
                
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
            const response = await fetch(`${API_BASE}/api/envelope/settings${PROFILE_QUERY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeSettings)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (err) {
            console.error('Failed to save to server', err);
            throw err; // Propagate error
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
        
        const phone1 = settings.miltonRightPhone1 !== undefined ? settings.miltonRightPhone1 : "0421-2428545";
        const phone2 = settings.miltonRightPhone2 !== undefined ? settings.miltonRightPhone2 : "0421-2429439";
        const whatsapp = settings.miltonRightWhatsapp || "99526 07134";
        const gstin = settings.miltonRightGstin || "33AAQCM3608R1ZU";

        const brandColor = PROFILE === '2' ? '#1E1558' : '#84cc16';
        const bannerBgColor = PROFILE === '2' ? '#1E1558' : '#1f2937';

        let logoHtml = '';
        if (logoImg) {
            logoHtml = `
                <div style="display: flex; align-items: center; justify-content: center; width: 115px; flex-shrink: 0; height: auto; box-sizing: border-box; margin-left: 15px; margin-right: 15px; align-self: center; margin-top: 8px;">
                    <img src="${logoImg}" style="width: 100%; max-height: 50px; object-fit: contain;" />
                </div>
            `;
        } else {
            logoHtml = `
                <div style="display: flex; align-items: center; justify-content: center; width: 115px; flex-shrink: 0; height: auto; box-sizing: border-box; margin-left: 15px; margin-right: 15px; align-self: center; margin-top: 8px;">
                    <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M6 3h12" />
                      <path d="M6 21h12" />
                      <path d="M8 3v18" />
                      <path d="M16 3v18" />
                      <line x1="8" y1="7" x2="16" y2="7" />
                      <line x1="8" y1="11" x2="16" y2="11" />
                      <line x1="8" y1="15" x2="16" y2="15" />
                      <line x1="4" y1="20" x2="20" y2="4" />
                      <circle cx="18" cy="6" r="1.2" fill="${brandColor}" />
                    </svg>
                </div>
            `;
        }

        const containerStyle = isPrint 
            ? 'border-bottom: none; padding-bottom: 0; position: static; margin-bottom: 10px; width: 100%; text-align: left; font-family: \'Outfit\', \'Segoe UI\', sans-serif; color: #000; box-sizing: border-box;'
            : 'width: 100%; font-family: \'Outfit\', \'Segoe UI\', sans-serif; color: #000; box-sizing: border-box; text-align: left;';

        const p1 = (phone1 || '').trim();
        const p2 = (phone2 || '').trim();
        let phonePart = '';
        if (p1 && p2) {
            phonePart = `
                <div>Phone : ${p1}</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" : ${p2}</div>
            `;
        } else if (p1) {
            phonePart = `<div>Phone : ${p1}</div>`;
        } else if (p2) {
            phonePart = `<div>Phone : ${p2}</div>`;
        }

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
                    <div style="background: ${bannerBgColor}; color: #ffffff; padding: 5px 12px; font-weight: 900; font-size: 13pt; border-radius: 2px; letter-spacing: 1px; display: inline-block; text-transform: uppercase; margin-bottom: 3px; font-family: 'Montserrat', sans-serif; text-shadow: none;">
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

    const getWatermarkHTML = (settings) => {
        const logoImg = settings.miltonLogoImg || settings.headerImage || null;
        if (logoImg) {
            return `<img src="${logoImg}" alt="Watermark" />`;
        } else {
            const brandColor = PROFILE === '2' ? '#1E1558' : '#84cc16';
            return `
                <svg viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 3h12" />
                  <path d="M6 21h12" />
                  <path d="M8 3v18" />
                  <path d="M16 3v18" />
                  <line x1="8" y1="7" x2="16" y2="7" />
                  <line x1="8" y1="11" x2="16" y2="11" />
                  <line x1="8" y1="15" x2="16" y2="15" />
                  <line x1="4" y1="20" x2="20" y2="4" />
                  <circle cx="18" cy="6" r="1.2" fill="${brandColor}" />
                </svg>
            `;
        }
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
            fontSize: parseInt(fontSizeSlider.value) || 12,
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
            // If filtering by a specific category, show a "Back" button
            if (activeCategoryFilter !== 'All') {
                const backBtn = document.createElement('button');
                backBtn.innerHTML = `<span>⬅</span> <span>Back</span>`;
                styleCategoryBox(backBtn, false);
                backBtn.addEventListener('click', () => {
                    activeCategoryFilter = 'All';
                    renderCategories();
                    renderAddresses(searchInput.value);
                });
                categoryList.appendChild(backBtn);
            }

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

        // Sort: A-Z
        filtered.sort((a, b) => {
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
            } else {
                if (editorMiltonHeader) editorMiltonHeader.style.display = 'none';
                
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
        }

        // Date Line should always be displayed on the A4 page layout
        if (editorDateLine) editorDateLine.style.display = 'flex';
        
        // Set default current date if not set or placeholder is present
        if (editorDateVal && (editorDateVal.textContent.trim() === '' || editorDateVal.textContent.includes('Date') || editorDateVal.textContent.includes('[Date]'))) {
            const today = new Date();
            const dd = String(today.getDate()).padStart(2, '0');
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const yyyy = today.getFullYear();
            editorDateVal.textContent = `${dd}.${mm}.${yyyy}`;
        }

        // Apply Prefix Display
        if (companySettings.addPrefix) {
            editorPrefixIndicator.style.display = 'block';
        } else {
            editorPrefixIndicator.style.display = 'none';
        }

        // Apply Watermark Logo
        if (editorWatermark) {
            editorWatermark.innerHTML = getWatermarkHTML(companySettings);
        }
    };

    // --- Contact Edit Modal Trigger ---
    addNewBtn.addEventListener('click', () => {
        editingId = null;
        modalTitle.textContent = 'Create New Letter';
        inputName.value = '';
        if (editorTextarea) {
            editorTextarea.innerHTML = '';
            resetHistory();
        }
        
        if (inputCategory) inputCategory.value = activeCategoryFilter !== 'All' ? activeCategoryFilter : '';
        
        formatEditorA4Sheet();
        modalOverlay.classList.remove('hidden');
        setTimeout(() => inputName.focus(), 10);
    });

    cancelBtn.addEventListener('click', () => modalOverlay.classList.add('hidden'));

    saveAddressBtn.addEventListener('click', async () => {
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
                const index = companyAddresses.findIndex(a => String(a.id) === String(editingId));
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

        // Disable button during save to prevent early reload or double submission
        saveAddressBtn.disabled = true;
        const originalText = saveAddressBtn.textContent;
        saveAddressBtn.textContent = 'Saving...';

        try {
            await saveToServer();
            renderAddresses();
            modalOverlay.classList.add('hidden');
        } catch (err) {
            console.error(err);
            showNotification('Failed to save to server.', 'error', 'Error');
        } finally {
            saveAddressBtn.disabled = false;
            saveAddressBtn.textContent = originalText;
        }
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
                if (editorTextarea) {
                    editorTextarea.innerHTML = addr.address || '';
                    resetHistory();
                }
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

    // Custom Undo/Redo History Manager
    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 100;
    let lastSavedContent = '';

    function getSelectionState() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        const range = sel.getRangeAt(0);
        return {
            startPath: getNodePath(range.startContainer),
            startOffset: range.startOffset,
            endPath: getNodePath(range.endContainer),
            endOffset: range.endOffset
        };
    }

    function restoreSelectionState(state) {
        if (!state) return;
        try {
            const range = document.createRange();
            const startNode = getNodeFromPath(state.startPath);
            const endNode = getNodeFromPath(state.endPath);
            
            if (startNode && endNode) {
                range.setStart(startNode, Math.min(state.startOffset, startNode.length || startNode.childNodes.length));
                range.setEnd(endNode, Math.min(state.endOffset, endNode.length || endNode.childNodes.length));
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } catch (e) {
            console.warn('Failed to restore selection', e);
        }
    }

    function getNodePath(node) {
        const path = [];
        let curr = node;
        while (curr && curr !== editorTextarea) {
            const parent = curr.parentNode;
            if (!parent) break;
            const index = Array.from(parent.childNodes).indexOf(curr);
            path.unshift(index);
            curr = parent;
        }
        return path;
    }

    function getNodeFromPath(path) {
        let curr = editorTextarea;
        for (let index of path) {
            if (!curr || !curr.childNodes[index]) return null;
            curr = curr.childNodes[index];
        }
        return curr;
    }

    function saveHistory() {
        if (!editorTextarea) return;
        const currentContent = editorTextarea.innerHTML;
        if (currentContent === lastSavedContent) return;

        if (undoStack.length >= MAX_HISTORY) {
            undoStack.shift();
        }
        
        undoStack.push({
            content: currentContent,
            selection: getSelectionState()
        });
        
        redoStack.length = 0;
        lastSavedContent = currentContent;
    }

    function executeUndo() {
        if (undoStack.length === 0) return;
        const currentContent = editorTextarea.innerHTML;
        redoStack.push({
            content: currentContent,
            selection: getSelectionState()
        });

        const state = undoStack.pop();
        if (state.content === currentContent && undoStack.length > 0) {
            const nextState = undoStack.pop();
            editorTextarea.innerHTML = nextState.content;
            restoreSelectionState(nextState.selection);
            lastSavedContent = nextState.content;
        } else {
            editorTextarea.innerHTML = state.content;
            restoreSelectionState(state.selection);
            lastSavedContent = state.content;
        }
        updateRibbonFromSelection();
    }

    function executeRedo() {
        if (redoStack.length === 0) return;
        const state = redoStack.pop();
        undoStack.push({
            content: editorTextarea.innerHTML,
            selection: getSelectionState()
        });
        editorTextarea.innerHTML = state.content;
        restoreSelectionState(state.selection);
        lastSavedContent = state.content;
        updateRibbonFromSelection();
    }

    function resetHistory() {
        undoStack.length = 0;
        redoStack.length = 0;
        if (editorTextarea) {
            lastSavedContent = editorTextarea.innerHTML;
            undoStack.push({
                content: lastSavedContent,
                selection: null
            });
        }
    }

    // Helpers to wrap selection with temporary markers to preserve selection after DOM changes
    function wrapSelectionWithMarkers() {
        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) return null;
        
        const range = selection.getRangeAt(0);
        
        const startMarker = document.createElement('span');
        startMarker.id = 'sel-start-marker';
        startMarker.style.display = 'none';
        
        const endMarker = document.createElement('span');
        endMarker.id = 'sel-end-marker';
        endMarker.style.display = 'none';
        
        const endRange = range.cloneRange();
        endRange.collapse(false);
        endRange.insertNode(endMarker);
        
        const startRange = range.cloneRange();
        startRange.collapse(true);
        startRange.insertNode(startMarker);
        
        range.setStartAfter(startMarker);
        range.setEndBefore(endMarker);
        selection.removeAllRanges();
        selection.addRange(range);
        
        return { startMarker, endMarker };
    }

    function restoreSelectionFromMarkers() {
        const selection = window.getSelection();
        const markerStart = editorTextarea.querySelector('#sel-start-marker');
        const markerEnd = editorTextarea.querySelector('#sel-end-marker');
        
        if (markerStart && markerEnd) {
            const newRange = document.createRange();
            newRange.setStartAfter(markerStart);
            newRange.setEndBefore(markerEnd);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
        
        if (markerStart) markerStart.remove();
        if (markerEnd) markerEnd.remove();
    }

    function applyFontSizeToSelection(sizeVal) {
        saveHistory();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);

        if (selection.isCollapsed) {
            const span = document.createElement('span');
            span.style.fontSize = sizeVal;
            span.innerHTML = '&#8203;';
            range.insertNode(span);
            
            const newRange = document.createRange();
            newRange.setStart(span.firstChild, 1);
            newRange.setEnd(span.firstChild, 1);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } else {
            wrapSelectionWithMarkers();
            document.execCommand('fontSize', false, '7');
            const fontElements = editorTextarea.querySelectorAll('font[size="7"]');
            fontElements.forEach(font => {
                const span = document.createElement('span');
                span.style.fontSize = sizeVal;
                Array.from(font.attributes).forEach(attr => {
                    if (attr.name !== 'size') span.setAttribute(attr.name, attr.value);
                });
                span.innerHTML = font.innerHTML;
                font.parentNode.replaceChild(span, font);
            });
            restoreSelectionFromMarkers();
        }
        companySettings.fontSize = parseInt(sizeVal) || 14;
        saveToServer();
        saveHistory();
    }

    function applyFontFamilyToSelection(familyVal) {
        saveHistory();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);

        if (selection.isCollapsed) {
            const span = document.createElement('span');
            span.style.fontFamily = familyVal;
            span.innerHTML = '&#8203;';
            range.insertNode(span);
            
            const newRange = document.createRange();
            newRange.setStart(span.firstChild, 1);
            newRange.setEnd(span.firstChild, 1);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } else {
            wrapSelectionWithMarkers();
            document.execCommand('fontName', false, familyVal);
            const fontElements = editorTextarea.querySelectorAll(`font[face="${familyVal}"]`);
            fontElements.forEach(font => {
                const span = document.createElement('span');
                span.style.fontFamily = familyVal;
                Array.from(font.attributes).forEach(attr => {
                    if (attr.name !== 'face') span.setAttribute(attr.name, attr.value);
                });
                span.innerHTML = font.innerHTML;
                font.parentNode.replaceChild(span, font);
            });
            restoreSelectionFromMarkers();
        }
        companySettings.fontFamily = familyVal;
        saveToServer();
        saveHistory();
    }

    if (editorFontFamily) {
        editorFontFamily.addEventListener('change', () => {
            applyFontFamilyToSelection(editorFontFamily.value);
        });
    }
    if (editorFontSize) {
        editorFontSize.addEventListener('change', () => {
            applyFontSizeToSelection(editorFontSize.value + 'pt');
        });
    }
    if (editorLineHeight) editorLineHeight.addEventListener('change', updateFromRibbon);
    if (editorTopMargin) editorTopMargin.addEventListener('input', updateFromRibbon);
    if (editorLeftMargin) editorLeftMargin.addEventListener('input', updateFromRibbon);
    if (editorRightMargin) editorRightMargin.addEventListener('input', updateFromRibbon);
    if (editorPrintHeader) editorPrintHeader.addEventListener('change', updateFromRibbon);
    if (editorAddPrefix) editorAddPrefix.addEventListener('change', updateFromRibbon);

    // Sync ribbon button active states from browser cursor selection state
    const updateRibbonFromSelection = () => {
        if (!editorTextarea) return;

        // Save selection range in real-time if inside the editor area
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (editorTextarea.contains(range.startContainer) || editorTextarea.contains(range.endContainer)) {
                savedSelectionRange = range;
            }
        }
        
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

        // Font Family & Size dropdown sync
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let node = selection.getRangeAt(0).startContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
            if (editorTextarea.contains(node)) {
                const computed = window.getComputedStyle(node);
                if (editorFontFamily) {
                    const family = computed.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
                    for (let option of editorFontFamily.options) {
                        if (option.value.toLowerCase() === family.toLowerCase() || option.text.toLowerCase() === family.toLowerCase()) {
                            editorFontFamily.value = option.value;
                            break;
                        }
                    }
                }
                if (editorFontSize) {
                    const sizePx = parseFloat(computed.fontSize);
                    const sizePt = Math.round(sizePx * 0.75); // 1pt = 1.333px
                    // Sync dropdown value if matching
                    for (let option of editorFontSize.options) {
                        if (parseInt(option.value) === sizePt) {
                            editorFontSize.value = option.value;
                            break;
                        }
                    }
                }
                // Contextual Table Tools ribbon block sync
                const td = getActiveTableCell();
                const tableTools = document.getElementById('ribbon-table-tools');
                if (tableTools) {
                    tableTools.style.display = td ? 'flex' : 'none';
                }
            } else {
                const tableTools = document.getElementById('ribbon-table-tools');
                if (tableTools) tableTools.style.display = 'none';
            }
        } else {
            const tableTools = document.getElementById('ribbon-table-tools');
            if (tableTools) tableTools.style.display = 'none';
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

        // Typing history auto-save debouncer
        let typingTimer;
        editorTextarea.addEventListener('input', () => {
            clearTimeout(typingTimer);
            typingTimer = setTimeout(saveHistory, 800);
        });

        // Save history on word boundary / paragraph breaks (Space or Enter)
        editorTextarea.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                saveHistory();
            }
        });

        // Intercept paste event and insert plain text to prevent styling/margin breakages
        editorTextarea.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.originalEvent || e).clipboardData.getData('text/plain');
            try {
                if (!document.execCommand('insertText', false, text)) {
                    throw new Error('execCommand failed');
                }
            } catch (err) {
                const selection = window.getSelection();
                if (!selection.rangeCount) return;
                selection.deleteFromDocument();
                const range = selection.getRangeAt(0);
                const textNode = document.createTextNode(text);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            editorTextarea.dispatchEvent(new Event('input'));
        });
    }

    // Bullet/Number list elements
    const editorBtnBullets = document.getElementById('editor-btn-bullets');
    const editorBulletsLibrary = document.getElementById('editor-bullets-library');
    const editorBtnNumbers = document.getElementById('editor-btn-numbers');
    const editorNumbersLibrary = document.getElementById('editor-numbers-library');
    const editorBtnIndent = document.getElementById('editor-btn-indent');
    const editorBtnOutdent = document.getElementById('editor-btn-outdent');

    // Toggle dropdowns
    if (editorBtnBullets) {
        editorBtnBullets.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (editorNumbersLibrary) editorNumbersLibrary.style.display = 'none';
            if (editorBulletsLibrary) {
                editorBulletsLibrary.style.display = editorBulletsLibrary.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    if (editorBtnNumbers) {
        editorBtnNumbers.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (editorBulletsLibrary) editorBulletsLibrary.style.display = 'none';
            if (editorNumbersLibrary) {
                editorNumbersLibrary.style.display = editorNumbersLibrary.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    // Close libraries on click outside
    document.addEventListener('click', (e) => {
        if (editorBulletsLibrary && !editorBtnBullets.contains(e.target) && !editorBulletsLibrary.contains(e.target)) {
            editorBulletsLibrary.style.display = 'none';
        }
        if (editorNumbersLibrary && !editorBtnNumbers.contains(e.target) && !editorNumbersLibrary.contains(e.target)) {
            editorNumbersLibrary.style.display = 'none';
        }
    });

    // Helper to get active list container
    function getActiveListElement() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        let node = selection.getRangeAt(0).startContainer;
        while (node && node !== editorTextarea) {
            if (node.tagName === 'UL' || node.tagName === 'OL') {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    // Set list style type
    function setListStyle(listType, styleValue) {
        let listEl = getActiveListElement();
        if (!listEl) {
            const cmd = listType === 'ul' ? 'insertUnorderedList' : 'insertOrderedList';
            document.execCommand(cmd, false, null);
            listEl = getActiveListElement();
        }
        if (listEl) {
            const expectedTag = listType.toUpperCase();
            if (listEl.tagName !== expectedTag) {
                const cmd = listType === 'ul' ? 'insertUnorderedList' : 'insertOrderedList';
                document.execCommand(cmd, false, null);
                listEl = getActiveListElement();
            }
        }
        if (listEl) {
            if (styleValue === 'none') {
                listEl.style.listStyleType = 'none';
                listEl.querySelectorAll('li').forEach(li => li.style.listStyleType = 'none');
            } else {
                listEl.style.listStyleType = styleValue;
                listEl.querySelectorAll('li').forEach(li => li.style.listStyleType = styleValue);
            }
        }
        updateRibbonFromSelection();
    }

    // Bind options click
    document.querySelectorAll('.bullet-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const val = btn.dataset.value;
            setListStyle('ul', val);
            if (editorBulletsLibrary) editorBulletsLibrary.style.display = 'none';
        });
    });

    document.querySelectorAll('.number-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const val = btn.dataset.value;
            setListStyle('ol', val);
            if (editorNumbersLibrary) editorNumbersLibrary.style.display = 'none';
        });
    });

    // Propagate custom list styles to children
    function propagateListStyle(listEl) {
        if (!listEl) return;
        const currentStyle = listEl.style.listStyleType;
        if (currentStyle) {
            listEl.querySelectorAll('ul, ol, li').forEach(el => {
                el.style.listStyleType = currentStyle;
            });
        }
    }

    // Indent / Outdent
    if (editorBtnIndent) {
        editorBtnIndent.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('indent', false, null);
            propagateListStyle(getActiveListElement());
            updateRibbonFromSelection();
        });
    }

    if (editorBtnOutdent) {
        editorBtnOutdent.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('outdent', false, null);
            propagateListStyle(getActiveListElement());
            updateRibbonFromSelection();
        });
    }

    // Helper to get active list item
    function getActiveListItem() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        let node = selection.getRangeAt(0).startContainer;
        while (node && node !== editorTextarea) {
            if (node.tagName === 'LI') {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    // Keyboard handling for Tab, Shift+Tab, Backspace, Ctrl+Z, Ctrl+Y to match MS Word behaviors
    if (editorTextarea) {
        editorTextarea.addEventListener('keydown', (e) => {
            const keyLower = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && keyLower === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    executeRedo();
                } else {
                    executeUndo();
                }
            } else if ((e.ctrlKey || e.metaKey) && keyLower === 'y') {
                e.preventDefault();
                executeRedo();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                saveHistory();
                const activeList = getActiveListElement();
                if (e.shiftKey) {
                    document.execCommand('outdent', false, null);
                } else {
                    document.execCommand('indent', false, null);
                }
                if (activeList) {
                    propagateListStyle(activeList);
                }
                updateRibbonFromSelection();
                saveHistory();
            } else if (e.key === 'Backspace') {
                const li = getActiveListItem();
                if (li) {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        // If cursor is at the very beginning of the list item text, outdent/convert to normal paragraph
                        if (range.collapsed && range.startOffset === 0) {
                            e.preventDefault();
                            saveHistory();
                            document.execCommand('outdent', false, null);
                            updateRibbonFromSelection();
                            saveHistory();
                        }
                    }
                }
            }
        });
    }

    // Ribbon Toggle Button Listeners via document.execCommand using mousedown to prevent selection loss
    if (editorBtnBold) {
        editorBtnBold.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents selection loss
            document.execCommand('bold', false, null);
            updateRibbonFromSelection();
        });
    }
    if (editorBtnItalic) {
        editorBtnItalic.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents selection loss
            document.execCommand('italic', false, null);
            updateRibbonFromSelection();
        });
    }
    if (editorBtnUnderline) {
        editorBtnUnderline.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents selection loss
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

        if (format.fontSize) {
            document.execCommand('fontSize', false, '7');
            const fontElements = editorTextarea.querySelectorAll('font[size="7"]');
            fontElements.forEach(font => {
                const span = document.createElement('span');
                span.style.fontSize = format.fontSize;
                Array.from(font.attributes).forEach(attr => {
                    if (attr.name !== 'size') span.setAttribute(attr.name, attr.value);
                });
                span.innerHTML = font.innerHTML;
                font.parentNode.replaceChild(span, font);
            });
        }

        if (format.fontFamily) {
            document.execCommand('fontName', false, format.fontFamily);
            const fontElements = editorTextarea.querySelectorAll(`font[face="${format.fontFamily}"]`);
            fontElements.forEach(font => {
                const span = document.createElement('span');
                span.style.fontFamily = format.fontFamily;
                Array.from(font.attributes).forEach(attr => {
                    if (attr.name !== 'face') span.setAttribute(attr.name, attr.value);
                });
                span.innerHTML = font.innerHTML;
                font.parentNode.replaceChild(span, font);
            });
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

    // Alignment buttons listeners via mousedown to prevent selection loss
    if (editorAlignLeft) {
        editorAlignLeft.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents selection loss
            document.execCommand('justifyLeft', false, null);
            updateRibbonFromSelection();
        });
    }
    if (editorAlignCenter) {
        editorAlignCenter.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents selection loss
            document.execCommand('justifyCenter', false, null);
            updateRibbonFromSelection();
        });
    }
    if (editorAlignRight) {
        editorAlignRight.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents selection loss
            document.execCommand('justifyRight', false, null);
            updateRibbonFromSelection();
        });
    }
    if (editorAlignJustify) {
        editorAlignJustify.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents selection loss
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
            if (companySettings.printHeader) {
                const style = 'milton';
                if (style === 'milton') {
                    headerHtml = getMiltonHeaderHTML(companySettings, true, item.logoImg);
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

            const currentDate = editorDateVal ? editorDateVal.textContent : '';
            const dateHtml = `
                <div style="display: flex; justify-content: flex-end; font-size: 11pt; font-weight: 700; margin-top: 8px; margin-bottom: 12px; font-family: 'Outfit', sans-serif; width: 100%;">
                    Date : &nbsp;<span style="border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; text-align: center;">${currentDate}</span>
                </div>
            `;

            page.innerHTML = `
                <div class="letterpad-watermark">${getWatermarkHTML(companySettings)}</div>
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
            printContainer.style.position = 'absolute';
            printContainer.style.left = '0';
            printContainer.style.top = '0';
            printContainer.style.width = '210mm';
            printContainer.style.display = 'block';
            printContainer.style.zIndex = '-99999';

            html2pdf().set(opt).from(printContainer).save().then(() => {
                printContainer.innerHTML = '';
                printContainer.classList.add('print-only');
                printContainer.style.position = '';
                printContainer.style.left = '';
                printContainer.style.top = '';
                printContainer.style.width = '';
                printContainer.style.display = '';
                printContainer.style.zIndex = '';
                showNotification('PDF downloaded successfully.', 'success', 'PDF Saved');
            }).catch(err => {
                printContainer.classList.add('print-only');
                printContainer.innerHTML = '';
                printContainer.style.position = '';
                printContainer.style.left = '';
                printContainer.style.top = '';
                printContainer.style.width = '';
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

    // Change Selection Case Function
    function changeSelectionCase(caseType) {
        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) return;

        saveHistory();
        const range = selection.getRangeAt(0);
        
        // Collect all text nodes that intersect the selection range
        const textNodes = [];
        const walk = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (range.intersectsNode(node)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        let node;
        while (node = walk.nextNode()) {
            textNodes.push(node);
        }
        
        textNodes.forEach(textNode => {
            let startOffset = 0;
            let endOffset = textNode.length;
            
            if (textNode === range.startContainer) startOffset = range.startOffset;
            if (textNode === range.endContainer) endOffset = range.endOffset;
            
            const originalVal = textNode.nodeValue;
            const targetVal = originalVal.slice(startOffset, endOffset);
            
            let transformed = '';
            if (caseType === 'uppercase') {
                transformed = targetVal.toUpperCase();
            } else if (caseType === 'lowercase') {
                transformed = targetVal.toLowerCase();
            } else if (caseType === 'sentence') {
                transformed = targetVal.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
            } else if (caseType === 'capitalize') {
                transformed = targetVal.toLowerCase().replace(/\b([a-z])/g, (m, p1) => p1.toUpperCase());
            } else if (caseType === 'toggle') {
                transformed = targetVal.split('').map(c => {
                    if (c === c.toUpperCase()) return c.toLowerCase();
                    return c.toUpperCase();
                }).join('');
            }
            
            textNode.nodeValue = originalVal.slice(0, startOffset) + transformed + originalVal.slice(endOffset);
        });
        
        saveHistory();
    }

    // Sentence Highlight Function
    function highlightCurrentSentence(color) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        saveHistory();
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        if (node.nodeType !== Node.TEXT_NODE) {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            node = walker.nextNode() || node;
        }
        
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            const offset = range.startOffset;
            
            let start = 0;
            for (let i = offset - 1; i >= 0; i--) {
                if (/[.!?\n]/.test(text[i])) {
                    start = i + 1;
                    break;
                }
            }
            
            let end = text.length;
            for (let i = offset; i < text.length; i++) {
                if (/[.!?\n]/.test(text[i])) {
                    end = i + 1;
                    break;
                }
            }
            
            const sentenceRange = document.createRange();
            sentenceRange.setStart(node, start);
            sentenceRange.setEnd(node, end);
            
            const span = document.createElement('span');
            span.style.backgroundColor = color;
            
            try {
                sentenceRange.surroundContents(span);
            } catch (e) {
                document.execCommand('hiliteColor', false, color);
            }
        } else {
            document.execCommand('hiliteColor', false, color);
        }
        saveHistory();
    }

    // Change Case Listeners
    const btnCase = document.getElementById('editor-btn-case');
    const caseDropdown = document.getElementById('editor-case-dropdown');
    
    if (btnCase) {
        btnCase.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (caseDropdown) {
                caseDropdown.style.display = caseDropdown.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    document.querySelectorAll('.case-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const val = btn.dataset.value;
            changeSelectionCase(val);
            if (caseDropdown) caseDropdown.style.display = 'none';
        });
    });

    document.addEventListener('click', (e) => {
        if (caseDropdown && btnCase && !btnCase.contains(e.target) && !caseDropdown.contains(e.target)) {
            caseDropdown.style.display = 'none';
        }
    });

    // --- MS Word-Style Theme Color Grid Dropdowns ---
    function setupColorDropdowns() {
        const themeColors = [
            ['#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'],
            ['#f2f2f2', '#7f7f7f', '#eeece1', '#dce6f1', '#ebf1f9', '#f2dbdb', '#eef3e2', '#e5e0ec', '#dbf0f5', '#fdeada'],
            ['#d9d9d9', '#595959', '#ddd9c3', '#b8cce4', '#c6d9f0', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dde8', '#fbd5b5'],
            ['#bfbfbf', '#3f3f3f', '#c4bd97', '#95b3d7', '#8db4e2', '#d99694', '#c3d69b', '#b2a1c7', '#92cddc', '#fac08f'],
            ['#a6a6a6', '#262626', '#938953', '#366092', '#376091', '#953734', '#76933c', '#5f497a', '#31859c', '#e36c09'],
            ['#7f7f7f', '#0d0d0d', '#494429', '#163356', '#243f60', '#632423', '#4f6128', '#3f3151', '#205867', '#974806']
        ];

        const standardColors = ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'];

        function buildDropdownHTML(defaultColorLabel, defaultColor) {
            let gridHtml = '';
            themeColors.forEach(row => {
                row.forEach(color => {
                    gridHtml += `<div class="color-grid-cell" data-color="${color}" style="background-color: ${color}; width: 15px; height: 15px; border: 1px solid rgba(255,255,255,0.15); border-radius: 2px; cursor: pointer; transition: transform 0.1s;" title="${color}"></div>`;
                });
            });

            let stdHtml = '';
            standardColors.forEach(color => {
                stdHtml += `<div class="color-grid-cell" data-color="${color}" style="background-color: ${color}; width: 15px; height: 15px; border: 1px solid rgba(255,255,255,0.15); border-radius: 2px; cursor: pointer; transition: transform 0.1s;" title="${color}"></div>`;
            });

            return `
                <div class="editor-color-dropdown hidden" style="position: absolute; left: 0; top: 28px; z-index: 10000; background: #222; border: 1px solid #444; border-radius: 5px; padding: 10px; width: 200px; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
                    <div style="border-bottom: 1px solid #333; padding-bottom: 6px; margin-bottom: 6px;">
                        <button class="automatic-color-btn" data-color="${defaultColor}" style="background: transparent; color: #fff; border: 1px solid #444; width: 100%; text-align: left; padding: 4px 8px; border-radius: 3px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 8px; outline: none;">
                            <span style="display: inline-block; width: 12px; height: 12px; background: ${defaultColor === 'transparent' ? '#fff' : defaultColor}; border: 1px solid #fff; border-radius: 2px;"></span>
                            ${defaultColorLabel}
                        </button>
                    </div>
                    
                    <div style="font-size: 0.65rem; color: #999; font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">Theme Colors</div>
                    <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; margin-bottom: 8px;">
                        ${gridHtml}
                    </div>

                    <div style="font-size: 0.65rem; color: #999; font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">Standard Colors</div>
                    <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; margin-bottom: 8px;">
                        ${stdHtml}
                    </div>
                    
                    <div style="border-top: 1px solid #333; padding-top: 6px; display: flex; align-items: center;">
                        <button class="more-colors-btn" style="background: transparent; color: #fff; border: none; width: 100%; text-align: left; padding: 4px 8px; border-radius: 3px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 6px; outline: none;">
                            🎨 More Colors...
                        </button>
                    </div>
                </div>
            `;
        }

        const pickers = [
            {
                btnId: 'editor-btn-fontcolor',
                pickerId: 'editor-fontcolor-picker',
                indicatorId: 'font-color-indicator',
                command: 'foreColor',
                defaultLabel: 'Automatic (Black)',
                defaultColor: '#000000'
            },
            {
                btnId: 'editor-btn-highlight',
                pickerId: 'editor-highlight-picker',
                indicatorId: 'highlight-color-indicator',
                command: 'hiliteColor',
                defaultLabel: 'No Color',
                defaultColor: 'transparent'
            },
            {
                btnId: 'editor-btn-sentcolor',
                pickerId: 'editor-sentcolor-picker',
                indicatorId: 'sent-color-indicator',
                command: 'hiliteColor',
                defaultLabel: 'No Color',
                defaultColor: 'transparent'
            }
        ];

        pickers.forEach(config => {
            const btn = document.getElementById(config.btnId);
            const nativePicker = document.getElementById(config.pickerId);
            const indicator = document.getElementById(config.indicatorId);
            if (!btn || !nativePicker) return;

            nativePicker.style.display = 'none';

            const wrapper = btn.parentElement;
            wrapper.style.position = 'relative';
            
            const dropdownContainer = document.createElement('div');
            dropdownContainer.innerHTML = buildDropdownHTML(config.defaultLabel, config.defaultColor);
            const dropdown = dropdownContainer.firstElementChild;
            wrapper.appendChild(dropdown);

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                document.querySelectorAll('.editor-color-dropdown').forEach(d => {
                    if (d !== dropdown) d.classList.add('hidden');
                });
                
                dropdown.classList.toggle('hidden');
            });

            dropdown.querySelectorAll('.color-grid-cell').forEach(cell => {
                cell.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // Keep selection focus inside editor
                });
                cell.addEventListener('click', (e) => {
                    const color = cell.dataset.color;
                    applyColor(color);
                    dropdown.classList.add('hidden');
                });
            });

            const autoBtn = dropdown.querySelector('.automatic-color-btn');
            if (autoBtn) {
                autoBtn.addEventListener('mousedown', (e) => { e.preventDefault(); });
                autoBtn.addEventListener('click', (e) => {
                    const color = autoBtn.dataset.color;
                    applyColor(color);
                    dropdown.classList.add('hidden');
                });
            }

            const moreBtn = dropdown.querySelector('.more-colors-btn');
            if (moreBtn) {
                moreBtn.addEventListener('mousedown', (e) => { e.preventDefault(); });
                moreBtn.addEventListener('click', (e) => {
                    dropdown.classList.add('hidden');
                    nativePicker.click();
                });
            }

            nativePicker.addEventListener('input', (e) => {
                const color = e.target.value;
                applyColor(color);
            });

            function applyColor(color) {
                if (indicator) {
                    indicator.style.background = color === 'transparent' ? 'transparent' : color;
                }
                saveHistory();
                document.execCommand(config.command, false, color);
                saveHistory();
            }
        });

        document.addEventListener('click', (e) => {
            document.querySelectorAll('.editor-color-dropdown').forEach(dropdown => {
                const parent = dropdown.parentElement;
                if (parent && !parent.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            });
        });
    }
    setupColorDropdowns();

    // --- Find and Replace UI & Functionality ---
    const btnFindReplace = document.getElementById('editor-btn-find-replace');
    const findReplaceModal = document.getElementById('find-replace-modal');
    const findReplaceCloseBtn = document.getElementById('find-replace-close-btn');
    const findInput = document.getElementById('find-input');
    const replaceInput = document.getElementById('replace-input');
    const findMatchCase = document.getElementById('find-match-case');
    const findReplaceStatus = document.getElementById('find-replace-status');
    const btnFindNext = document.getElementById('btn-find-next');
    const btnFindAll = document.getElementById('btn-find-all');
    const btnReplace = document.getElementById('btn-replace');
    const btnReplaceAll = document.getElementById('btn-replace-all');

    // Highlight All Matches Helper using TreeWalker to avoid breaking HTML structures
    function highlightAllMatches(findText, matchCase) {
        clearAllHighlights();
        if (!findText || !editorTextarea) return;

        const textNodes = [];
        const walk = document.createTreeWalker(editorTextarea, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walk.nextNode()) {
            textNodes.push(node);
        }

        let count = 0;
        // Search and split backwards to prevent node index shift issues
        for (let i = textNodes.length - 1; i >= 0; i--) {
            const textNode = textNodes[i];
            const text = textNode.nodeValue;
            
            let index = matchCase 
                ? text.indexOf(findText) 
                : text.toLowerCase().indexOf(findText.toLowerCase());
                
            if (index !== -1) {
                let currentTextNode = textNode;
                while (index !== -1) {
                    const matchStart = index;
                    const matchEnd = index + findText.length;
                    
                    const highlightSpan = document.createElement('span');
                    highlightSpan.className = 'find-highlight-all';
                    highlightSpan.style.backgroundColor = '#ea580c';
                    highlightSpan.style.color = '#fff';
                    highlightSpan.style.borderRadius = '2px';
                    highlightSpan.style.padding = '0 1px';
                    highlightSpan.textContent = currentTextNode.nodeValue.slice(matchStart, matchEnd);
                    
                    const remainingTextNode = currentTextNode.splitText(matchStart);
                    remainingTextNode.nodeValue = remainingTextNode.nodeValue.slice(findText.length);
                    
                    currentTextNode.parentNode.insertBefore(highlightSpan, remainingTextNode);
                    count++;
                    
                    currentTextNode = remainingTextNode;
                    const nextText = currentTextNode.nodeValue;
                    index = matchCase 
                        ? nextText.indexOf(findText) 
                        : nextText.toLowerCase().indexOf(findText.toLowerCase());
                }
            }
        }

        if (findReplaceStatus) {
            findReplaceStatus.textContent = count > 0 
                ? `Found and highlighted ${count} match(es).` 
                : 'No matches found.';
        }
    }

    // Clear all highlighted matches
    function clearAllHighlights() {
        if (!editorTextarea) return;
        const highlights = editorTextarea.querySelectorAll('.find-highlight-all');
        highlights.forEach(span => {
            const textNode = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(textNode, span);
        });
        editorTextarea.normalize(); // Merge adjacent text nodes cleanly
    }

    if (btnFindReplace && findReplaceModal) {
        btnFindReplace.addEventListener('click', (e) => {
            e.preventDefault();
            findReplaceModal.classList.remove('hidden');
            if (findReplaceStatus) findReplaceStatus.textContent = '';
            if (findInput) {
                findInput.focus();
                findInput.select();
            }
        });
    }

    if (findReplaceCloseBtn && findReplaceModal) {
        findReplaceCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearAllHighlights();
            findReplaceModal.classList.add('hidden');
        });
    }

    // Clear matches highlighting dynamically when user changes inputs
    if (findInput) {
        findInput.addEventListener('input', () => {
            clearAllHighlights();
            if (findReplaceStatus) findReplaceStatus.textContent = '';
        });
    }

    // Helper: Reset cursor position to top of text area
    function moveCursorToDocStart() {
        if (!editorTextarea) return;
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editorTextarea);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    if (btnFindNext) {
        btnFindNext.addEventListener('click', (e) => {
            e.preventDefault();
            clearAllHighlights(); // Clear global highlights so browser find focus shows cleanly
            if (!findInput || !editorTextarea) return;
            const findText = findInput.value;
            if (!findText) {
                if (findReplaceStatus) findReplaceStatus.textContent = 'Please enter a search term.';
                return;
            }
            const matchCase = findMatchCase ? findMatchCase.checked : false;
            
            editorTextarea.focus();
            const found = window.find(findText, matchCase, false, true, false, false, false);
            if (findReplaceStatus) {
                findReplaceStatus.textContent = found ? 'Match highlighted.' : 'No matches found.';
            }
        });
    }

    if (btnFindAll) {
        btnFindAll.addEventListener('click', (e) => {
            e.preventDefault();
            if (!findInput) return;
            const findText = findInput.value;
            if (!findText) {
                if (findReplaceStatus) findReplaceStatus.textContent = 'Please enter a search term.';
                return;
            }
            const matchCase = findMatchCase ? findMatchCase.checked : false;
            highlightAllMatches(findText, matchCase);
        });
    }

    if (btnReplace) {
        btnReplace.addEventListener('click', (e) => {
            e.preventDefault();
            clearAllHighlights();
            if (!findInput || !replaceInput || !editorTextarea) return;
            const findText = findInput.value;
            const replaceText = replaceInput.value;
            if (!findText) {
                if (findReplaceStatus) findReplaceStatus.textContent = 'Please enter a search term.';
                return;
            }
            const matchCase = findMatchCase ? findMatchCase.checked : false;

            const selection = window.getSelection();
            const selectedText = selection.toString();

            const isMatch = matchCase 
                ? (selectedText === findText)
                : (selectedText.toLowerCase() === findText.toLowerCase());

            if (isMatch) {
                saveHistory();
                document.execCommand('insertText', false, replaceText);
                saveHistory();
                if (findReplaceStatus) findReplaceStatus.textContent = 'Replaced.';
                
                editorTextarea.focus();
                window.find(findText, matchCase, false, true, false, false, false);
            } else {
                editorTextarea.focus();
                const found = window.find(findText, matchCase, false, true, false, false, false);
                if (findReplaceStatus) {
                    findReplaceStatus.textContent = found ? 'Match found. Click Replace again.' : 'No matches found.';
                }
            }
        });
    }

    if (btnReplaceAll) {
        btnReplaceAll.addEventListener('click', (e) => {
            e.preventDefault();
            clearAllHighlights();
            if (!findInput || !replaceInput || !editorTextarea) return;
            const findText = findInput.value;
            const replaceText = replaceInput.value;
            if (!findText) {
                if (findReplaceStatus) findReplaceStatus.textContent = 'Please enter a search term.';
                return;
            }
            const matchCase = findMatchCase ? findMatchCase.checked : false;

            saveHistory();
            moveCursorToDocStart();
            
            let count = 0;
            let found = window.find(findText, matchCase, false, false, false, false, false);
            while (found) {
                document.execCommand('insertText', false, replaceText);
                count++;
                found = window.find(findText, matchCase, false, false, false, false, false);
            }

            saveHistory();
            if (findReplaceStatus) {
                findReplaceStatus.textContent = `Replaced ${count} occurrences.`;
            }
        });
    }

    // --- Table Insertion & Contextual Table Tools ---
    const btnTable = document.getElementById('editor-btn-table');
    const tableDropdown = document.getElementById('editor-table-dropdown');
    const gridContainer = document.getElementById('table-grid-container');
    const gridLabel = document.getElementById('table-grid-label');
    const btnManualTable = document.getElementById('btn-manual-table');

    // Toggle Table Dropdown
    if (btnTable && tableDropdown) {
        btnTable.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            tableDropdown.style.display = tableDropdown.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Generate 10x8 Grid inside #table-grid-container
    if (gridContainer) {
        for (let r = 1; r <= 8; r++) {
            for (let c = 1; c <= 10; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.style.width = '12px';
                cell.style.height = '12px';
                cell.style.border = '1px solid #555';
                cell.style.background = '#3b3b3b';
                cell.style.borderRadius = '1px';
                cell.style.boxSizing = 'border-box';
                gridContainer.appendChild(cell);
            }
        }

        const cells = gridContainer.querySelectorAll('.grid-cell');
        gridContainer.addEventListener('mousemove', (e) => {
            if (e.target.classList.contains('grid-cell')) {
                const maxRow = parseInt(e.target.dataset.row);
                const maxCol = parseInt(e.target.dataset.col);
                if (gridLabel) gridLabel.textContent = `${maxCol} x ${maxRow} Table`;
                
                cells.forEach(cell => {
                    const r = parseInt(cell.dataset.row);
                    const c = parseInt(cell.dataset.col);
                    if (r <= maxRow && c <= maxCol) {
                        cell.style.background = '#ea580c';
                        cell.style.borderColor = '#ff7a33';
                    } else {
                        cell.style.background = '#3b3b3b';
                        cell.style.borderColor = '#555';
                    }
                });
            }
        });

        gridContainer.addEventListener('mouseleave', () => {
            if (gridLabel) gridLabel.textContent = 'Insert Table';
            cells.forEach(cell => {
                cell.style.background = '#3b3b3b';
                cell.style.borderColor = '#555';
            });
        });

        // Click grid cell to insert table
        gridContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('grid-cell')) {
                const rows = parseInt(e.target.dataset.row);
                const cols = parseInt(e.target.dataset.col);
                insertTable(cols, rows);
                if (tableDropdown) tableDropdown.style.display = 'none';
            }
        });
    }

    // Close Table Dropdown on click outside
    document.addEventListener('click', (e) => {
        if (tableDropdown && btnTable && !btnTable.contains(e.target) && !tableDropdown.contains(e.target)) {
            tableDropdown.style.display = 'none';
        }
    });

    // Manual Table Input
    if (btnManualTable) {
        btnManualTable.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tableDropdown) tableDropdown.style.display = 'none';
            
            const cols = parseInt(prompt("Enter number of columns (1-20):", "5"));
            if (isNaN(cols) || cols <= 0 || cols > 20) {
                alert("Invalid columns count entered.");
                return;
            }
            const rows = parseInt(prompt("Enter number of rows (1-50):", "3"));
            if (isNaN(rows) || rows <= 0 || rows > 50) {
                alert("Invalid rows count entered.");
                return;
            }
            
            insertTable(cols, rows);
        });
    }

    // Insert Table HTML Function
    function insertTable(cols, rows) {
        if (!editorTextarea) return;
        saveHistory();
        
        let tableHtml = `<table style="width: auto; border-collapse: collapse; margin: 15px 0; font-family: inherit;"><tbody>`;
        for (let r = 0; r < rows; r++) {
            tableHtml += '<tr>';
            for (let c = 0; c < cols; c++) {
                tableHtml += `<td style="border: 1px solid #cbd5e1; padding: 8px 12px; width: 100px; min-width: 50px; min-height: 24px; vertical-align: top;"><br></td>`;
            }
            tableHtml += '</tr>';
        }
        tableHtml += `</tbody></table><p><br></p>`;
        
        editorTextarea.focus();
        document.execCommand('insertHTML', false, tableHtml);
        saveHistory();
    }

    // Helper: Find active cell
    function getActiveTableCell() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        let node = selection.getRangeAt(0).startContainer;
        while (node && node !== editorTextarea) {
            if (node.tagName === 'TD' || node.tagName === 'TH') {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    // Table Operations Event Listeners
    const btnRowAbove = document.getElementById('editor-btn-row-above');
    const btnRowBelow = document.getElementById('editor-btn-row-below');
    const btnColLeft = document.getElementById('editor-btn-col-left');
    const btnColRight = document.getElementById('editor-btn-col-right');
    const btnDelRow = document.getElementById('editor-btn-del-row');
    const btnDelCol = document.getElementById('editor-btn-del-col');
    const btnDelTable = document.getElementById('editor-btn-del-table');

    if (btnRowAbove) {
        btnRowAbove.addEventListener('click', (e) => {
            e.preventDefault();
            const td = getActiveTableCell();
            if (td) {
                saveHistory();
                const row = td.closest('tr');
                const newRow = row.cloneNode(true);
                newRow.querySelectorAll('td, th').forEach(cell => cell.innerHTML = '<br>');
                row.parentNode.insertBefore(newRow, row);
                saveHistory();
            }
        });
    }

    if (btnRowBelow) {
        btnRowBelow.addEventListener('click', (e) => {
            e.preventDefault();
            const td = getActiveTableCell();
            if (td) {
                saveHistory();
                const row = td.closest('tr');
                const newRow = row.cloneNode(true);
                newRow.querySelectorAll('td, th').forEach(cell => cell.innerHTML = '<br>');
                row.parentNode.insertBefore(newRow, row.nextSibling);
                saveHistory();
            }
        });
    }

    if (btnColLeft) {
        btnColLeft.addEventListener('click', (e) => {
            e.preventDefault();
            const td = getActiveTableCell();
            if (td) {
                saveHistory();
                const table = td.closest('table');
                const cellIndex = td.cellIndex;
                Array.from(table.rows).forEach(row => {
                    const newCell = row.cells[cellIndex].cloneNode(true);
                    newCell.innerHTML = '<br>';
                    row.insertBefore(newCell, row.cells[cellIndex]);
                });
                saveHistory();
            }
        });
    }

    if (btnColRight) {
        btnColRight.addEventListener('click', (e) => {
            e.preventDefault();
            const td = getActiveTableCell();
            if (td) {
                saveHistory();
                const table = td.closest('table');
                const cellIndex = td.cellIndex;
                Array.from(table.rows).forEach(row => {
                    const newCell = row.cells[cellIndex].cloneNode(true);
                    newCell.innerHTML = '<br>';
                    row.insertBefore(newCell, row.cells[cellIndex].nextSibling);
                });
                saveHistory();
            }
        });
    }

    if (btnDelRow) {
        btnDelRow.addEventListener('click', (e) => {
            e.preventDefault();
            const td = getActiveTableCell();
            if (td) {
                saveHistory();
                const row = td.closest('tr');
                const table = td.closest('table');
                if (table.rows.length > 1) {
                    row.remove();
                } else {
                    table.remove();
                }
                saveHistory();
                updateRibbonFromSelection();
            }
        });
    }

    if (btnDelCol) {
        btnDelCol.addEventListener('click', (e) => {
            e.preventDefault();
            const td = getActiveTableCell();
            if (td) {
                saveHistory();
                const table = td.closest('table');
                const cellIndex = td.cellIndex;
                if (table.rows[0].cells.length > 1) {
                    Array.from(table.rows).forEach(row => {
                        if (row.cells[cellIndex]) row.cells[cellIndex].remove();
                    });
                } else {
                    table.remove();
                }
                saveHistory();
                updateRibbonFromSelection();
            }
        });
    }

    if (btnDelTable) {
        btnDelTable.addEventListener('click', (e) => {
            e.preventDefault();
            const td = getActiveTableCell();
            if (td) {
                saveHistory();
                const table = td.closest('table');
                table.remove();
                saveHistory();
                updateRibbonFromSelection();
            }
        });
    }

    // --- Interactive Table Move & Resize Handles ---
    const moveHandle = document.createElement('div');
    moveHandle.id = 'table-move-handle';
    moveHandle.contentEditable = 'false';
    moveHandle.style.cssText = `
        position: absolute;
        display: none;
        width: 22px;
        height: 22px;
        background: #ea580c;
        color: #fff;
        border-radius: 4px;
        cursor: move;
        z-index: 10000;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        user-select: none;
        -webkit-user-select: none;
    `;
    moveHandle.innerHTML = '☩'; // 4-directional move icon
    if (editorA4Sheet) editorA4Sheet.appendChild(moveHandle);

    const resizeHandle = document.createElement('div');
    resizeHandle.id = 'table-resize-handle';
    resizeHandle.contentEditable = 'false';
    resizeHandle.style.cssText = `
        position: absolute;
        display: none;
        width: 12px;
        height: 12px;
        background: #ffffff;
        border: 2.5px solid #ea580c;
        border-radius: 2px;
        cursor: se-resize;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.25);
        user-select: none;
        -webkit-user-select: none;
    `;
    if (editorA4Sheet) editorA4Sheet.appendChild(resizeHandle);

    // Create 4 edge resize handles
    const edgeRight = document.createElement('div');
    edgeRight.id = 'table-edge-right';
    edgeRight.contentEditable = 'false';
    edgeRight.style.cssText = `
        position: absolute;
        display: none;
        width: 6px;
        cursor: col-resize;
        z-index: 9999;
        background: transparent;
        transition: background-color 0.15s;
    `;
    edgeRight.addEventListener('mouseover', () => { edgeRight.style.backgroundColor = '#ea580c'; });
    edgeRight.addEventListener('mouseout', () => { edgeRight.style.backgroundColor = 'transparent'; });
    if (editorA4Sheet) editorA4Sheet.appendChild(edgeRight);

    const edgeLeft = document.createElement('div');
    edgeLeft.id = 'table-edge-left';
    edgeLeft.contentEditable = 'false';
    edgeLeft.style.cssText = `
        position: absolute;
        display: none;
        width: 6px;
        cursor: col-resize;
        z-index: 9999;
        background: transparent;
        transition: background-color 0.15s;
    `;
    edgeLeft.addEventListener('mouseover', () => { edgeLeft.style.backgroundColor = '#ea580c'; });
    edgeLeft.addEventListener('mouseout', () => { edgeLeft.style.backgroundColor = 'transparent'; });
    if (editorA4Sheet) editorA4Sheet.appendChild(edgeLeft);

    const edgeBottom = document.createElement('div');
    edgeBottom.id = 'table-edge-bottom';
    edgeBottom.contentEditable = 'false';
    edgeBottom.style.cssText = `
        position: absolute;
        display: none;
        height: 6px;
        cursor: row-resize;
        z-index: 9999;
        background: transparent;
        transition: background-color 0.15s;
    `;
    edgeBottom.addEventListener('mouseover', () => { edgeBottom.style.backgroundColor = '#ea580c'; });
    edgeBottom.addEventListener('mouseout', () => { edgeBottom.style.backgroundColor = 'transparent'; });
    if (editorA4Sheet) editorA4Sheet.appendChild(edgeBottom);

    const edgeTop = document.createElement('div');
    edgeTop.id = 'table-edge-top';
    edgeTop.contentEditable = 'false';
    edgeTop.style.cssText = `
        position: absolute;
        display: none;
        height: 6px;
        cursor: row-resize;
        z-index: 9999;
        background: transparent;
        transition: background-color 0.15s;
    `;
    edgeTop.addEventListener('mouseover', () => { edgeTop.style.backgroundColor = '#ea580c'; });
    edgeTop.addEventListener('mouseout', () => { edgeTop.style.backgroundColor = 'transparent'; });
    if (editorA4Sheet) editorA4Sheet.appendChild(edgeTop);

    let currentActiveTable = null;

    function updateTableHandles(table) {
        if (!table || !editorA4Sheet) {
            moveHandle.style.display = 'none';
            resizeHandle.style.display = 'none';
            edgeRight.style.display = 'none';
            edgeLeft.style.display = 'none';
            edgeBottom.style.display = 'none';
            edgeTop.style.display = 'none';
            currentActiveTable = null;
            return;
        }

        currentActiveTable = table;
        const sheetRect = editorA4Sheet.getBoundingClientRect();
        const tableRect = table.getBoundingClientRect();
        
        const top = tableRect.top - sheetRect.top;
        const left = tableRect.left - sheetRect.left;
        const width = tableRect.width;
        const height = tableRect.height;
        
        // Position move handle slightly offset at top-left
        moveHandle.style.top = (top - 11) + 'px';
        moveHandle.style.left = (left - 11) + 'px';
        moveHandle.style.display = 'flex';
        
        // Position corner resize handle at bottom-right
        resizeHandle.style.top = (top + height - 6) + 'px';
        resizeHandle.style.left = (left + width - 6) + 'px';
        resizeHandle.style.display = 'block';

        // Position 4 edge resize handles
        // Right edge
        edgeRight.style.top = top + 'px';
        edgeRight.style.left = (left + width - 3) + 'px';
        edgeRight.style.height = height + 'px';
        edgeRight.style.display = 'block';

        // Left edge
        edgeLeft.style.top = top + 'px';
        edgeLeft.style.left = (left - 3) + 'px';
        edgeLeft.style.height = height + 'px';
        edgeLeft.style.display = 'block';

        // Bottom edge
        edgeBottom.style.top = (top + height - 3) + 'px';
        edgeBottom.style.left = left + 'px';
        edgeBottom.style.width = width + 'px';
        edgeBottom.style.display = 'block';

        // Top edge
        edgeTop.style.top = (top - 3) + 'px';
        edgeTop.style.left = left + 'px';
        edgeTop.style.width = width + 'px';
        edgeTop.style.display = 'block';
    }

    // --- 4 Edge Resizing Listeners ---
    let isResizingRight = false;
    let rightStartX, rightStartWidth;

    edgeRight.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentActiveTable) return;
        
        isResizingRight = true;
        rightStartX = e.clientX;
        rightStartWidth = currentActiveTable.offsetWidth;
        
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleRightMove);
        document.addEventListener('mouseup', handleRightMouseUp);
    });

    function handleRightMove(e) {
        if (!isResizingRight || !currentActiveTable) return;
        const deltaX = e.clientX - rightStartX;
        const newWidth = Math.max(100, rightStartWidth + deltaX);
        currentActiveTable.style.width = newWidth + 'px';
        updateTableHandles(currentActiveTable);
    }

    function handleRightMouseUp() {
        isResizingRight = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleRightMove);
        document.removeEventListener('mouseup', handleRightMouseUp);
        saveHistory();
    }

    let isResizingLeft = false;
    let leftStartX, leftStartWidth, leftStartMargin;

    edgeLeft.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentActiveTable) return;
        
        isResizingLeft = true;
        leftStartX = e.clientX;
        leftStartWidth = currentActiveTable.offsetWidth;
        
        const style = window.getComputedStyle(currentActiveTable);
        leftStartMargin = parseFloat(style.marginLeft) || 0;
        
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleLeftMove);
        document.addEventListener('mouseup', handleLeftMouseUp);
    });

    function handleLeftMove(e) {
        if (!isResizingLeft || !currentActiveTable) return;
        const deltaX = e.clientX - leftStartX;
        
        const newMarginLeft = Math.max(0, leftStartMargin + deltaX);
        const actualDeltaMargin = newMarginLeft - leftStartMargin;
        const newWidth = Math.max(100, leftStartWidth - actualDeltaMargin);
        
        currentActiveTable.style.marginLeft = newMarginLeft + 'px';
        currentActiveTable.style.width = newWidth + 'px';
        
        updateTableHandles(currentActiveTable);
    }

    function handleLeftMouseUp() {
        isResizingLeft = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleLeftMove);
        document.removeEventListener('mouseup', handleLeftMouseUp);
        saveHistory();
    }

    let isResizingBottom = false;
    let bottomStartY, bottomStartHeight;

    edgeBottom.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentActiveTable) return;
        
        isResizingBottom = true;
        bottomStartY = e.clientY;
        bottomStartHeight = currentActiveTable.offsetHeight;
        
        document.body.style.cursor = 'row-resize';
        document.addEventListener('mousemove', handleBottomMove);
        document.addEventListener('mouseup', handleBottomMouseUp);
    });

    function handleBottomMove(e) {
        if (!isResizingBottom || !currentActiveTable) return;
        const deltaY = e.clientY - bottomStartY;
        const newHeight = Math.max(40, bottomStartHeight + deltaY);
        currentActiveTable.style.height = newHeight + 'px';
        updateTableHandles(currentActiveTable);
    }

    function handleBottomMouseUp() {
        isResizingBottom = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleBottomMove);
        document.removeEventListener('mouseup', handleBottomMouseUp);
        saveHistory();
    }

    let isResizingTop = false;
    let topStartY, topStartHeight;

    edgeTop.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentActiveTable) return;
        
        isResizingTop = true;
        topStartY = e.clientY;
        topStartHeight = currentActiveTable.offsetHeight;
        
        document.body.style.cursor = 'row-resize';
        document.addEventListener('mousemove', handleTopMove);
        document.addEventListener('mouseup', handleTopMouseUp);
    });

    function handleTopMove(e) {
        if (!isResizingTop || !currentActiveTable) return;
        const deltaY = e.clientY - topStartY;
        const newHeight = Math.max(40, topStartHeight - deltaY);
        currentActiveTable.style.height = newHeight + 'px';
        updateTableHandles(currentActiveTable);
    }

    function handleTopMouseUp() {
        isResizingTop = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleTopMove);
        document.removeEventListener('mouseup', handleTopMouseUp);
        saveHistory();
    }

    function getSelectionTable() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        const node = selection.anchorNode;
        if (!node) return null;
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode;
        return element ? element.closest('table') : null;
    }

    let resizeTargetCell = null;
    let resizeType = null; // 'col' or 'row'
    let isResizingBorder = false;
    let borderResizeStartX = 0;
    let borderResizeStartY = 0;
    let startCellWidth = 0;
    let startCellHeight = 0;
    let startTableWidth = 0;

    if (editorTextarea) {
        editorTextarea.addEventListener('mousemove', (e) => {
            if (isResizingBorder) return;

            const table = e.target.closest('table');
            if (table) {
                updateTableHandles(table);
            } else {
                const selectionTable = getSelectionTable();
                if (selectionTable) {
                    updateTableHandles(selectionTable);
                } else if (e.target !== moveHandle && e.target !== resizeHandle) {
                    updateTableHandles(null);
                }
            }

            // Cell border resizing detection
            const td = e.target.closest('td, th');
            if (!td) {
                if (!isMoving && !isResizing && !isResizingBorder) {
                    editorTextarea.style.cursor = '';
                    document.body.style.cursor = '';
                }
                return;
            }

            const rect = td.getBoundingClientRect();
            const borderTolerance = 6; // pixels tolerance for border selection
            let foundBorder = false;
            
            // Check right border
            if (rect.right - e.clientX <= borderTolerance && rect.right - e.clientX >= -borderTolerance) {
                td.style.cursor = 'col-resize';
                editorTextarea.style.cursor = 'col-resize';
                document.body.style.cursor = 'col-resize';
                resizeTargetCell = td;
                resizeType = 'col';
                foundBorder = true;
            } 
            // Check left border (resizes previous cell)
            else if (e.clientX - rect.left <= borderTolerance && e.clientX - rect.left >= -borderTolerance) {
                const prevTd = td.previousElementSibling;
                if (prevTd) {
                    td.style.cursor = 'col-resize';
                    editorTextarea.style.cursor = 'col-resize';
                    document.body.style.cursor = 'col-resize';
                    resizeTargetCell = prevTd;
                    resizeType = 'col';
                    foundBorder = true;
                } else {
                    td.style.cursor = '';
                    editorTextarea.style.cursor = '';
                    document.body.style.cursor = '';
                    resizeTargetCell = null;
                    resizeType = null;
                }
            }
            // Check bottom border
            else if (rect.bottom - e.clientY <= borderTolerance && rect.bottom - e.clientY >= -borderTolerance) {
                td.style.cursor = 'row-resize';
                editorTextarea.style.cursor = 'row-resize';
                document.body.style.cursor = 'row-resize';
                resizeTargetCell = td;
                resizeType = 'row';
                foundBorder = true;
            }
            // Check top border (resizes previous row cell)
            else if (e.clientY - rect.top <= borderTolerance && e.clientY - rect.top >= -borderTolerance) {
                const tr = td.parentElement;
                const prevTr = tr.previousElementSibling;
                if (prevTr) {
                    const colIndex = td.cellIndex;
                    const prevTd = prevTr.cells[colIndex];
                    if (prevTd) {
                        td.style.cursor = 'row-resize';
                        editorTextarea.style.cursor = 'row-resize';
                        document.body.style.cursor = 'row-resize';
                        resizeTargetCell = prevTd;
                        resizeType = 'row';
                        foundBorder = true;
                    } else {
                        td.style.cursor = '';
                        editorTextarea.style.cursor = '';
                        document.body.style.cursor = '';
                        resizeTargetCell = null;
                        resizeType = null;
                    }
                } else {
                    td.style.cursor = '';
                    editorTextarea.style.cursor = '';
                    document.body.style.cursor = '';
                    resizeTargetCell = null;
                    resizeType = null;
                }
            }
            
            if (!foundBorder) {
                td.style.cursor = '';
                if (!isMoving && !isResizing && !isResizingBorder) {
                    editorTextarea.style.cursor = '';
                    document.body.style.cursor = '';
                }
                resizeTargetCell = null;
                resizeType = null;
            }
        });

        editorTextarea.addEventListener('mousedown', (e) => {
            if (resizeTargetCell && resizeType) {
                e.preventDefault();
                e.stopPropagation();
                
                isResizingBorder = true;
                borderResizeStartX = e.clientX;
                borderResizeStartY = e.clientY;
                
                startCellWidth = resizeTargetCell.offsetWidth;
                startCellHeight = resizeTargetCell.offsetHeight;
                
                const table = resizeTargetCell.closest('table');
                if (table) {
                    startTableWidth = table.offsetWidth;
                }
                
                document.body.style.cursor = resizeType === 'col' ? 'col-resize' : 'row-resize';
                
                document.addEventListener('mousemove', handleBorderResizeMove);
                document.addEventListener('mouseup', handleBorderResizeMouseUp);
            } else {
                const table = e.target.closest('table');
                if (table) {
                    updateTableHandles(table);
                } else {
                    updateTableHandles(null);
                }
            }
        });

        editorTextarea.addEventListener('click', (e) => {
            if (isResizingBorder) return;
            const table = e.target.closest('table');
            if (table) {
                updateTableHandles(table);
            } else {
                updateTableHandles(null);
            }
        });

        editorTextarea.addEventListener('input', () => {
            const selectionTable = getSelectionTable();
            if (selectionTable) {
                updateTableHandles(selectionTable);
            }
        });
    }

    function handleBorderResizeMove(e) {
        if (!isResizingBorder || !resizeTargetCell) return;
        
        const table = resizeTargetCell.closest('table');
        
        if (resizeType === 'col') {
            const deltaX = e.clientX - borderResizeStartX;
            const newWidth = Math.max(30, startCellWidth + deltaX);
            
            // Apply cell width change
            resizeTargetCell.style.width = newWidth + 'px';
            
            // Also adjust table's overall width style if it exists
            if (table) {
                if (table.style.width && table.style.width !== 'auto') {
                    const tableDelta = newWidth - startCellWidth;
                    const newTableWidth = Math.max(100, startTableWidth + tableDelta);
                    table.style.width = newTableWidth + 'px';
                }
                updateTableHandles(table);
            }
        } else if (resizeType === 'row') {
            const deltaY = e.clientY - borderResizeStartY;
            const newHeight = Math.max(20, startCellHeight + deltaY);
            
            // Apply row height change
            resizeTargetCell.style.height = newHeight + 'px';
            
            if (table) {
                updateTableHandles(table);
            }
        }
    }

    function handleBorderResizeMouseUp() {
        isResizingBorder = false;
        document.removeEventListener('mousemove', handleBorderResizeMove);
        document.removeEventListener('mouseup', handleBorderResizeMouseUp);
        
        if (editorTextarea) editorTextarea.style.cursor = '';
        document.body.style.cursor = '';
        
        if (resizeTargetCell) {
            resizeTargetCell.style.cursor = '';
            resizeTargetCell = null;
        }
        resizeType = null;
        saveHistory();
    }

    // --- Resize Dragging Logic ---
    let isResizing = false;
    let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentActiveTable) return;
        
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartWidth = currentActiveTable.offsetWidth;
        resizeStartHeight = currentActiveTable.offsetHeight;
        
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeMouseUp);
        
        currentActiveTable.style.transition = 'none';
    });

    function handleResizeMove(e) {
        if (!isResizing || !currentActiveTable) return;
        
        const deltaX = e.clientX - resizeStartX;
        const deltaY = e.clientY - resizeStartY;
        
        const newWidth = Math.max(100, resizeStartWidth + deltaX);
        const newHeight = Math.max(40, resizeStartHeight + deltaY);
        
        currentActiveTable.style.width = newWidth + 'px';
        currentActiveTable.style.height = newHeight + 'px';
        
        updateTableHandles(currentActiveTable);
    }

    function handleResizeMouseUp() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
        saveHistory();
    }

    // --- Move Dragging & Position Logic ---
    let isMoving = false;
    let moveStartX, moveStartY;
    let tableStartMarginLeft;
    let placeholderLine = null;

    moveHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentActiveTable || !editorA4Sheet) return;
        
        isMoving = true;
        moveStartX = e.clientX;
        moveStartY = e.clientY;
        
        const style = window.getComputedStyle(currentActiveTable);
        tableStartMarginLeft = parseFloat(style.marginLeft) || 0;
        
        document.addEventListener('mousemove', handleMoveDrag);
        document.addEventListener('mouseup', handleMoveMouseUp);
        
        placeholderLine = document.createElement('div');
        placeholderLine.style.cssText = `
            height: 3px;
            background: #ea580c;
            position: absolute;
            width: 100%;
            display: none;
            z-index: 9999;
            pointer-events: none;
        `;
        editorA4Sheet.appendChild(placeholderLine);
    });

    function handleMoveDrag(e) {
        if (!isMoving || !currentActiveTable || !editorA4Sheet) return;
        
        const deltaX = e.clientX - moveStartX;
        const deltaY = e.clientY - moveStartY;
        
        // 1. Fluid visual feedback: make the table follow the cursor
        currentActiveTable.style.position = 'relative';
        currentActiveTable.style.left = deltaX + 'px';
        currentActiveTable.style.top = deltaY + 'px';
        currentActiveTable.style.zIndex = '99999';
        
        // 2. Vertical repositioning drop helper
        const sheetRect = editorA4Sheet.getBoundingClientRect();
        const textareaRect = editorTextarea.getBoundingClientRect();
        const clientY = e.clientY;
        const children = Array.from(editorTextarea.children);
        let targetSibling = null;
        let targetPos = 'before';
        
        if (clientY < textareaRect.top + 20) {
            targetSibling = editorTextarea.firstElementChild;
            targetPos = 'before';
        } else if (clientY > textareaRect.bottom - 20) {
            targetSibling = editorTextarea.lastElementChild;
            targetPos = 'after';
        } else {
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child === currentActiveTable) continue;
                
                const rect = child.getBoundingClientRect();
                const childMiddle = rect.top + rect.height / 2;
                
                if (clientY < childMiddle) {
                    targetSibling = child;
                    targetPos = 'before';
                    break;
                } else if (i === children.length - 1 || clientY < rect.bottom) {
                    targetSibling = child;
                    targetPos = 'after';
                    break;
                }
            }
        }
        
        if (targetSibling) {
            const sibRect = targetSibling.getBoundingClientRect();
            const top = (targetPos === 'before' ? sibRect.top : sibRect.bottom) - sheetRect.top;
            
            placeholderLine.style.top = top + 'px';
            placeholderLine.style.left = (sibRect.left - sheetRect.left) + 'px';
            placeholderLine.style.width = sibRect.width + 'px';
            placeholderLine.style.display = 'block';
            
            if (!targetSibling.id) {
                targetSibling.id = 'temp-sib-' + Date.now();
            }
            moveHandle.dataset.targetId = targetSibling.id;
            moveHandle.dataset.targetPos = targetPos;
        } else {
            placeholderLine.style.display = 'none';
        }
        
        updateTableHandles(currentActiveTable);
    }

    function ensureTrailingParagraph() {
        if (editorTextarea && editorTextarea.lastElementChild && editorTextarea.lastElementChild.tagName === 'TABLE') {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            editorTextarea.appendChild(p);
        }
    }

    function handleMoveMouseUp() {
        isMoving = false;
        document.removeEventListener('mousemove', handleMoveDrag);
        document.removeEventListener('mouseup', handleMoveMouseUp);
        
        if (placeholderLine) {
            placeholderLine.remove();
            placeholderLine = null;
        }
        
        // Reset relative drag styles
        if (currentActiveTable) {
            currentActiveTable.style.position = '';
            currentActiveTable.style.left = '';
            currentActiveTable.style.top = '';
            currentActiveTable.style.zIndex = '';
        }
        
        if (currentActiveTable && moveHandle.dataset.targetId) {
            const targetSibling = document.getElementById(moveHandle.dataset.targetId);
            const targetPos = moveHandle.dataset.targetPos;
            
            if (targetSibling) {
                saveHistory();
                
                // Recalculate final horizontal margin-left relative to parent
                const finalRect = currentActiveTable.getBoundingClientRect();
                const parentRect = editorTextarea.getBoundingClientRect();
                const newMarginLeft = Math.max(0, finalRect.left - parentRect.left);
                currentActiveTable.style.marginLeft = newMarginLeft + 'px';
                
                if (targetPos === 'before') {
                    editorTextarea.insertBefore(currentActiveTable, targetSibling);
                } else {
                    editorTextarea.insertBefore(currentActiveTable, targetSibling.nextSibling);
                }
                
                if (targetSibling.id.startsWith('temp-sib-')) {
                    targetSibling.removeAttribute('id');
                }
                
                ensureTrailingParagraph();
                saveHistory();
            }
        }
        
        moveHandle.removeAttribute('data-target-id');
        moveHandle.removeAttribute('data-target-pos');
        
        if (currentActiveTable) {
            updateTableHandles(currentActiveTable);
        }
    }

    // --- Startup connection ---
    loadSettings();
});
