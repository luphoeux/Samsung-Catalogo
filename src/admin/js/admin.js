document.addEventListener('DOMContentLoaded', () => {
    // ==================== DATA PERSISTENCE SYSTEM ====================

    const STORAGE_KEY = 'samsung_catalog_products';
    const COLORS_STORAGE_KEY = 'samsung_catalog_colors';

    // Load persisted data or use default from data.js
    function loadPersistedData() {
        try {
            const savedProducts = localStorage.getItem(STORAGE_KEY);
            const savedColors = localStorage.getItem(COLORS_STORAGE_KEY);

            if (savedProducts) {
                const parsed = JSON.parse(savedProducts);
                if (Array.isArray(parsed)) {
                    window.products = parsed;
                    console.log('✅ Productos cargados desde localStorage');
                } else if (parsed && Array.isArray(parsed.products)) {
                    // Recovery from corrupted save
                    window.products = parsed.products;
                    console.log('⚠️ Detectada estructura anidada incorrecta, reparando...');
                } else {
                    console.error('❌ Datos de productos en localStorage corruptos');
                }
            } else if (typeof window.products !== 'undefined') {
                // Check if data.js loaded a corrupted structure
                if (!Array.isArray(window.products) && window.products && Array.isArray(window.products.products)) {
                    window.products = window.products.products;
                    console.log('⚠️ Detectada estructura anidada incorrecta en data.js, reparando...');
                }
            }

            if (savedColors) {
                const parsedColors = JSON.parse(savedColors);
                const firstColor = Object.values(parsedColors)[0];
                if (firstColor && typeof firstColor === 'string') {
                    console.log('⚠️ Formato antiguo de colores detectado, limpiando localStorage...');
                    localStorage.removeItem(COLORS_STORAGE_KEY);
                } else {
                    window.colorVariables = parsedColors;
                    console.log('✅ Variables de color cargadas desde localStorage');
                }
            }
        } catch (e) {
            console.error('Error cargando datos persistidos:', e);
        }
    }

    // Save data to localStorage
    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
            localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(colorVariables));
            console.log(' Datos guardados automáticamente');

            // Update last save time
            const now = new Date().toLocaleString('es-BO');
            const saveIndicator = document.getElementById('lastSaveTime');
            if (saveIndicator) {
                saveIndicator.textContent = `Último guardado: ${now}`;
                saveIndicator.style.color = '#2e7d32';
            }
        } catch (e) {
            console.error('Error guardando datos:', e);
            alert('Error al guardar datos. El almacenamiento local puede estar lleno.');
        }
    }

    // Debounced save (wait 1 second after last change)
    let saveTimeout;
    function autoSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveData();
        }, 1000);
    }

    // Export data.js file
    window.exportDataJS = function () {
        const content = `var products = ${JSON.stringify(products, null, 4)};\n`;
        const blob = new Blob([content], { type: 'text/javascript' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data.js';
        link.click();
        alert('Archivo data.js descargado. ReemplÃ¡zalo en catalog-template/ para actualizar el catÃ¡logo.');
    }

    // Export color-variables.js file
    // Export color variables as Excel
    window.exportColorVariables = function () {
        const data = [['ID', 'Nombre del Color', 'CÃ³digo Hex']];

        if (typeof colorVariables !== 'undefined') {
            Object.keys(colorVariables).sort().forEach(color => {
                const colorData = colorVariables[color];
                data.push([colorData.id || '', color, colorData.hex || colorData]);
            });
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }];

        XLSX.utils.book_append_sheet(wb, ws, 'Colores');
        XLSX.writeFile(wb, 'Samsung_Colores.xlsx');
    }

    // Reset to original data.js
    window.resetData = function () {
        if (confirm('¿Estás seguro? Esto eliminará todos los cambios no exportados y volverá a los datos originales de data.js')) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(COLORS_STORAGE_KEY);
            location.reload();
        }
    }

    // Load persisted data on startup
    loadPersistedData();

    // Check if products data is loaded
    if (typeof products === 'undefined') {
        alert('Error: No se encontraron datos de productos (data.js no cargado).');
        return;
    }

    // --- Helper: Normalize Product Data ---
    window.normalizeProduct = function (p) {
        const norm = { ...p };

        // 1. Storage Options
        if (!norm.storageOptions || !Array.isArray(norm.storageOptions)) {
            norm.storageOptions = [];
            // Migration from legacy 'storage' string/array
            if (norm.storage) {
                if (Array.isArray(norm.storage)) {
                    norm.storage.forEach(cap => {
                        norm.storageOptions.push({
                            capacity: cap,
                            price: norm.price || 0,
                            originalPrice: norm.originalPrice || 0
                        });
                    });
                } else {
                    norm.storageOptions.push({
                        capacity: String(norm.storage),
                        price: norm.price || 0,
                        originalPrice: norm.originalPrice || 0
                    });
                }
            }
        }

        // 2. Variants (Ensure images array exists)
        if (!norm.variants || !Array.isArray(norm.variants)) {
            norm.variants = [];
        } else {
            norm.variants = norm.variants.map(v => {
                const nv = { ...v };
                if (!nv.images || !Array.isArray(nv.images)) {
                    nv.images = [];
                    if (nv.image) nv.images.push(nv.image);
                }
                return nv;
            });
        }
        return norm;
    }

    // --- IMPROVEMENT 1: Clean up experimental or unverified data entry ---
    window.validateAndCleanProduct = function (product) {
        const cleaned = { ...product };

        // Remove empty or invalid fields
        if (!cleaned.name || cleaned.name.trim() === '') {
            console.warn(`Product ${cleaned.id} has no name`);
            return null;
        }

        // Clean up variants - keep them if they have color OR price/variable info
        if (cleaned.variants && Array.isArray(cleaned.variants)) {
            cleaned.variants = cleaned.variants.filter(v => {
                const hasColor = v.color && v.color.trim() !== '';
                const hasPriceSpec = v.variableId || (v.variableText && v.variableText.trim() !== '') || v.price > 0;
                return hasColor || hasPriceSpec;
            });
        }

        // Clean up storage options - remove invalid ones
        if (cleaned.storageOptions && Array.isArray(cleaned.storageOptions)) {
            cleaned.storageOptions = cleaned.storageOptions.filter(s => {
                return s.capacity && s.capacity.trim() !== '' && s.price >= 0;
            });
        }

        // Ensure required fields have defaults
        cleaned.price = cleaned.price || 0;
        cleaned.category = cleaned.category || 'accessories';

        return cleaned;
    }

    // --- IMPROVEMENT 3: Implement logic for missing variants in placeholders ---
    window.fillMissingVariantPlaceholders = function (product, maxVariants = 5) {
        const filled = { ...product };

        if (!filled.variants) {
            filled.variants = [];
        }

        // Fill missing variants with placeholders
        while (filled.variants.length < maxVariants) {
            filled.variants.push({
                sku: '',
                color: '',
                hex: '',
                link: '',
                images: [],
                image: '',
                isPlaceholder: true
            });
        }

        return filled;
    }

    // --- IMPROVEMENT 2: Refactor logic for updating color placeholders ---
    window.updateColorInProducts = function (colorName, newHex) {
        let updatedCount = 0;

        products.forEach(product => {
            if (product.variants && Array.isArray(product.variants)) {
                product.variants.forEach(variant => {
                    if (variant.color === colorName) {
                        variant.hex = newHex;
                        updatedCount++;
                    }
                });
            }
        });

        console.log(`Updated ${updatedCount} variant(s) with color "${colorName}"`);
        return updatedCount;
    }

    window.syncColorVariablesWithProducts = function () {
        // Sync all color hex codes from colorVariables to products
        let syncedCount = 0;

        products.forEach(product => {
            if (product.variants && Array.isArray(product.variants)) {
                product.variants.forEach(variant => {
                    if (variant.color && colorVariables[variant.color]) {
                        const colorData = colorVariables[variant.color];
                        variant.hex = colorData.hex || colorData;
                        syncedCount++;
                    }
                });
            }
        });

        console.log(`Synced ${syncedCount} variant color(s) from color variables`);
        return syncedCount;
    }

    // ==================== CATEGORY MANAGEMENT SYSTEM ====================

    const CATEGORIES_STORAGE_KEY = 'samsung_catalog_categories';

    // Default categories (11 initial categories)
    const defaultCategories = {
        "Smartphones": { id: "ct001", name: "Smartphones", icon: "ðŸ“±" },
        "Tablets": { id: "ct002", name: "Tablets", icon: "ðŸ–Šï¸" },
        "Smartwatches": { id: "ct003", name: "Smartwatches", icon: "âŒš" },
        "Buds": { id: "ct004", name: "Buds", icon: "ðŸŽ§" },
        "Laptops": { id: "ct005", name: "Laptops", icon: "ðŸ’»" },
        "Televisores": { id: "ct006", name: "Televisores", icon: "ðŸ“º" },
        "Monitores": { id: "ct007", name: "Monitores", icon: "ðŸ–¥ï¸" },
        "Lavadoras": { id: "ct008", name: "Lavadoras", icon: "ðŸ§º" },
        "Refrigeradores": { id: "ct009", name: "Refrigeradores", icon: "â„ï¸" },
        "LÃ­nea Blanca": { id: "ct010", name: "LÃ­nea Blanca", icon: "ðŸ " },
        "Accesorios": { id: "ct011", name: "Accesorios", icon: "ðŸ”Œ" }
    };

    // Load categories from localStorage or use defaults
    let categories = {};
    try {
        const savedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        if (savedCategories) {
            const parsedCategories = JSON.parse(savedCategories);
            // Check for format validity (must have id and icon)
            const firstCategory = Object.values(parsedCategories)[0];
            const isValid = firstCategory && firstCategory.id && firstCategory.icon;

            if (!isValid) {
                console.log('Formato incompleto de categoría detectado, reiniciando...');
                categories = { ...defaultCategories };
                localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
                console.log('categorías reiniciadas con iconos y IDs');
            } else {
                categories = parsedCategories;
                console.log('categorías cargadas desde localStorage');
            }
        } else {
            categories = { ...defaultCategories };
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
            console.log('categorías inicializadas con valores por defecto');
        }
    } catch (e) {
        console.error('Error cargando categorías:', e);
        categories = { ...defaultCategories };
    }

    // Save categories to localStorage
    function saveCategories() {
        try {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
            console.log(' categoríasguardadas');
            autoSave(); // Also trigger general auto-save
        } catch (e) {
            console.error('Error guardando categorías:', e);
        }
    }

    // Export categories to JSON file
    window.exportCategories = function () {
        const content = `var categories = ${JSON.stringify(categories, null, 4)};\\n`;
        const blob = new Blob([content], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'categories.json';
        link.click();
        alert('categoríasexportadas correctamente');
    }

    // State
    let filteredProducts = [...products];
    let filteredCategories = [];
    let filteredVariables = [];
    let filteredTags = [];
    let filteredPromotions = [];
    let currentView = 'catalogs';

    // DOM Elements - Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    // DOM Elements - Products View
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('adminSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const addProductBtn = document.getElementById('addProductBtn');

    // DOM Elements - Catalogs View
    const catalogsGrid = document.getElementById('catalogsGrid');

    // DOM Elements - Modal
    const modal = document.getElementById('productModal');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const productForm = document.getElementById('productForm');
    const modalTitle = document.getElementById('modalTitle');
    const variantsContainer = document.getElementById('variantsContainer');
    const addVariantBtn = document.getElementById('addVariantBtn');

    // DOM Elements - Categories View
    const categoriesTableBody = document.getElementById('categoriesTableBody');
    const categorySearch = document.getElementById('categorySearch');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const categoryModal = document.getElementById('categoryModal');
    const closeCategoryModalBtn = document.getElementById('closeCategoryModal');
    const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
    const categoryForm = document.getElementById('categoryForm');
    // Optional category elements
    const categoryIconInput = document.getElementById('categoryIcon');
    const categoryIconPreview = document.getElementById('categoryIconPreview');

    // DOM Elements - Promotions View
    const promotionsTableBody = document.getElementById('promotionsTableBody');
    const promotionSearch = document.getElementById('promotionSearch');
    const addPromotionBtn = document.getElementById('addPromotionBtn');
    const promotionModal = document.getElementById('promotionModal');
    const closePromotionModalBtn = document.getElementById('closePromotionModal');
    const cancelPromotionBtn = document.getElementById('cancelPromotionBtn');
    const promotionForm = document.getElementById('promotionForm');

    // Initial Render
    renderCatalogs();

    // Form Submit Handler
    // Form Submit Handler
    if (productForm) {
        // Use a flag on the element to prevent double-binding if this script re-runs
        if (productForm.dataset.listenerAttached === 'true') {
            console.log('⚠️ Listener already attached to productForm');
        } else {
            productForm.addEventListener('submit', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();

                const btn = this.querySelector('button[type="submit"]');
                if (btn && btn.disabled) return;

                if (btn) {
                    btn.disabled = true;
                    // Use innerHTML to keep styling if needed, or textContent
                    // Save original text?
                    if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;

                    btn.innerHTML = '<span class="material-icons spin" style="font-size:16px;">autorenew</span> Guardando...';

                    // Fallback to re-enable
                    setTimeout(() => {
                        if (btn.disabled) {
                            btn.disabled = false;
                            btn.textContent = btn.dataset.originalText || 'Guardar Producto';
                        }
                    }, 5000);
                }

                saveProduct();
            });
            productForm.dataset.listenerAttached = 'true';
        }
    }

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            // Update URL hash
            window.location.hash = view;
        });
    });

    // Hash change listener for browser back/forward and direct URLs
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1); // Remove #
        if (hash) {
            switchView(hash);
        }
    });

    // Load view from hash on page load
    window.addEventListener('load', () => {
        const hash = window.location.hash.substring(1);
        if (hash) {
            switchView(hash);
        } else {
            // Default view
            switchView('products');
        }
    });

    function switchView(view) {
        currentView = view;

        // Update URL hash if not already set
        if (window.location.hash.substring(1) !== view) {
            window.location.hash = view;
        }

        // Update nav
        navItems.forEach(item => {
            if (item.getAttribute('data-view') === view) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update sections
        viewSections.forEach(section => {
            section.classList.remove('active');
        });

        if (view === 'products') {
            document.getElementById('productsView').classList.add('active');
            renderProductsTable();
        } else if (view === 'catalogs') {
            document.getElementById('catalogsView').classList.add('active');
            renderCatalogs();
        } else if (view === 'categories') {
            document.getElementById('categoriesView').classList.add('active');
            renderCategoriesTable();
        } else if (view === 'colors') {
            document.getElementById('configView').classList.add('active');
            if (typeof renderColorsTable === 'function') renderColorsTable();
        } else if (view === 'config') {
            document.getElementById('configView').classList.add('active');
        }

        // Update header title and subtitle
        if (typeof window.updateHeader === 'function') {
            window.updateHeader(view);
        }
    }

    // Catalogs View Functions
    async function renderCatalogs() {
        // Delegate to new catalog system if available
        if (typeof window.loadCatalogs === 'function') {
            window.loadCatalogs();
        } else {
            console.error('Catalog system not loaded');
            catalogsGrid.innerHTML = '<p style="text-align: center; padding: 3rem; color: #d32f2f;">Error: Sistema de catálogos no cargado</p>';
        }
    }

    // Old catalog functions removed. Replaced by catalog-system.js



    // Products Database View Functions
    function renderProductsTable() {
        handleFilter();
    }

    function handleFilter() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const category = categoryFilter ? categoryFilter.value : 'all';

        // IMPROVEMENT 1: Clean and validate products before filtering
        const validProducts = products.map(p => validateAndCleanProduct(p)).filter(p => p !== null);

        filteredProducts = validProducts.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                (product.sku && product.sku.toLowerCase().includes(searchTerm));
            const matchesCategory = category === 'all' || product.category === category;
            return matchesSearch && matchesCategory;
        });

        renderTable();
    }

    // IMPROVEMENT 4: Optimize product rendering for appending data
    function renderTable() {
        if (!tableBody) return;

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();

        if (filteredProducts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="19" style="text-align:center; padding: 2rem;">No se encontraron productos</td></tr>';
            return;
        }

        filteredProducts.forEach(product => {
            const tr = createProductRow(product);
            fragment.appendChild(tr);
        });

        // Clear and append all at once for better performance
        tableBody.innerHTML = '';
        tableBody.appendChild(fragment);
    }

    // Helper function to create a product row (New Flat Structure)
    function createProductRow(product) {
        const tr = document.createElement('tr');

        // 1. Analyze Variants
        const variants = product.variants || [];
        const hasVariants = variants.length > 0;

        // 2. Image (First available)
        const imageSrc = hasVariants && variants[0].image ? variants[0].image : '';
        const imgHtml = imageSrc
            ? `<img src="${imageSrc}" class="product-mini-img" style="width:40px;height:40px;object-fit:contain;">`
            : `<div style="width:40px;height:40px;background:#eee;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">No IMG</div>`;

        // 3. Price Range
        let priceDisplay = '-';
        if (hasVariants) {
            const prices = variants.map(v => Number(v.price)).filter(p => p > 0);
            if (prices.length > 0) {
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                priceDisplay = min === max ? `Bs ${min}` : `Bs ${min} - ${max}`;
            }
        }

        // 4. Stock Badge
        const inStock = hasVariants && variants.some(v => v.active);
        const stockHtml = inStock
            ? '<span style="background:#d4edda; color:#155724; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:600;">En Stock</span>'
            : '<span style="background:#f8d7da; color:#721c24; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:600;">Agotado</span>';

        // 5. SKU Display
        const skuDisplay = hasVariants ? (variants.length > 1 ? `${variants[0].sku} <small style="color:#777;">(+${variants.length - 1})</small>` : variants[0].sku) : '-';

        tr.innerHTML = `
            <td style="width:40px; text-align:center;">
                <input type="checkbox" class="product-checkbox" data-product-id="${product.id}" 
                       style="width:18px; height:18px; cursor:pointer;">
            </td>
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    ${imgHtml}
                    <div>
                        <div style="font-weight:600; color:#333;">${product.name}</div>
                        <div style="font-size:0.75rem; color:#888;">ID: ${product.id}</div>
                    </div>
                </div>
            </td>
            <td>${product.category || '-'}</td>
            <td style="font-family:monospace;">${skuDisplay}</td>
            <td style="font-weight:600;">${priceDisplay}</td>
            <td>${stockHtml}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editProduct('${product.id}')" title="Editar"><span class="material-icons">edit</span></button>
                    <button class="btn-icon delete" onclick="deleteProduct('${product.id}')" title="Eliminar"><span class="material-icons">delete</span></button>
                </div>
            </td>
        `;

        return tr;
    }

    // Helper function to render variant cells with placeholders
    function renderVariantCells(variants, maxVariants) {
        let variantCells = '';

        for (let i = 0; i < maxVariants; i++) {
            if (i < variants.length && variants[i].color) {
                const v = variants[i];
                // IMPROVEMENT 2: Get hex from variables first, fallback to variant hex
                const colorData = colorVariables && colorVariables[v.color];
                const hexColor = (colorData && (colorData.hex || colorData)) || v.hex || '';
                const colorPreview = hexColor ? `<div style="display:inline-block; width:20px; height:20px; background:${hexColor}; border:1px solid #ddd; border-radius:4px; vertical-align:middle; margin-right:6px;"></div>` : '';

                variantCells += `
                    <td style="font-size:0.75rem; color:#666;">${v.sku || '-'}</td>
                    <td style="font-size:0.85rem;">${colorPreview}${v.color || '-'}</td>
                `;
            } else {
                // IMPROVEMENT 3: Show placeholder for missing variants
                variantCells += '<td style="color:#ccc;">-</td><td style="color:#ccc;">-</td>';
            }
        }

        return variantCells;
    }

    // Helper function to get storage display
    function getStorageDisplay(product) {
        if (!product.storage) return '-';

        if (Array.isArray(product.storage)) {
            return product.storage.join(', ');
        }

        return product.storage;
    }

    // Event Listeners - Products View
    if (searchInput) searchInput.addEventListener('input', handleFilter);
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilter);
    if (addProductBtn) addProductBtn.addEventListener('click', () => openModal());

    // Bulk Selection and Deletion
    const selectAllCheckbox = document.getElementById('selectAllProducts');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const selectedCountSpan = document.getElementById('selectedCount');

    // Select/Deselect all products
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function () {
            const checkboxes = document.querySelectorAll('.product-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
            updateBulkDeleteButton();
        });
    }

    // Update bulk delete button visibility and count
    function updateBulkDeleteButton() {
        const checkedBoxes = document.querySelectorAll('.product-checkbox:checked');
        const count = checkedBoxes.length;

        if (selectedCountSpan) selectedCountSpan.textContent = count;

        if (bulkDeleteBtn) {
            if (count > 0) {
                bulkDeleteBtn.style.display = 'flex';
                bulkDeleteBtn.style.alignItems = 'center';
                bulkDeleteBtn.style.gap = '6px';
            } else {
                bulkDeleteBtn.style.display = 'none';
            }
        }

        // Update select all checkbox state
        if (selectAllCheckbox) {
            const allCheckboxes = document.querySelectorAll('.product-checkbox');
            const allChecked = allCheckboxes.length > 0 && checkedBoxes.length === allCheckboxes.length;
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allCheckboxes.length;
        }
    }

    // Listen for checkbox changes on product rows (delegated event)
    if (tableBody) {
        tableBody.addEventListener('change', function (e) {
            if (e.target.classList.contains('product-checkbox')) {
                updateBulkDeleteButton();
            }
        });
    }

    // Bulk delete function
    window.bulkDeleteProducts = function () {
        const checkedBoxes = document.querySelectorAll('.product-checkbox:checked');
        const idsToDelete = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-product-id'));

        if (idsToDelete.length === 0) return;

        const confirmMsg = `¿Estás seguro de que deseas eliminar ${idsToDelete.length} producto(s)?`;
        if (!confirm(confirmMsg)) return;

        // Delete products
        idsToDelete.forEach(id => {
            const index = products.findIndex(p => p.id == id);
            if (index !== -1) {
                products.splice(index, 1);
            }
        });

        // Update UI
        handleFilter();
        renderCatalogs();
        autoSave();
        updateBulkDeleteButton();

        // Persist to server
        fetch('/api/save-products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(products)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log(`✅ ${idsToDelete.length} productos eliminados del servidor`);
                }
            })
            .catch(err => console.error('❌ Error eliminando del servidor:', err));
    }

    // Modal & CRUD Operations
    // Modal & CRUD Operations (Updated)

    // Helper: Reset Product Modal
    window.resetProductModal = function () {
        // Clear new containers
        const colorsContainer = document.getElementById('colorsContainer');
        const priceVariantsContainer = document.getElementById('priceVariantsContainer');
        if (colorsContainer) colorsContainer.innerHTML = '';
        if (priceVariantsContainer) priceVariantsContainer.innerHTML = '';

        // Populate category dropdown dynamically
        const categorySelect = document.getElementById('prodCategory');
        if (categorySelect) {
            categorySelect.innerHTML = ''; // Clear existing options

            // Add categories from the categories object
            if (typeof categories !== 'undefined') {
                Object.keys(categories).forEach(catKey => {
                    const catInfo = categories[catKey];
                    const option = document.createElement('option');
                    option.value = catKey;
                    option.textContent = catInfo.name;
                    categorySelect.appendChild(option);
                });
            }
        }

        modalTitle.textContent = 'Nuevo Producto';
        document.getElementById('editProductId').value = '';
        if (productForm) productForm.reset();

        // Clear base pricing
        document.getElementById('prodBasePrice').value = '';
        document.getElementById('prodBasePromo').value = '';
        document.getElementById('prodBaseLink').value = '';

        // Add initial empty rows
        addColorRow();
        addPriceVariantRow();
    }

    // Helper: Populate Product Modal
    window.populateProductModal = function (product) {
        modalTitle.textContent = 'Editar Producto';
        document.getElementById('editProductId').value = product.id;
        document.getElementById('prodName').value = product.name;
        document.getElementById('prodCategory').value = product.category;
        document.getElementById('prodBadge').value = product.badge || '';

        // Load base pricing
        document.getElementById('prodBasePrice').value = product.basePrice || 0;
        document.getElementById('prodBasePromo').value = product.basePromo || 0;
        document.getElementById('prodBaseLink').value = product.baseLink || '';

        // Clear rows added by reset (we want to fill with product data)
        const colorsContainer = document.getElementById('colorsContainer');
        const priceVariantsContainer = document.getElementById('priceVariantsContainer');
        if (colorsContainer) colorsContainer.innerHTML = '';
        if (priceVariantsContainer) priceVariantsContainer.innerHTML = '';

        // Load colors from new structure
        if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
            product.colors.forEach(colorData => {
                addColorRow(colorData);
            });
        } else if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
            // Migration: Convert old variant structure to new color structure
            const colorMap = new Map();
            product.variants.forEach(v => {
                if (v.color && !colorMap.has(v.color)) {
                    colorMap.set(v.color, {
                        colorId: v.colorId,
                        sku: v.sku,
                        images: v.images || (v.image ? [v.image] : [])
                    });
                }
            });
            colorMap.forEach(colorData => addColorRow(colorData));
        }

        // Load price variants from new structure
        if (product.priceVariants && Array.isArray(product.priceVariants) && product.priceVariants.length > 0) {
            product.priceVariants.forEach(variantData => {
                addPriceVariantRow(variantData);
            });
        } else if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
            // Migration: Convert old variant structure to new price variant structure
            const priceMap = new Map();
            product.variants.forEach(v => {
                if (v.variableText && !priceMap.has(v.variableText)) {
                    priceMap.set(v.variableText, {
                        variableId: v.variableId,
                        price: v.price,
                        promoPrice: v.promoPrice,
                        link: v.link,
                        active: v.active !== false
                    });
                }
            });
            priceMap.forEach(variantData => addPriceVariantRow(variantData));
        }
    }

    // Helper: Get Product Data From Form
    window.getProductDataFromForm = function () {
        const idStr = document.getElementById('editProductId').value;
        const name = document.getElementById('prodName').value;
        const category = document.getElementById('prodCategory').value;
        const badge = document.getElementById('prodBadge').value;
        const basePriceInput = document.getElementById('prodBasePrice').value;
        const basePromoInput = document.getElementById('prodBasePromo').value;
        const baseLinkInput = document.getElementById('prodBaseLink').value;

        // 1. Gather Colors (From Section 2)
        const colors = [];
        document.querySelectorAll('#colorsContainer .variant-card').forEach((card, index) => {
            const select = card.querySelector('.color-select');
            if (!select || !select.value) return;

            const colorId = select.value;
            const sku = card.querySelector('.color-sku') ? card.querySelector('.color-sku').value.trim() : '';

            // Get Images
            const images = [];
            card.querySelectorAll('.color-image-input').forEach(input => {
                if (input.value.trim()) images.push(input.value.trim());
            });

            // Resolve Name/Hex
            let colorName = '';
            let hex = '';
            if (window.colorVariables) {
                for (const [cName, cData] of Object.entries(window.colorVariables)) {
                    if (cData.id === colorId) {
                        colorName = cName;
                        hex = cData.hex;
                        break;
                    }
                }
            }

            colors.push({
                id: colorId,
                colorId: colorId,
                name: colorName,
                hex: hex,
                sku: sku,
                images: images,
                image: images[0] || ''
            });
        });

        // 2. Gather Price Variants (From Section 3)
        const priceVariants = [];
        document.querySelectorAll('#priceVariantsContainer .variant-card').forEach(card => {
            const select = card.querySelector('.price-variable-select');
            const variableId = select ? select.value : '';
            const variableText = (select && select.selectedIndex >= 0) ? select.options[select.selectedIndex].text : '';

            const price = Number(card.querySelector('.price-price').value) || 0;
            const promoPrice = Number(card.querySelector('.price-promo').value) || 0;
            const active = card.querySelector('.price-active') ? card.querySelector('.price-active').checked : true;

            priceVariants.push({
                variableId: variableId,
                variableText: variableText,
                price: price,
                promoPrice: promoPrice,
                active: active
            });
        });

        // 3. Generate Unified Variants (Cartesian Product for compatibility)
        let variants = [];
        if (colors.length > 0 && priceVariants.length > 0) {
            colors.forEach(c => {
                priceVariants.forEach(p => {
                    variants.push({
                        id: `${c.id}_${p.variableId}`,
                        color: c.name,
                        colorId: c.id,
                        hex: c.hex,
                        images: c.images,
                        image: c.image,
                        sku: c.sku,
                        price: p.price,
                        promoPrice: p.promoPrice,
                        active: p.active,
                        variableId: p.variableId,
                        variableText: p.variableText,
                        type: 'combination'
                    });
                });
            });
        } else if (colors.length > 0) {
            colors.forEach(c => {
                variants.push({
                    color: c.name,
                    colorId: c.id,
                    hex: c.hex,
                    images: c.images,
                    image: c.image,
                    sku: c.sku,
                    price: Number(basePriceInput) || 0,
                    promoPrice: Number(basePromoInput) || 0,
                    link: baseLinkInput,
                    active: true
                });
            });
        } else if (priceVariants.length > 0) {
            priceVariants.forEach(p => {
                variants.push({
                    price: p.price,
                    promoPrice: p.promoPrice,
                    link: p.link,
                    active: p.active,
                    variableId: p.variableId,
                    variableText: p.variableText,
                    color: '',
                    images: [],
                    image: ''
                });
            });
        } else {
            variants.push({
                sku: '',
                price: Number(basePriceInput) || 0,
                promoPrice: Number(basePromoInput) || 0,
                link: baseLinkInput,
                active: true
            });
        }

        return {
            id: idStr ? Number(idStr) : null, // Let caller handle ID generation if null
            name: name,
            category: category,
            badge: badge,
            colors: colors,
            priceVariants: priceVariants,
            variants: variants,
            basePrice: Number(basePriceInput) || 0,
            basePromo: Number(basePromoInput) || 0,
            baseLink: baseLinkInput,
            price: (priceVariants.length > 0) ? priceVariants[0].price : (Number(basePriceInput) || 0),
            image: (colors.length > 0) ? colors[0].image : ''
        };
    }

    window.openModal = function (productId = null) {
        modal.classList.add('active');

        // Reset modal to default state
        resetProductModal();

        if (productId) {
            const product = products.find(p => p.id == productId);
            if (!product) return;
            populateProductModal(product);
        }
    }

    function closeModal() {
        modal.classList.remove('active');
    }

    window.editProduct = function (id) {
        openModal(id);
    }

    window.deleteProduct = function (id) {
        console.log('Attempting to delete product ID:', id);

        if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

        // Find index (handle string vs number type mismatch)
        const index = window.products.findIndex(p => p.id == id);

        if (index > -1) {
            // Remove from array
            window.products.splice(index, 1);
            console.log('Product removed. Remaining count:', window.products.length);

            // Update UI immediately
            handleFilter();
            renderCatalogs();
            autoSave();

            // Persist to server
            fetch('/api/save-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.products)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('✅ Producto eliminado y guardado en el servidor');
                    } else {
                        console.error('SERVER ERROR:', data.message);
                        alert('Error al guardar cambios en el servidor.');
                    }
                })
                .catch(err => {
                    console.error('NETWORK ERROR:', err);
                    alert('Error de conexión al guardar cambios.');
                });
        } else {
            console.error('Product not found for deletion. ID:', id);
            alert('Error: No se encontró el producto para eliminar.');
        }
    }



    // === NEW STRUCTURE: Separate Colors and Price Variants ===

    // Default placeholder image (SVG as data URL - no network request)

    // Function to add a color row (visual only, no pricing)
    window.addColorRow = function (data = {}) {
        console.log('🎨 addColorRow called with data:', data);

        const container = document.getElementById('colorsContainer');
        const card = document.createElement('div');
        card.className = 'variant-card';
        const uniqueCardId = 'color-' + Date.now() + Math.random().toString(36).substr(2, 5);
        card.id = uniqueCardId;

        // Color Options
        let colorOptions = '<option value="">Seleccionar Color...</option>';
        let defaultColorId = data.colorId || data.id || '';

        console.log('🔍 Looking for color with ID:', defaultColorId);
        console.log('📚 Available colorVariables:', window.colorVariables ? Object.keys(window.colorVariables).length + ' colors' : 'undefined');

        // Don't force any default color - let user choose

        if (typeof colorVariables !== 'undefined') {
            const sortedColors = Object.entries(colorVariables).map(([name, val]) => ({
                name: name,
                id: val.id,
                hex: val.hex
            })).sort((a, b) => a.name.localeCompare(b.name));

            sortedColors.forEach(c => {
                const selected = defaultColorId === c.id ? 'selected' : '';
                if (selected) {
                    console.log('✅ Found matching color:', c.name, 'with ID:', c.id);
                }
                colorOptions += `<option value="${c.id}" ${selected}>${c.name}</option>`;
            });

            if (defaultColorId && !sortedColors.find(c => c.id === defaultColorId)) {
                console.warn('⚠️ Color ID not found in colorVariables:', defaultColorId);
            }
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:2px solid #e3f2fd; padding-bottom:10px;">
                <div>
                    <h4 style="margin:0; color:#1976d2; font-size: 1rem; font-weight: 600;">Color #${container.children.length + 1}</h4>
                    <p style="margin:4px 0 0 0; font-size:0.75rem; color:#666;">Define el color y sus imágenes (no afecta el precio)</p>
                </div>
                <button type="button" onclick="this.closest('.variant-card').remove()" 
                        style="color:#d32f2f; background:none; border:none; cursor:pointer; font-weight:600; font-size:0.85rem; padding:4px 8px; border-radius:4px; transition:background 0.2s;"
                        onmouseover="this.style.background='#ffebee'" onmouseout="this.style.background='none'">
                    <span class="material-icons" style="font-size:18px; vertical-align:middle;">delete</span> Eliminar
                </button>
            </div>
            
            <div style="background:#f8f9fa; padding:12px; border-radius:8px; margin-bottom:15px;">
                <div style="display:grid; grid-template-columns: 1fr 2fr; gap:12px;">
                    <!-- Color Selection -->
                    <div>
                        <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">
                            Color <span style="color:#d32f2f;">*</span>
                        </label>
                        <div style="display:flex; gap:8px;">
                            <div class="color-preview" style="width:38px; height:38px; border-radius:6px; background:#f0f0f0; border:1px solid #ddd; flex-shrink:0;"></div>
                            <select class="form-select color-select" onchange="updateColorPreview(this)" style="flex-grow:1;">
                                ${colorOptions}
                            </select>
                        </div>
                    </div>

                    <!-- SKU -->
                    <div>
                        <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">
                            SKU <span style="color:#d32f2f;">*</span>
                        </label>
                        <input type="text" class="form-input color-sku" placeholder="SM-A566EZKC" value="${data.sku || ''}" 
                               style="font-family:monospace; font-size:0.85rem;">
                    </div>
                </div>
            </div>

            <!-- Images Section -->
            <div>
                <label class="form-label" style="font-size:0.8rem; margin-bottom:8px; font-weight:600;">
                    Imágenes del Producto (Carrusel 4s)
                </label>
                <div class="color-images-list" style="display:flex; flex-direction:column; gap:8px;">
                    ${data.images && data.images.length > 0 ? data.images.map(img => `
                        <div style="display:flex; gap:8px; align-items:center;">
                            <input type="text" class="form-input color-image-input" placeholder="https://..." value="${img}" style="flex-grow:1; font-size:0.8rem;">
                            <div style="width:40px; height:40px; border-radius:4px; overflow:hidden; border:1px solid #ddd; flex-shrink:0;">
                                <img src="${img}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">
                            </div>
                            <button type="button" onclick="this.closest('div').remove()" style="color:#d32f2f; background:none; border:none; cursor:pointer; padding:4px;">
                                <span class="material-icons" style="font-size:20px;">close</span>
                            </button>
                        </div>
                    `).join('') : ''}
                </div>
                <button type="button" onclick="addColorImageRow(this)" 
                        style="margin-top:8px; padding:6px 12px; background:#f5f5f5; border:1px solid #ddd; border-radius:4px; cursor:pointer; font-size:0.8rem; color:#666;">
                    <span class="material-icons" style="font-size:16px; vertical-align:middle;">add_photo_alternate</span>
                    Agregar otra imagen
                </button>
            </div>
        `;

        container.appendChild(card);

        // Update color preview if color is selected (including default)
        // Do this AFTER appending to DOM so the select element exists
        // Use setTimeout to ensure the element is fully rendered
        if (defaultColorId) {
            setTimeout(() => {
                const selectElement = card.querySelector('.color-select');
                if (selectElement) {
                    console.log('🎨 Updating color preview for:', defaultColorId);
                    updateColorPreview(selectElement);
                }
            }, 10);
        }
    }

    // Function to update color preview box
    window.updateColorPreview = function (select) {
        console.log('🔍 updateColorPreview called');

        const card = select.closest('.variant-card');
        const preview = card ? card.querySelector('.color-preview') : null;
        const colorId = select.value;

        console.log('  - Card found:', !!card);
        console.log('  - Preview element found:', !!preview);
        console.log('  - Color ID:', colorId);
        console.log('  - colorVariables exists:', !!window.colorVariables);

        if (colorId && colorVariables) {
            let colorHex = '#f0f0f0';
            let found = false;
            for (const [name, data] of Object.entries(colorVariables)) {
                if (data.id === colorId) {
                    colorHex = data.hex || '#f0f0f0';
                    found = true;
                    console.log('  ✅ Color found:', name, 'hex:', colorHex);
                    break;
                }
            }
            if (!found) {
                console.warn('  ⚠️ Color ID not found in colorVariables:', colorId);
            }
            if (preview) {
                preview.style.backgroundColor = colorHex;
                console.log('  ✅ Preview updated to:', colorHex);
            }
        } else {
            if (preview) {
                preview.style.backgroundColor = '#f0f0f0';
                console.log('  ⚠️ No color selected, using default gray');
            }
        }
    }

    // Function to add image row to color
    window.addColorImageRow = function (button) {
        const imagesList = button.previousElementSibling;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; gap:8px; align-items:center;';
        div.innerHTML = `
            <input type="text" class="form-input color-image-input" placeholder="https://..." style="flex-grow:1; font-size:0.8rem;">
            <div style="width:40px; height:40px; border-radius:4px; overflow:hidden; border:1px solid #ddd; flex-shrink:0; background:#f5f5f5;"></div>
            <button type="button" onclick="this.closest('div').remove()" style="color:#d32f2f; background:none; border:none; cursor:pointer; padding:4px;">
                <span class="material-icons" style="font-size:20px;">close</span>
            </button>
        `;
        imagesList.appendChild(div);
    }

    // Function to add a price variant row (pricing only, no color)
    window.addPriceVariantRow = function (data = {}) {
        const container = document.getElementById('priceVariantsContainer');
        const card = document.createElement('div');
        card.className = 'variant-card';
        const uniqueCardId = 'price-' + Date.now() + Math.random().toString(36).substr(2, 5);
        card.id = uniqueCardId;

        // Variable Options
        let variableOptions = '<option value="">Seleccionar Especificación...</option>';
        if (typeof textVariables !== 'undefined') {
            Object.values(textVariables).forEach(v => {
                const selected = data.variableId === v.id ? 'selected' : '';
                variableOptions += `<option value="${v.id}" ${selected}>${v.name}: ${v.text}</option>`;
            });
        }

        const isActive = data.active !== false;
        const activeChecked = isActive ? 'checked' : '';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:2px solid #fff3e0; padding-bottom:10px;">
                <div>
                    <h4 style="margin:0; color:#ff9800; font-size: 1rem; font-weight: 600;">Variante de Precio #${container.children.length + 1}</h4>
                    <p style="margin:4px 0 0 0; font-size:0.75rem; color:#666;">Define una especificación con su precio (aplica a todos los colores)</p>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <label style="font-size:0.85rem; display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none;">
                        <input type="checkbox" class="price-active" ${activeChecked} style="width:18px; height:18px;">
                        <span style="font-weight:600; color:${isActive ? '#2e7d32' : '#999'}">Activo</span>
                    </label>
                    <button type="button" onclick="this.closest('.variant-card').remove()" 
                            style="color:#d32f2f; background:none; border:none; cursor:pointer; font-weight:600; font-size:0.85rem; padding:4px 8px; border-radius:4px; transition:background 0.2s;"
                            onmouseover="this.style.background='#ffebee'" onmouseout="this.style.background='none'">
                        <span class="material-icons" style="font-size:18px; vertical-align:middle;">delete</span> Eliminar
                    </button>
                </div>
            </div>
            
            <div style="background:#fff3e0; padding:12px; border-radius:8px; margin-bottom:15px;">
                <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">
                    Especificación <span style="color:#d32f2f;">*</span>
                    <span style="color:#999; font-weight:400; font-size:0.7rem;">(ej: tamaño, capacidad)</span>
                </label>
                <select class="form-select price-variable-select" style="height:38px;">
                    ${variableOptions}
                </select>
            </div>

            <div style="background:#fff; border:1px solid #e0e0e0; padding:12px; border-radius:8px; margin-bottom:15px;">
                <p style="margin:0 0 10px 0; font-size:0.8rem; color:#555; font-weight:600;">
                    <span class="material-icons" style="font-size:16px; vertical-align:middle; color:#ff9800;">payments</span>
                    Información de precio:
                </p>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                    <!-- Price -->
                    <div>
                        <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">
                            Precio (Bs) <span style="color:#d32f2f;">*</span>
                        </label>
                        <input type="number" class="form-input price-price" placeholder="0" value="${data.price || ''}" 
                               style="font-weight:600; color:#2e7d32;">
                    </div>

                    <!-- Promo Price -->
                    <div>
                        <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                            Precio Oferta (Bs)
                            <span style="color:#999; font-weight:400; font-size:0.7rem;">(opcional)</span>
                        </label>
                        <input type="number" class="form-input price-promo" placeholder="0" value="${data.promoPrice || ''}"
                               style="color:#d32f2f;">
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    }

    // --- OLD: Refined Variant Logic (Keep for backward compatibility during migration) ---
    window.addRefinedVariantRow = function (data = {}) {
        const container = document.getElementById('variantsContainer');
        const card = document.createElement('div');
        card.className = 'variant-card';
        // Unique ID
        const uniqueCardId = 'var-' + Date.now() + Math.random().toString(36).substr(2, 5);
        card.id = uniqueCardId;

        // 1. Color Options
        let colorOptions = '<option value="">Seleccionar Color...</option>';
        if (typeof colorVariables !== 'undefined') {
            const sortedColors = Object.entries(colorVariables).map(([name, val]) => ({
                name: name,
                id: val.id,
                hex: val.hex
            })).sort((a, b) => a.name.localeCompare(b.name));

            sortedColors.forEach(c => {
                const selected = data.colorId === c.id ? 'selected' : '';
                colorOptions += `<option value="${c.id}" ${selected}>${c.name}</option>`;
            });
        }

        // 2. Variable Options
        let variableOptions = '<option value="">Seleccionar Variable...</option>';
        if (typeof textVariables !== 'undefined') {
            Object.values(textVariables).forEach(v => {
                const selected = data.variableId === v.id ? 'selected' : '';
                variableOptions += `<option value="${v.id}" ${selected}>${v.name}: ${v.text}</option>`;
            });
        }

        const isActive = data.active !== false;
        const activeChecked = isActive ? 'checked' : '';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:2px solid #e3f2fd; padding-bottom:10px;">
                <div>
                    <h4 style="margin:0; color:#1976d2; font-size: 1rem; font-weight: 600;">Variante #${container.children.length + 1}</h4>
                    <p style="margin:4px 0 0 0; font-size:0.75rem; color:#666;">Cada variante representa una opción única de compra (SKU único)</p>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <label style="font-size:0.85rem; display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none;">
                        <input type="checkbox" class="var-active" ${activeChecked} style="width:18px; height:18px;">
                        <span style="font-weight:600; color:${isActive ? '#2e7d32' : '#999'}">Activo</span>
                    </label>
                    <button type="button" onclick="this.closest('.variant-card').remove()" 
                            style="color:#d32f2f; background:none; border:none; cursor:pointer; font-weight:600; font-size:0.85rem; padding:4px 8px; border-radius:4px; transition:background 0.2s;"
                            onmouseover="this.style.background='#ffebee'" onmouseout="this.style.background='none'">
                        <span class="material-icons" style="font-size:18px; vertical-align:middle;">delete</span> Eliminar
                    </button>
                </div>
            </div>
            
            <!-- Identificadores de Variante -->
            <div style="background:#f8f9fa; padding:12px; border-radius:8px; margin-bottom:15px;">
                <p style="margin:0 0 10px 0; font-size:0.8rem; color:#555; font-weight:600;">
                    <span class="material-icons" style="font-size:16px; vertical-align:middle; color:#1976d2;">info</span>
                    Define qué hace única a esta variante:
                </p>
                <div class="form-grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <!-- Color -->
                    <div>
                        <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                            Color 
                            <span style="color:#999; font-weight:400; font-size:0.7rem;">(opcional)</span>
                        </label>
                        <div style="display:flex; gap:8px;">
                            <div class="var-color-preview" style="width:38px; height:38px; border-radius:6px; background:#f0f0f0; border:1px solid #ddd; flex-shrink:0;"></div>
                            <select class="form-select var-color-select" onchange="updateVariantPreview(this)" style="flex-grow:1;">
                                ${colorOptions}
                            </select>
                        </div>
                    </div>

                    <!-- Variable -->
                    <div>
                        <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                            Especificación
                            <span style="color:#999; font-weight:400; font-size:0.7rem;">(opcional - ej: tamaño, RAM)</span>
                        </label>
                        <select class="form-select var-variable-select" style="height:38px;">
                            ${variableOptions}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Información de Producto -->
            <div style="background:#fff; border:1px solid #e0e0e0; padding:12px; border-radius:8px; margin-bottom:15px;">
                <p style="margin:0 0 10px 0; font-size:0.8rem; color:#555; font-weight:600;">
                    <span class="material-icons" style="font-size:16px; vertical-align:middle; color:#ff9800;">inventory_2</span>
                    Información del producto:
                </p>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
                     <!-- SKU -->
                    <div>
                        <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">
                            SKU <span style="color:#d32f2f;">*</span>
                        </label>
                        <input type="text" class="form-input var-sku" placeholder="SM-A566EZKC" value="${data.sku || ''}" 
                               style="font-family:monospace; font-size:0.85rem;">
                    </div>

                    <!-- Price -->
                    <div>
                        <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">
                            Precio (Bs) <span style="color:#d32f2f;">*</span>
                        </label>
                        <input type="number" class="form-input var-price" placeholder="0" value="${data.price || ''}" 
                               style="font-weight:600; color:#2e7d32;">
                    </div>

                    <!-- Promo Price -->
                    <div>
                        <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                            Precio Oferta (Bs)
                            <span style="color:#999; font-weight:400; font-size:0.7rem;">(opcional)</span>
                        </label>
                        <input type="number" class="form-input var-promo" placeholder="0" value="${data.promoPrice || ''}"
                               style="color:#d32f2f;">
                    </div>
                </div>
            </div>

            <!-- Enlaces y Extras -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">
                 <!-- Link -->
                <div>
                    <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">
                        Link E-Store <span style="color:#d32f2f;">*</span>
                    </label>
                    <input type="url" class="form-input var-link" placeholder="https://samsung.com/..." value="${data.link || ''}"
                           style="font-size:0.8rem;">
                </div>
                 <!-- Badge -->
                <div>
                    <label class="form-label" style="font-size:0.75rem; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                        Badge Promocional
                        <span style="color:#999; font-weight:400; font-size:0.7rem;">(opcional)</span>
                    </label>
                    <input type="text" class="form-input var-badge" placeholder="Ej: Envío Gratis" value="${data.badge || ''}">
                </div>
            </div>

            <div>
                <label class="form-label" style="font-size:0.75rem; margin-bottom:4px;">ImÃ¡genes del Producto (Carrusel 4s)</label>
                <div class="var-images-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                <button type="button" class="btn-secondary" style="margin-top:8px; font-size:0.75rem; padding:4px 10px;" onclick="addVariantImageRow(this)">+ Agregar otra imagen</button>
            </div>
        `;

        container.appendChild(card);
        updateVariantPreview(card.querySelector('.var-color-select'));

        // Init Images
        const imgList = (data.images && data.images.length > 0) ? data.images : (data.image ? [data.image] : ['']);
        const listContainer = card.querySelector('.var-images-list');
        if (window.addVariantImageRow) {
            imgList.forEach(url => window.addVariantImageRow(listContainer, url));
        }
    }

    // Helpers
    window.updateVariantPreview = function (select) {
        const card = select.closest('.variant-card');
        const preview = card.querySelector('.var-color-preview');
        const colorId = select.value;

        if (colorId && colorVariables) {
            // Find color by ID (colorVariables is keyed by name, but values have id property)
            let colorHex = '#f0f0f0';
            for (const [name, data] of Object.entries(colorVariables)) {
                if (data.id === colorId) {
                    colorHex = data.hex || '#f0f0f0';
                    break;
                }
            }
            preview.style.background = colorHex;
        } else {
            preview.style.background = '#f0f0f0';
        }
    }

    window.addVariantImageRow = function (element, value = '') {
        let container;
        if (element.classList && element.classList.contains('var-images-list')) {
            container = element;
        } else {
            container = element.previousElementSibling;
        }

        const div = document.createElement('div');
        div.style.cssText = "display:flex; gap:10px; align-items:center; margin-bottom:5px;";
        div.innerHTML = `
            <div style="flex-grow:1; display:flex; gap:8px;">
                <input type="text" class="form-input var-image-input" placeholder="https://..." value="${value}" oninput="updateImageRowPreview(this)" style="flex-grow:1;">
                <img class="var-row-preview" src="${value}" style="width:38px; height:38px; object-fit:contain; border:1px solid #ddd; background:#fff; border-radius:4px; display:${value ? 'block' : 'none'};">
            </div>
            <button type="button" onclick="this.parentElement.remove()" style="width:30px; height:38px; display:flex; align-items:center; justify-content:center; border:1px solid #ddd; background:#f8f9fa; border-radius:4px; cursor:pointer; color:#666;" title="Eliminar Imagen">âœ•</button>
        `;
        container.appendChild(div);
    }

    window.updateImageRowPreview = function (input) {
        const img = input.nextElementSibling;
        if (input.value) {
            img.src = input.value;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
    }

    function saveProduct() {
        try {
            const idStr = document.getElementById('editProductId').value;
            const name = document.getElementById('prodName').value;
            const category = document.getElementById('prodCategory').value;
            const badge = document.getElementById('prodBadge').value;
            const basePriceInput = document.getElementById('prodBasePrice').value;
            const basePromoInput = document.getElementById('prodBasePromo').value;
            const baseLinkInput = document.getElementById('prodBaseLink').value;

            // 1. Gather Colors (From Section 2)
            // ----------------------------------------------------------------
            const colors = [];
            console.log('🎨 Starting to gather colors...');
            document.querySelectorAll('#colorsContainer .variant-card').forEach((card, index) => {
                const select = card.querySelector('.color-select');
                console.log(`Color card ${index + 1}:`, {
                    hasSelect: !!select,
                    selectValue: select ? select.value : 'NO SELECT',
                    selectedIndex: select ? select.selectedIndex : 'NO SELECT',
                    selectedText: select && select.selectedIndex >= 0 ? select.options[select.selectedIndex].text : 'NO TEXT'
                });

                if (!select || !select.value) {
                    console.warn(`⚠️ Skipping color card ${index + 1} - no color selected`);
                    return;
                }

                const colorId = select.value;
                const sku = card.querySelector('.color-sku') ? card.querySelector('.color-sku').value.trim() : '';

                // Get Images
                const images = [];
                card.querySelectorAll('.color-image-input').forEach(input => {
                    if (input.value.trim()) images.push(input.value.trim());
                });

                // Resolve Name/Hex
                let colorName = '';
                let hex = '';
                if (window.colorVariables && select.selectedIndex >= 0) {
                    // Check if option text matches key or if we need to search by ID
                    // Ideally we used ID as value.
                    // Let's safe-search by ID
                    if (window.colorVariables) {
                        for (const [cName, cData] of Object.entries(window.colorVariables)) {
                            if (cData.id === colorId) {
                                colorName = cName;
                                hex = cData.hex;
                                break;
                            }
                        }
                    }
                }

                console.log(`✅ Color ${index + 1} resolved:`, { colorId, colorName, hex, sku, imageCount: images.length });

                colors.push({
                    id: colorId,           // For new structure
                    colorId: colorId,      // For backward compatibility
                    name: colorName,
                    hex: hex,
                    sku: sku,
                    images: images,
                    image: images[0] || ''
                });
            });

            console.log(`📦 Total colors gathered: ${colors.length}`, colors);

            // 2. Gather Price Variants (From Section 3)
            // ----------------------------------------------------------------
            const priceVariants = [];
            document.querySelectorAll('#priceVariantsContainer .variant-card').forEach(card => {
                const select = card.querySelector('.price-variable-select');
                const variableId = select ? select.value : '';
                // Get text safely
                const variableText = (select && select.selectedIndex >= 0) ? select.options[select.selectedIndex].text : '';

                const price = Number(card.querySelector('.price-price').value) || 0;
                const promoPrice = Number(card.querySelector('.price-promo').value) || 0;
                const active = card.querySelector('.price-active') ? card.querySelector('.price-active').checked : true;

                priceVariants.push({
                    variableId: variableId,
                    variableText: variableText,
                    price: price,
                    promoPrice: promoPrice,
                    active: active
                });
            });

            // 3. Generate Unified Variants (Cartesian Product for compatibility)
            // ----------------------------------------------------------------
            let variants = [];

            if (colors.length > 0 && priceVariants.length > 0) {
                // Cartesian: Colors x Prices
                colors.forEach(c => {
                    priceVariants.forEach(p => {
                        variants.push({
                            // Combined IDs
                            id: `${c.id}_${p.variableId}`,

                            // Visuals (From Color)
                            color: c.name,
                            colorId: c.id,
                            hex: c.hex,
                            images: c.images,
                            image: c.image,

                            // SKU (From Color - user constraint: no SKU in price section)
                            sku: c.sku,

                            // Price & Specs (From PriceVariant)
                            price: p.price,
                            promoPrice: p.promoPrice,
                            active: p.active,
                            variableId: p.variableId,
                            variableText: p.variableText,

                            // Metadata
                            type: 'combination'
                        });
                    });
                });
            } else if (colors.length > 0) {
                // Only colors (use Base Price)
                colors.forEach(c => {
                    variants.push({
                        color: c.name,
                        colorId: c.id,
                        hex: c.hex,
                        images: c.images,
                        image: c.image,
                        sku: c.sku,
                        price: Number(basePriceInput) || 0,
                        promoPrice: Number(basePromoInput) || 0,
                        link: baseLinkInput,
                        active: true
                    });
                });
            } else if (priceVariants.length > 0) {
                // Only prices (No colors)
                priceVariants.forEach(p => {
                    variants.push({
                        price: p.price,
                        promoPrice: p.promoPrice,
                        link: p.link,
                        active: p.active,
                        variableId: p.variableId,
                        variableText: p.variableText,
                        // Defaults
                        color: '',
                        images: [],
                        image: ''
                    });
                });
            } else {
                // Base Product (No variants)
                variants.push({
                    sku: '',
                    price: Number(basePriceInput) || 0,
                    promoPrice: Number(basePromoInput) || 0,
                    link: baseLinkInput,
                    active: true
                });
            }

            // 4. Construct Final Product Object
            // ----------------------------------------------------------------
            const productData = {
                id: idStr ? Number(idStr) : generateId(),
                name: name,
                category: category,
                badge: badge,

                // New Structured Data
                colors: colors,
                priceVariants: priceVariants,

                // Generated Flat Variants (for compatibility)
                variants: variants,

                // Base Info (Legacy/Fallback)
                basePrice: Number(basePriceInput) || 0,
                basePromo: Number(basePromoInput) || 0,
                baseLink: baseLinkInput,
                price: (priceVariants.length > 0) ? priceVariants[0].price : (Number(basePriceInput) || 0),
                image: (colors.length > 0) ? colors[0].image : ''
            };

            // 5. Update Local State
            // ----------------------------------------------------------------
            if (idStr) {
                const index = products.findIndex(p => p.id === Number(idStr));
                if (index !== -1) {
                    products[index] = productData;
                } else {
                    products.push(productData);
                }
            } else {
                products.unshift(productData);
            }

            // 6. UI & Persistence
            // ----------------------------------------------------------------
            closeModal();
            handleFilter(); // Updates table
            renderCatalogs();
            autoSave();

            // Save to Server
            fetch('/api/save-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(products)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('✅ Producto guardado en el servidor');
                    } else {
                        console.error('Error guardando en el servidor:', data.message);
                    }
                })
                .catch(err => {
                    console.error('Error de red:', err);
                });

        } catch (error) {
            console.error('CRITICAL ERROR in saveProduct:', error);
            alert('Error crítico al guardar producto (Ver consola).');
        }
    }

    function generateId() {
        const maxId = products.reduce((max, p) => p.id > max ? p.id : max, 0);
        return maxId + 1;
    }

    // Event Listeners - Modal
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    // Removed: Modal no longer closes when clicking outside (only X button or Cancel)

    // Removed old addVariantBtn listener as it is now handled differently or button ID might be different
    // Check if addVariantBtn exists. 
    // In our new modal HTML, we have buttons calling onclick="addRefinedVariantRow()" directly.
    // So we don't strictly need this listener if the button has onclick attribute.
    if (addVariantBtn) {
        addVariantBtn.addEventListener('click', () => addRefinedVariantRow());
    }

    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProduct();
    });

    // Utility Functions
    function escapeCSV(text) {
        if (text === null || text === undefined) return '';
        const stringVal = String(text);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
    }

    function downloadCSV(content, fileName) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // ==================== COLOR VARIABLES MANAGEMENT ====================

    // Load color variables (fallback if file doesn't exist)
    if (typeof colorVariables === 'undefined') {
        window.colorVariables = {};
    }

    let filteredColors = [];

    // DOM Elements for Colors
    const colorsTableBody = document.getElementById('colorsTableBody');
    const colorSearch = document.getElementById('colorSearch');
    const addColorBtn = document.getElementById('addColorBtn');
    const saveVariablesBtn = document.getElementById('saveVariablesBtn');
    const colorModal = document.getElementById('colorModal');
    const closeColorModalBtn = document.getElementById('closeColorModal');
    const cancelColorBtn = document.getElementById('cancelColorBtn');
    const colorForm = document.getElementById('colorForm');
    const colorPicker = document.getElementById('colorPicker');
    const colorHexInput = document.getElementById('colorHex');
    const colorPreview = document.getElementById('colorPreview');

    // Render colors when switching to variables view
    const originalSwitchView = switchView;
    switchView = function (view) {
        originalSwitchView(view);
        if (view === 'config') {
            renderColorsTable();
        }
    }

    // Event listeners for color management
    if (colorSearch) {
        colorSearch.addEventListener('input', renderColorsTable);
    }

    if (addColorBtn) {
        addColorBtn.addEventListener('click', () => openColorModal());
    }

    if (saveVariablesBtn) {
        saveVariablesBtn.addEventListener('click', saveColorVariables);
    }

    if (closeColorModalBtn) {
        closeColorModalBtn.addEventListener('click', closeColorModal);
    }

    if (cancelColorBtn) {
        cancelColorBtn.addEventListener('click', closeColorModal);
    }

    if (colorForm) {
        colorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveColor();
        });
    }

    // Sync color picker with hex input
    if (colorPicker && colorHexInput) {
        colorPicker.addEventListener('input', (e) => {
            colorHexInput.value = e.target.value;
            updateColorPreview();
        });

        colorHexInput.addEventListener('input', (e) => {
            const hex = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                colorPicker.value = hex;
                updateColorPreview();
            }
        });
    }

    function renderColorsTable() {
        if (!colorsTableBody) return;

        const searchTerm = colorSearch ? colorSearch.value.toLowerCase() : '';

        // Convert colorVariables object to array
        filteredColors = Object.entries(colorVariables)
            .filter(([name, hex]) => name.toLowerCase().includes(searchTerm))
            .sort((a, b) => a[0].localeCompare(b[0]));

        colorsTableBody.innerHTML = '';

        if (filteredColors.length === 0) {
            colorsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No se encontraron colores</td></tr>';
            return;
        }

        filteredColors.forEach(([colorName, colorData]) => {
            // Handle both old (string) and new (object) format
            const hexCode = colorData.hex || colorData;
            const colorId = colorData.id || '';
            // Count how many products use this color
            let usageCount = 0;
            products.forEach(p => {
                if (p.variants && Array.isArray(p.variants)) {
                    p.variants.forEach(v => {
                        if (v.color === colorName) usageCount++;
                    });
                }
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: monospace; color: #999; font-size: 0.8rem;">${colorId}</td>
                <td style="font-weight: 500;">${colorName}</td>
                <td style="font-family: monospace; color: #666;">${hexCode}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 40px; height: 40px; background: ${hexCode}; border: 2px solid #ddd; border-radius: 8px;"></div>
                        <span style="font-size: 0.85rem; color: #666;">${hexCode}</span>
                    </div>
                </td>
                <td>
                    <span style="background: ${usageCount > 0 ? '#e8f5e9' : '#fce8e6'}; color: ${usageCount > 0 ? '#2e7d32' : '#d93025'}; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                        ${usageCount} producto${usageCount !== 1 ? 's' : ''}
                    </span>
                </td>
                <td>
                    <span class="action-icon" title="Editar" onclick="window.editColor('${colorName.replace(/'/g, "\\'")}')"><span class="material-icons">edit</span></span>
                    <span class="action-icon" title="Eliminar" onclick="window.deleteColor('${colorName.replace(/'/g, "\\'")}')"><span class="material-icons">delete</span></span>
                </td >
            `;
            colorsTableBody.appendChild(tr);
        });
    }

    function openColorModal(colorName = null) {
        colorModal.classList.add('active');

        if (colorName) {
            // Edit mode
            document.getElementById('colorModalTitle').textContent = 'Editar Color';
            document.getElementById('editColorOldName').value = colorName;
            document.getElementById('colorName').value = colorName;
            const colorData = colorVariables[colorName];
            const hexValue = colorData.hex || colorData;
            document.getElementById('colorHex').value = hexValue;
            document.getElementById('colorPicker').value = hexValue;
        } else {
            // Add mode
            document.getElementById('colorModalTitle').textContent = 'Nuevo Color';
            document.getElementById('editColorOldName').value = '';
            colorForm.reset();
            // Don't force black color - let user choose
            const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            document.getElementById('colorPicker').value = randomColor;
            document.getElementById('colorHex').value = randomColor;
        }

        updateColorPreview();
    }

    function closeColorModal() {
        colorModal.classList.remove('active');
    }

    function updateColorPreview() {
        const hex = document.getElementById('colorHex').value;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            colorPreview.style.background = hex;
        }
    }

    function saveColor() {
        const oldName = document.getElementById('editColorOldName').value;
        const newName = document.getElementById('colorName').value.trim();
        const hexCode = document.getElementById('colorHex').value.trim();

        if (!newName || !hexCode) {
            alert('Por favor completa todos los campos');
            return;
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(hexCode)) {
            alert('El cÃ³digo hex debe tener el formato #RRGGBB');
            return;
        }

        // If editing and name changed, update all products
        if (oldName && oldName !== newName) {
            products.forEach(p => {
                if (p.variants && Array.isArray(p.variants)) {
                    p.variants.forEach(v => {
                        if (v.color === oldName) {
                            v.color = newName;
                            v.hex = hexCode;
                        }
                    });
                }
            });
            delete colorVariables[oldName];
        }

        // Generate ID if it's a new color
        let colorId;
        if (oldName && colorVariables[oldName]) {
            colorId = colorVariables[oldName].id;
        } else {
            const existingIds = Object.values(colorVariables).map(c => c.id || '').filter(id => id.startsWith('c'));
            const maxNum = existingIds.length > 0 ? Math.max(...existingIds.map(id => parseInt(id.substring(1)) || 0)) : 0;
            colorId = `c${String(maxNum + 1).padStart(3, '0')}`;
        }

        // Update or add color with new structure
        colorVariables[newName] = { id: colorId, hex: hexCode };

        // IMPROVEMENT 2: Use refactored color update logic
        const updatedCount = updateColorInProducts(newName, hexCode);
        console.log(`Color "${newName}" saved and updated in ${updatedCount} variant(s)`);

        closeColorModal();
        renderColorsTable();
        autoSave(); // Save changes automatically
        saveColorVariables(); // Persist to file via API
    }

    window.editColor = function (colorName) {
        openColorModal(colorName);
    }

    window.deleteColor = function (colorName) {
        const colorToDelete = colorVariables[colorName];
        if (!colorToDelete) return;

        const colorIdToDelete = colorToDelete.id;

        // Find best fallback (Prefer c017 "Negro", then any black, then first available)
        let fallbackId = 'c017';
        let fallbackName = 'Negro';

        let fallbackEntry = Object.entries(colorVariables).find(([k, v]) => v.id === 'c017');

        if (!fallbackEntry) {
            fallbackEntry = Object.entries(colorVariables).find(([k, v]) => v.hex === '#000000' || k.toLowerCase().includes('negro') || k.toLowerCase().includes('black'));
        }

        if (fallbackEntry) {
            fallbackName = fallbackEntry[0];
            fallbackId = fallbackEntry[1].id;
        } else if (Object.keys(colorVariables).length > 0) {
            // Last resort: any color is better than broken link
            fallbackName = Object.keys(colorVariables)[0];
            fallbackId = colorVariables[fallbackName].id;
        }

        // Check usage (by ID or legacy Name)
        let affectedProducts = [];
        products.forEach(p => {
            if (p.variants && Array.isArray(p.variants)) {
                if (p.variants.some(v => v.colorId === colorIdToDelete || v.color === colorName)) {
                    affectedProducts.push(p);
                }
            }
        });

        if (affectedProducts.length > 0) {
            const confirmMessage = `El color "${colorName}" estÃ¡ en uso en ${affectedProducts.length} productos.\n\n` +
                `Â¿Deseas eliminarlo y reasignar estos productos al color "${fallbackName}"?`;

            if (!confirm(confirmMessage)) {
                return;
            }

            // Perform Reassignment
            affectedProducts.forEach(p => {
                p.variants.forEach(v => {
                    if (v.colorId === colorIdToDelete || v.color === colorName) {
                        v.colorId = fallbackId;
                        v.color = fallbackName;
                        if (colorVariables[fallbackName]) {
                            v.hex = colorVariables[fallbackName].hex;
                        }
                    }
                });
            });

            // Save products immediatlely
            localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
            fetch('/api/save-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(products)
            }).then(() => console.log('Productos actualizados con nuevo color'));
        }

        delete colorVariables[colorName];
        renderColorsTable();
        autoSave();
        saveColorVariables();
    }

    function saveColorVariables() {
        // Use API to save directly to Excel
        const btn = document.getElementById('saveVariablesBtn');
        const originalText = btn ? btn.innerHTML : ' Guardar Variables';
        if (btn) btn.innerHTML = 'â³ Guardando...';

        fetch('/api/save-colors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(colorVariables)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('' + data.message);
                } else {
                    alert('Error al guardar: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error de conexiÃ³n. AsegÃºrate de que el servidor estÃ© corriendo.');
            })
            .finally(() => {
                if (btn) btn.innerHTML = originalText;
            });
    }

    // ==================== CATEGORY MANAGEMENT ====================

    // DOM Elements for Categories

    // Event listeners for category management
    if (categorySearch) {
        categorySearch.addEventListener('input', renderCategoriesTable);
    }

    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => openCategoryModal());
    }

    if (closeCategoryModalBtn) {
        closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
    }

    if (cancelCategoryBtn) {
        cancelCategoryBtn.addEventListener('click', closeCategoryModal);
    }

    if (categoryForm) {
        categoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveCategory();
        });
    }

    // Update icon preview when typing
    if (categoryIconInput) {
        categoryIconInput.addEventListener('input', (e) => {
            categoryIconPreview.textContent = e.target.value || 'ðŸ“±';
        });
    }

    function renderCategoriesTable() {
        if (!categoriesTableBody) return;

        const searchTerm = categorySearch ? categorySearch.value.toLowerCase() : '';

        // Convert categories object to array
        filteredCategories = Object.entries(categories)
            .filter(([key, cat]) =>
                key.toLowerCase().includes(searchTerm) ||
                cat.name.toLowerCase().includes(searchTerm)
            )
            .sort((a, b) => a[1].name.localeCompare(b[1].name));

        categoriesTableBody.innerHTML = '';

        if (filteredCategories.length === 0) {
            categoriesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">No se encontraron categorías</td></tr>';
            return;
        }

        filteredCategories.forEach(([categoryName, catData]) => {
            const categoryId = catData.id || '';
            // Count how many products use this category
            const productCount = products.filter(p => p.category === categoryName).length;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: monospace; color: #999; font-size: 0.8rem;">${categoryId}</td>
                <td style="font-weight: 500;">${catData.name}</td>
                <td>
                    <span style="background: ${productCount > 0 ? '#e8f5e9' : '#fce8e6'}; color: ${productCount > 0 ? '#2e7d32' : '#d93025'}; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                        ${productCount} producto${productCount !== 1 ? 's' : ''}
                    </span>
                </td>
                <td>
                    <span class="action-icon" title="Editar" onclick="window.editCategory('${categoryName.replace(/'/g, "\\'")}')"><span class="material-icons">edit</span></span>
                    <span class="action-icon" title="Eliminar" onclick="window.deleteCategory('${categoryName.replace(/'/g, "\\'")}')"><span class="material-icons">delete</span></span>
                </td>
            `;
            categoriesTableBody.appendChild(tr);
        });
    }

    function openCategoryModal(categoryName = null) {
        categoryModal.classList.add('active');

        if (categoryName) {
            // Edit mode
            document.getElementById('categoryModalTitle').textContent = 'Editar categoría';
            document.getElementById('editCategoryOldName').value = categoryName;
            document.getElementById('categoryName').value = categories[categoryName].name;
        } else {
            // Add mode
            document.getElementById('categoryModalTitle').textContent = 'Nueva categoría';
            document.getElementById('editCategoryOldName').value = '';
            categoryForm.reset();
        }
    }

    function closeCategoryModal() {
        categoryModal.classList.remove('active');
    }

    function saveCategory() {
        const oldName = document.getElementById('editCategoryOldName').value;
        const newName = document.getElementById('categoryName').value.trim();

        if (!newName) {
            alert('Por favor ingresa un nombre para la categoría');
            return;
        }

        // Generate ID if it's a new category
        let categoryId;
        if (oldName && categories[oldName]) {
            categoryId = categories[oldName].id;
        } else {
            const existingIds = Object.values(categories).map(c => c.id || '').filter(id => id.startsWith('ct'));
            const maxNum = existingIds.length > 0 ? Math.max(...existingIds.map(id => parseInt(id.substring(2)) || 0)) : 0;
            categoryId = `ct${String(maxNum + 1).padStart(3, '0')}`;
        }

        // If editing and name changed, update all products
        if (oldName && oldName !== newName) {
            if (categories[newName]) {
                alert('Ya existe una categoría con ese nombre');
                return;
            }

            // Update products that use this category
            products.forEach(p => {
                if (p.category === oldName) {
                    p.category = newName;
                }
            });

            // Remove old category
            delete categories[oldName];
        }

        // Check if name already exists (for new categories)
        if (!oldName && categories[newName]) {
            alert('Ya existe una categoría con ese nombre');
            return;
        }

        // Update or add category with new structure
        categories[newName] = { id: categoryId, name: newName };

        closeCategoryModal();
        renderCategoriesTable();
        renderCatalogs(); // Update catalogs view
        saveCategories(); // Save to localStorage
    }

    window.editCategory = function (categoryKey) {
        openCategoryModal(categoryKey);
    }

    window.deleteCategory = function (categoryKey) {
        // Check if category is in use
        const productsInCategory = products.filter(p => p.category === categoryKey);

        if (productsInCategory.length > 0) {
            if (!confirm(`La categoría "${categories[categoryKey].name}" tiene ${productsInCategory.length} producto(s). Estás seguro de eliminarla? Los productos quedarÃ¡n sin categoría.`)) {
                return;
            }

            // Remove category from products
            productsInCategory.forEach(p => {
                p.category = 'accessories'; // Default to accessories
            });
        }

        delete categories[categoryKey];
        renderCategoriesTable();
        renderCatalogs(); // Update catalogs view
        saveCategories(); // Save to localStorage
    }

    // ==================== TEXT VARIABLES MANAGEMENT ====================

    const VARIABLES_STORAGE_KEY = 'samsung_catalog_text_variables';

    // Load text variables from file or localStorage
    if (typeof textVariables === 'undefined') {
        window.textVariables = {};
    }

    // DOM Elements for Variables
    const variablesTableBody = document.getElementById('variablesTableBody');
    const variableSearch = document.getElementById('variableSearch');
    const addVariableBtn = document.getElementById('addVariableBtn');
    const variableModal = document.getElementById('variableModal');
    const closeVariableModalBtn = document.getElementById('closeVariableModal');
    const cancelVariableBtn = document.getElementById('cancelVariableBtn');
    const variableForm = document.getElementById('variableForm');

    // Event listeners for variable management
    if (variableSearch) {
        variableSearch.addEventListener('input', renderVariablesTable);
    }

    if (addVariableBtn) {
        addVariableBtn.addEventListener('click', () => openVariableModal());
    }

    if (closeVariableModalBtn) {
        closeVariableModalBtn.addEventListener('click', closeVariableModal);
    }

    if (cancelVariableBtn) {
        cancelVariableBtn.addEventListener('click', closeVariableModal);
    }

    if (variableForm) {
        variableForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveVariable();
        });
    }

    function renderVariablesTable() {
        if (!variablesTableBody) return;

        const searchTerm = variableSearch ? variableSearch.value.toLowerCase() : '';

        // Convert textVariables object to array
        filteredVariables = Object.entries(textVariables)
            .filter(([text, varData]) =>
                text.toLowerCase().includes(searchTerm) ||
                varData.name.toLowerCase().includes(searchTerm)
            )
            .sort((a, b) => {
                // Sort by name first, then by text
                if (a[1].name !== b[1].name) {
                    return a[1].name.localeCompare(b[1].name);
                }
                return a[0].localeCompare(b[0]);
            });

        variablesTableBody.innerHTML = '';

        if (filteredVariables.length === 0) {
            variablesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">No se encontraron variables</td></tr>';
            return;
        }

        filteredVariables.forEach(([text, varData]) => {
            const variableId = varData.id || '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: monospace; color: #999; font-size: 0.8rem;">${variableId}</td>
                <td style="font-weight: 500;">${varData.name}</td>
                <td>${varData.text}</td>
                <td>
                    <span class="action-icon" title="Editar" onclick="window.editVariable('${text.replace(/'/g, "\\'")}')"><span class="material-icons">edit</span></span>
                    <span class="action-icon" title="Eliminar" onclick="window.deleteVariable('${text.replace(/'/g, "\\'")}')"><span class="material-icons">delete</span></span>
                </td>
            `;
            variablesTableBody.appendChild(tr);
        });
    }

    function openVariableModal(variableText = null) {
        variableModal.classList.add('active');

        if (variableText) {
            // Edit mode
            document.getElementById('variableModalTitle').textContent = 'Editar Variable';
            document.getElementById('editVariableOldText').value = variableText;
            document.getElementById('variableName').value = textVariables[variableText].name;
            document.getElementById('variableText').value = textVariables[variableText].text;
        } else {
            // Add mode
            document.getElementById('variableModalTitle').textContent = 'Nueva Variable';
            document.getElementById('editVariableOldText').value = '';
            variableForm.reset();
        }
    }

    function closeVariableModal() {
        variableModal.classList.remove('active');
    }

    function saveVariable() {
        const oldText = document.getElementById('editVariableOldText').value;
        const name = document.getElementById('variableName').value.trim();
        const text = document.getElementById('variableText').value.trim();

        if (!name || !text) {
            alert('Por favor completa todos los campos');
            return;
        }

        // Generate ID if it's a new variable
        let variableId;
        if (oldText && textVariables[oldText]) {
            variableId = textVariables[oldText].id;
        } else {
            const existingIds = Object.values(textVariables).map(v => v.id || '').filter(id => id.startsWith('v'));
            const maxNum = existingIds.length > 0 ? Math.max(...existingIds.map(id => parseInt(id.substring(1)) || 0)) : 0;
            variableId = `v${String(maxNum + 1).padStart(3, '0')}`;
        }

        // If editing and text changed, remove old entry
        if (oldText && oldText !== text) {
            if (textVariables[text]) {
                alert('Ya existe una variable con ese texto');
                return;
            }
            delete textVariables[oldText];
        }

        // Check if text already exists (for new variables)
        if (!oldText && textVariables[text]) {
            alert('Ya existe una variable con ese texto');
            return;
        }

        // Update or add variable with new structure
        textVariables[text] = { id: variableId, name: name, text: text };

        closeVariableModal();
        renderVariablesTable();
        localStorage.setItem(VARIABLES_STORAGE_KEY, JSON.stringify(textVariables));
        saveTextVariables(); // Persist to file via API
        console.log(`Variable "${text}" (${variableId}) guardada`);
    }

    // Save text variables to file via API
    function saveTextVariables() {
        fetch('/api/save-variables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textVariables)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Variables guardadas en archivo');
                } else {
                    console.error('Error guardando variables:', data.message);
                }
            })
            .catch(error => {
                console.error('Error en la peticiÃ³n:', error);
            });
    }

    window.editVariable = function (variableText) {
        openVariableModal(variableText);
    }

    window.deleteVariable = function (variableText) {
        console.log('Solicitud de borrar:', variableText);
        const key = variableText;

        if (confirm(`¿Estás seguro de eliminar la variable "${key}"?`)) {
            // Try direct key
            if (Object.prototype.hasOwnProperty.call(textVariables, key)) {
                delete textVariables[key];
            } else {
                // Try parsing/trimming just in case
                console.warn('Key directa no encontrada, probando trim');
                const trimmed = key.trim();
                if (textVariables[trimmed]) {
                    delete textVariables[trimmed];
                } else {
                    console.error('No se encontró la variable para borrar:', key);
                    // Force refresh just in case UI is stale
                    renderVariablesTable();
                    return;
                }
            }

            renderVariablesTable();
            localStorage.setItem(VARIABLES_STORAGE_KEY, JSON.stringify(textVariables));
            saveTextVariables(); // Persist to file via API
            console.log('Variable borrada y guardada:', key);
        }
    }

    // Update switchView to handle all new views (variables, tags, promotions)
    const originalSwitchView2 = switchView;
    switchView = function (view) {
        originalSwitchView2(view);
        if (view === 'variables') {
            document.getElementById('variablesView').classList.add('active');
            renderVariablesTable();
        }
        if (view === 'tags') {
            document.getElementById('tagsView').classList.add('active');
            renderTagsTable();
        }
        if (view === 'promotions') {
            document.getElementById('promotionsView').classList.add('active');
            renderPromotionsTable();
        }
    }

    // ==================== TAGS MANAGEMENT ====================

    const TAGS_STORAGE_KEY = 'samsung_catalog_tags';

    // Load tags from file or localStorage
    if (typeof tags === 'undefined') {
        window.tags = {};
    }

    // DOM Elements for Tags
    const tagsTableBody = document.getElementById('tagsTableBody');
    const tagSearch = document.getElementById('tagSearch');
    const addTagBtn = document.getElementById('addTagBtn');
    const tagModal = document.getElementById('tagModal');
    const closeTagModalBtn = document.getElementById('closeTagModal');
    const cancelTagBtn = document.getElementById('cancelTagBtn');
    const tagForm = document.getElementById('tagForm');

    // Event listeners for tag management
    if (tagSearch) {
        tagSearch.addEventListener('input', renderTagsTable);
    }

    if (addTagBtn) {
        addTagBtn.addEventListener('click', () => openTagModal());
    }

    if (closeTagModalBtn) {
        closeTagModalBtn.addEventListener('click', closeTagModal);
    }

    if (cancelTagBtn) {
        cancelTagBtn.addEventListener('click', closeTagModal);
    }

    if (tagForm) {
        tagForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveTag();
        });
    }

    function renderTagsTable() {
        if (!tagsTableBody) return;

        const searchTerm = tagSearch ? tagSearch.value.toLowerCase() : '';

        // Convert tags object to array
        filteredTags = Object.entries(tags)
            .filter(([name, tagData]) =>
                name.toLowerCase().includes(searchTerm)
            )
            .sort((a, b) => a[0].localeCompare(b[0]));

        tagsTableBody.innerHTML = '';

        if (filteredTags.length === 0) {
            tagsTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 2rem;">No se encontraron etiquetas</td></tr>';
            return;
        }

        filteredTags.forEach(([tagName, tagData]) => {
            const tagId = tagData.id || '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: monospace; color: #999; font-size: 0.8rem;">${tagId}</td>
                <td style="font-weight: 500;">${tagData.name}</td>
                <td>
                    <span class="action-icon" title="Editar" onclick="window.editTag('${tagName.replace(/'/g, "\\'")}')"><span class="material-icons">edit</span></span>
                    <span class="action-icon" title="Eliminar" onclick="window.deleteTag('${tagName.replace(/'/g, "\\'")}')"><span class="material-icons">delete</span></span>
                </td>
            `;
            tagsTableBody.appendChild(tr);
        });
    }

    function openTagModal(tagName = null) {
        tagModal.classList.add('active');

        if (tagName) {
            // Edit mode
            document.getElementById('tagModalTitle').textContent = 'Editar Etiqueta';
            document.getElementById('editTagOldName').value = tagName;
            document.getElementById('tagName').value = tags[tagName].name;
        } else {
            // Add mode
            document.getElementById('tagModalTitle').textContent = 'Nueva Etiqueta';
            document.getElementById('editTagOldName').value = '';
            tagForm.reset();
        }
    }

    function closeTagModal() {
        tagModal.classList.remove('active');
    }

    function saveTag() {
        const oldName = document.getElementById('editTagOldName').value;
        const name = document.getElementById('tagName').value.trim();

        if (!name) {
            alert('Por favor ingresa un nombre para la etiqueta');
            return;
        }

        // Generate ID if it's a new tag
        let tagId;
        if (oldName && tags[oldName]) {
            tagId = tags[oldName].id;
        } else {
            const existingIds = Object.values(tags).map(t => t.id || '').filter(id => id.startsWith('e'));
            const maxNum = existingIds.length > 0 ? Math.max(...existingIds.map(id => parseInt(id.substring(1)) || 0)) : 0;
            tagId = `e${String(maxNum + 1).padStart(3, '0')}`;
        }

        // If editing and name changed, remove old entry
        if (oldName && oldName !== name) {
            if (tags[name]) {
                alert('Ya existe una etiqueta con ese nombre');
                return;
            }
            delete tags[oldName];
        }

        // Check if name already exists (for new tags)
        if (!oldName && tags[name]) {
            alert('Ya existe una etiqueta con ese nombre');
            return;
        }

        // Update or add tag with new structure
        tags[name] = { id: tagId, name: name };

        closeTagModal();
        renderTagsTable();
        localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
        saveTags(); // Persist to file via API
        console.log(`Etiqueta "${name}" (${tagId}) guardada`);
    }

    // Save tags to file via API
    function saveTags() {
        fetch('/api/save-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tags)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Etiquetas guardadas en archivo');
                } else {
                    console.error('Error guardando etiquetas:', data.message);
                }
            })
            .catch(error => {
                console.error('Error en la peticiÃ³n:', error);
            });
    }

    window.editTag = function (tagName) {
        openTagModal(tagName);
    }

    window.deleteTag = function (tagName) {
        if (confirm(`Estás seguro de eliminar la etiqueta "${tagName}"?`)) {
            delete tags[tagName];
            renderTagsTable();
            localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
            saveTags(); // Persist to file via API
        }
    }

    // ==================== PROMOTIONS MANAGEMENT ====================

    const PROMOTIONS_STORAGE_KEY = 'samsung_catalog_promotions';

    // Load promotions from file or localStorage
    if (typeof promotions === 'undefined') {
        window.promotions = {};
    }



    // Event listeners for promotion management
    if (promotionSearch) {
        promotionSearch.addEventListener('input', renderPromotionsTable);
    }

    if (addPromotionBtn) {
        addPromotionBtn.addEventListener('click', () => openPromotionModal());
    }

    if (closePromotionModalBtn) {
        closePromotionModalBtn.addEventListener('click', closePromotionModal);
    }

    if (cancelPromotionBtn) {
        cancelPromotionBtn.addEventListener('click', closePromotionModal);
    }

    if (promotionForm) {
        promotionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            savePromotion();
        });
    }

    function renderPromotionsTable() {
        if (!promotionsTableBody) return;

        const searchTerm = promotionSearch ? promotionSearch.value.toLowerCase() : '';

        // Convert promotions object to array
        filteredPromotions = Object.entries(promotions)
            .filter(([name, promoData]) =>
                name.toLowerCase().includes(searchTerm)
            )
            .sort((a, b) => a[0].localeCompare(b[0]));

        promotionsTableBody.innerHTML = '';

        if (filteredPromotions.length === 0) {
            promotionsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">No se encontraron promociones</td></tr>';
            return;
        }

        filteredPromotions.forEach(([promoName, promoData]) => {
            const promoId = promoData.id || '';
            const imageUrl = promoData.image || '';
            const imagePreview = imageUrl ? `<a href="${imageUrl}" target="_blank" style="color: var(--samsung-blue); text-decoration: none;">Ver imagen</a>` : 'Sin imagen';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: monospace; color: #999; font-size: 0.8rem;">${promoId}</td>
                <td style="font-weight: 500;">${promoData.name}</td>
                <td style="font-size: 0.85rem; color: #666; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${imagePreview}
                </td>
                <td>
                    <span class="action-icon" title="Editar" onclick="window.editPromotion('${promoName.replace(/'/g, "\\'")}')"><span class="material-icons">edit</span></span>
                    <span class="action-icon" title="Eliminar" onclick="window.deletePromotion('${promoName.replace(/'/g, "\\'")}')"><span class="material-icons">delete</span></span>
                </td>
            `;
            promotionsTableBody.appendChild(tr);
        });
    }

    function openPromotionModal(promoName = null) {
        promotionModal.classList.add('active');

        if (promoName) {
            // Edit mode
            document.getElementById('promotionModalTitle').textContent = 'Editar promoción';
            document.getElementById('editPromotionOldName').value = promoName;
            document.getElementById('promotionName').value = promotions[promoName].name;
            document.getElementById('promotionImage').value = promotions[promoName].image;
        } else {
            // Add mode
            document.getElementById('promotionModalTitle').textContent = 'Nueva promoción';
            document.getElementById('editPromotionOldName').value = '';
            promotionForm.reset();
        }
    }

    function closePromotionModal() {
        promotionModal.classList.remove('active');
    }

    function savePromotion() {
        const oldName = document.getElementById('editPromotionOldName').value;
        const name = document.getElementById('promotionName').value.trim();
        const image = document.getElementById('promotionImage').value.trim();

        if (!name || !image) {
            alert('Por favor completa todos los campos');
            return;
        }

        // Generate ID if it's a new promotion
        let promoId;
        if (oldName && promotions[oldName]) {
            promoId = promotions[oldName].id;
        } else {
            const existingIds = Object.values(promotions).map(p => p.id || '').filter(id => id.startsWith('pr'));
            const maxNum = existingIds.length > 0 ? Math.max(...existingIds.map(id => parseInt(id.substring(2)) || 0)) : 0;
            promoId = `pr${String(maxNum + 1).padStart(3, '0')}`;
        }

        // If editing and name changed, remove old entry
        if (oldName && oldName !== name) {
            if (promotions[name]) {
                alert('Ya existe una promoción con ese nombre');
                return;
            }
            delete promotions[oldName];
        }

        // Check if name already exists (for new promotions)
        if (!oldName && promotions[name]) {
            alert('Ya existe una promoción con ese nombre');
            return;
        }

        // Update or add promotion with new structure
        promotions[name] = { id: promoId, name: name, image: image };

        closePromotionModal();
        renderPromotionsTable();
        localStorage.setItem(PROMOTIONS_STORAGE_KEY, JSON.stringify(promotions));
        savePromotions(); // Persist to file via API
        console.log(`promoción "${name}" (${promoId}) guardada`);
    }

    // Save promotions to file via API
    function savePromotions() {
        fetch('/api/save-promotions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(promotions)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Promociones guardadas en archivo');
                } else {
                    console.error('Error guardando promociones:', data.message);
                }
            })
            .catch(error => {
                console.error('Error en la peticiÃ³n:', error);
            });
    }

    window.editPromotion = function (promoName) {
        openPromotionModal(promoName);
    }

    window.deletePromotion = function (promoName) {
        if (confirm(`Estás seguro de eliminar la promoción "${promoName}"?`)) {
            delete promotions[promoName];
            renderPromotionsTable();
            localStorage.setItem(PROMOTIONS_STORAGE_KEY, JSON.stringify(promotions));
            savePromotions(); // Persist to file via API
        }
    }
    // --- OVERRIDE: Update saveProduct for Multi-Image Support (Flat Structure) ---
    window.saveProduct = function () {
        const idStr = document.getElementById('editProductId').value;
        const name = document.getElementById('prodName').value;
        const category = document.getElementById('prodCategory').value;
        const badge = document.getElementById('prodBadge').value;

        if (!name || !category) {
            alert('Nombre y categoría son obligatorios');
            return;
        }

        const variants = [];
        const variantCards = document.querySelectorAll('.variant-card');
        let hasError = false;

        variantCards.forEach((card, index) => {
            const colorId = card.querySelector('.var-color-select').value;
            if (!colorId) { hasError = true; return; }

            const variableId = card.querySelector('.var-variable-select').value;
            const sku = card.querySelector('.var-sku').value.trim();
            const price = Number(card.querySelector('.var-price').value) || 0;
            const promoPrice = Number(card.querySelector('.var-promo').value) || 0;
            const link = card.querySelector('.var-link').value.trim();
            const variantBadge = card.querySelector('.var-badge').value.trim();
            const active = card.querySelector('.var-active').checked;

            // Images
            const imageInputs = card.querySelectorAll('.var-image-input');
            const images = Array.from(imageInputs).map(i => i.value.trim()).filter(u => u);
            const image = images.length > 0 ? images[0] : '';

            variants.push({
                uniqueId: index + 1,
                colorId, variableId, sku, image, images, price, promoPrice, active, link, badge: variantBadge
            });
        });

        if (hasError || variants.length === 0) {
            alert('Debes agregar al menos una variante vÃ¡lida (con color seleccionado).');
            return;
        }

        let existingId = idStr;
        if (!existingId) {
            const maxId = products.reduce((max, p) => {
                const pid = p.id.toString();
                const num = parseInt(pid.replace(/^p/, '')) || 0;
                return Math.max(max, num);
            }, 0);
            existingId = `p${String(maxId + 1).padStart(3, '0')}`;
        }

        const existingProduct = products.find(p => p.id == existingId);

        const productData = {
            id: existingId,
            name,
            description: existingProduct ? existingProduct.description : '',
            category,
            badge,
            tags: existingProduct ? existingProduct.tags : [],
            sortOrder: existingProduct ? existingProduct.sortOrder : (products.length + 1),
            variants
        };

        const index = products.findIndex(p => p.id == existingId);
        if (index > -1) products[index] = productData;
        else products.push(productData);

        closeModal();
        if (typeof handleFilter === 'function') handleFilter();
        if (typeof autoSave === 'function') autoSave();

        fetch('/api/save-products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(products)
        }).then(res => res.json()).then(d => {
            if (!d.success) console.error('Error saving: ' + d.message);
        });
    }

    // ==================== LIVE PREVIEW FUNCTIONALITY ====================

    let previewUpdateTimeout;

    function updateProductPreview() {
        clearTimeout(previewUpdateTimeout);
        previewUpdateTimeout = setTimeout(() => {
            console.log('🔄 Actualizando vista previa...');
            const previewContainer = document.getElementById('productPreviewContainer');
            if (!previewContainer) {
                console.error('❌ No se encontró productPreviewContainer');
                return;
            }

            // Collect current form data
            const name = document.getElementById('prodName')?.value || 'Nombre del Producto';
            const category = document.getElementById('prodCategory')?.value || '';
            const badge = document.getElementById('prodBadge')?.value || '';

            // Get base pricing (if no price variants)
            const basePrice = Number(document.getElementById('prodBasePrice')?.value) || 0;
            const basePromo = Number(document.getElementById('prodBasePromo')?.value) || 0;

            // Collect colors from new structure
            const colors = [];
            const variantData = {};
            const colorCodes = {};
            let defaultImage = '';
            let defaultSku = '';

            document.querySelectorAll('#colorsContainer .variant-card').forEach((card, index) => {
                const colorSelect = card.querySelector('.color-select');
                const colorId = colorSelect ? colorSelect.value : '';

                if (!colorId) return;

                // Get color name and hex
                let colorName = '';
                let hex = '';
                if (colorVariables) {
                    for (const [name, data] of Object.entries(colorVariables)) {
                        if (data.id === colorId) {
                            colorName = name;
                            hex = data.hex || '';
                            break;
                        }
                    }
                }

                if (!colorName) return;

                const sku = card.querySelector('.color-sku')?.value || '';

                // Get first image
                const firstImageInput = card.querySelector('.color-images-list .color-image-input');
                const image = firstImageInput ? firstImageInput.value : '';

                colors.push(colorName);
                variantData[colorName] = {
                    sku: sku,
                    image: image || ''
                };
                colorCodes[colorName] = hex;

                // Set first color as default
                if (index === 0) {
                    defaultImage = image || defaultImage;
                    defaultSku = sku;
                }
            });

            // Collect price variants (specifications)
            const storageOptions = [];
            let defaultPrice = basePrice;
            let defaultPromoPrice = basePromo;

            document.querySelectorAll('#priceVariantsContainer .variant-card').forEach((card, index) => {
                const variableSelect = card.querySelector('.price-variable-select');
                const variableId = variableSelect ? variableSelect.value : '';

                // Get variable text (storage/RAM)
                let variableText = '';
                if (variableId && textVariables) {
                    const varData = Object.values(textVariables).find(v => v.id === variableId);
                    if (varData) {
                        variableText = varData.text || '';
                    }
                }

                const price = Number(card.querySelector('.price-price')?.value) || 0;
                const promoPrice = Number(card.querySelector('.price-promo')?.value) || 0;

                if (variableText) {
                    storageOptions.push(variableText);
                }

                // Set first price variant as default
                if (index === 0 && price > 0) {
                    defaultPrice = price;
                    defaultPromoPrice = promoPrice;
                }
            });

            // Create preview product object
            const previewProduct = {
                id: 'preview',
                name: name,
                category: category,
                badge: badge,
                sku: defaultSku,
                image: defaultImage,
                price: defaultPrice,
                originalPrice: defaultPromoPrice,
                colors: colors,
                variants: variantData,
                colorCodes: colorCodes,
                storage: storageOptions,
                description: ''
            };

            console.log('📦 Producto preview:', previewProduct);

            // Render preview card
            previewContainer.innerHTML = '';
            // Use the global createPreviewCard from preview.js
            if (typeof window.createPreviewCard === 'function') {
                const previewCard = window.createPreviewCard(previewProduct);
                previewContainer.appendChild(previewCard);
                console.log('✅ Vista previa renderizada');
            } else {
                console.error('❌ createPreviewCard no está definido');
            }

        }, 300); // Debounce 300ms
    }


    // Attach event listeners to form inputs for live preview
    function attachPreviewListeners() {
        const form = document.getElementById('productForm');
        if (!form) return;

        // Listen to all input changes
        form.addEventListener('input', updateProductPreview);
        form.addEventListener('change', updateProductPreview);

        // Watch colors container for additions/removals
        const colorsContainer = document.getElementById('colorsContainer');
        if (colorsContainer) {
            const observer = new MutationObserver(updateProductPreview);
            observer.observe(colorsContainer, { childList: true, subtree: true });
        }

        // Watch price variants container for additions/removals
        const priceVariantsContainer = document.getElementById('priceVariantsContainer');
        if (priceVariantsContainer) {
            const observer = new MutationObserver(updateProductPreview);
            observer.observe(priceVariantsContainer, { childList: true, subtree: true });
        }
    }

    // Initialize preview listeners when modal opens
    const originalOpenModal = window.openModal;
    window.openModal = function (productId = null) {
        originalOpenModal(productId);
        setTimeout(() => {
            attachPreviewListeners();
            updateProductPreview();
        }, 100);
    };

});

