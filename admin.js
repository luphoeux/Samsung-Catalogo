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
                window.products = JSON.parse(savedProducts);
                console.log('✅ Productos cargados desde localStorage');
            }

            if (savedColors) {
                window.colorVariables = JSON.parse(savedColors);
                console.log('✅ Variables de color cargadas desde localStorage');
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
            console.log('💾 Datos guardados automáticamente');

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
        alert('✅ Archivo data.js descargado. Reemplázalo en catalog-template/ para actualizar el catálogo.');
    }

    // Export color-variables.js file
    // Export color variables as Excel
    window.exportColorVariables = function () {
        const data = [['Nombre del Color', 'Código Hex']];

        if (typeof colorVariables !== 'undefined') {
            Object.keys(colorVariables).sort().forEach(color => {
                data.push([color, colorVariables[color]]);
            });
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 30 }, { wch: 15 }];

        XLSX.utils.book_append_sheet(wb, ws, 'Colores');
        XLSX.writeFile(wb, 'Samsung_Colores.xlsx');
    }

    // Reset to original data.js
    window.resetData = function () {
        if (confirm('⚠️ ¿Estás seguro? Esto eliminará todos los cambios no exportados y volverá a los datos originales de data.js')) {
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

    // Category definitions
    const categories = {
        smartphones: { name: 'Smartphones', icon: '📱' },
        tablets: { name: 'Tablets', icon: '📱' },
        smartwatches: { name: 'Smartwatches', icon: '⌚' },
        buds: { name: 'Buds', icon: '🎧' },
        laptops: { name: 'Laptops', icon: '💻' },
        televisions: { name: 'Televisores', icon: '📺' },
        monitors: { name: 'Monitores', icon: '🖥️' },
        washing_machines: { name: 'Lavadoras', icon: '🧺' },
        refrigerators: { name: 'Refrigeradores', icon: '❄️' },
        kitchen_cleaning: { name: 'Línea Blanca', icon: '🏠' },
        accessories: { name: 'Accesorios', icon: '🔌' }
    };

    // State
    let filteredProducts = [...products];
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

    // Initial Render
    renderCatalogs();

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    function switchView(view) {
        currentView = view;

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
        } else if (view === 'config') {
            document.getElementById('configView').classList.add('active');
        }
    }

    // Catalogs View Functions
    function renderCatalogs() {
        catalogsGrid.innerHTML = '';

        Object.keys(categories).forEach(catKey => {
            const catInfo = categories[catKey];
            const productsInCat = products.filter(p => p.category === catKey);

            const card = document.createElement('div');
            card.className = 'catalog-card';
            card.innerHTML = `
                <div class="catalog-header">
                    <div>
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">${catInfo.icon}</div>
                        <div class="catalog-title">${catInfo.name}</div>
                    </div>
                    <div class="catalog-count">${productsInCat.length} items</div>
                </div>
                <div class="catalog-actions">
                    <button class="catalog-btn preview" onclick="window.previewCatalog('${catKey}')">
                        👁️ Previsualizar
                    </button>
                    <button class="catalog-btn view" onclick="window.viewCatalogProducts('${catKey}')" style="background: #fff3e0; color: #f57c00;">
                        📋 Ver Productos
                    </button>
                    <button class="catalog-btn export" onclick="window.exportCatalog('${catKey}')">
                        📥 Exportar Excel
                    </button>
                </div>
            `;
            catalogsGrid.appendChild(card);
        });
    }

    window.previewCatalog = function (category) {
        const catalogProducts = products.filter(p => p.category === category);
        try {
            sessionStorage.setItem('samsung_catalog_preview_data', JSON.stringify(catalogProducts));
            sessionStorage.setItem('samsung_catalog_preview_active', 'true');
            window.open('index.html', '_blank');
        } catch (e) {
            alert('Error al generar previsualización: ' + e.message);
        }
    }

    // Catalog Detail View
    let currentCatalogCategory = null;
    let catalogProducts = [];

    window.viewCatalogProducts = function (category) {
        currentCatalogCategory = category;
        catalogProducts = products.filter(p => p.category === category);

        // Update title
        const catInfo = categories[category];
        document.getElementById('catalogDetailTitle').textContent = `${catInfo.icon} ${catInfo.name}`;
        document.getElementById('catalogDetailSubtitle').textContent = `${catalogProducts.length} productos en este catálogo`;

        // Switch to catalog detail view
        viewSections.forEach(section => section.classList.remove('active'));
        document.getElementById('catalogDetailView').classList.add('active');

        renderCatalogProducts();
    }

    window.backToCatalogs = function () {
        currentCatalogCategory = null;
        switchView('catalogs');
    }

    function renderCatalogProducts() {
        const catalogTableBody = document.getElementById('catalogTableBody');
        const catalogSearch = document.getElementById('catalogSearch');

        if (!catalogTableBody) return;

        const searchTerm = catalogSearch ? catalogSearch.value.toLowerCase() : '';
        const filtered = catalogProducts.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            (p.sku && p.sku.toLowerCase().includes(searchTerm))
        );

        catalogTableBody.innerHTML = '';

        if (filtered.length === 0) {
            catalogTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No se encontraron productos</td></tr>';
            return;
        }

        filtered.forEach(product => {
            const tr = document.createElement('tr');
            const imageSrc = product.image && product.image.trim() !== '' ? product.image : 'https://via.placeholder.com/50?text=No+Img';

            tr.innerHTML = `
                <td><img src="${imageSrc}" class="product-mini-img" alt="img" onerror="this.src='https://via.placeholder.com/50?text=Err'"></td>
                <td style="font-weight: 500;">${product.name}</td>
                <td style="color:#666; font-size: 0.9em;">${product.sku || '-'}</td>
                <td>${product.price}</td>
                <td>
                    <span class="action-icon" title="Editar" onclick="window.editProduct(${product.id})">✏️</span>
                    <span class="action-icon" title="Quitar del catálogo" onclick="window.removeFromCatalog(${product.id})" style="color: #d93025;">🗑️</span>
                </td>
            `;
            catalogTableBody.appendChild(tr);
        });
    }

    window.removeFromCatalog = function (productId) {
        if (confirm('¿Quitar este producto del catálogo? (No se eliminará de la base de datos)')) {
            catalogProducts = catalogProducts.filter(p => p.id !== productId);
            renderCatalogProducts();

            // Update subtitle
            const catInfo = categories[currentCatalogCategory];
            document.getElementById('catalogDetailSubtitle').textContent = `${catalogProducts.length} productos en este catálogo`;
        }
    }

    // Event listener for catalog search
    const catalogSearchInput = document.getElementById('catalogSearch');
    if (catalogSearchInput) {
        catalogSearchInput.addEventListener('input', renderCatalogProducts);
    }

    // Event listener for add to catalog button
    const addToCatalogBtn = document.getElementById('addToCatalogBtn');
    if (addToCatalogBtn) {
        addToCatalogBtn.addEventListener('click', () => {
            alert('Funcionalidad de agregar productos próximamente...');
        });
    }

    window.exportCatalog = function (category) {
        const catalogProducts = products.filter(p => p.category === category);

        if (catalogProducts.length === 0) {
            alert('No hay productos en esta categoría.');
            return;
        }

        // Prepare data for Excel
        const excelData = [];

        // Add headers
        excelData.push([
            'ID', 'Nombre', 'Categoría', 'Precio', 'Precio Original', 'Link', 'Descripción', 'Badge', 'Almacenamiento',
            'SKU1', 'Color1', 'Link1', 'Imágenes1', 'Hex1',
            'SKU2', 'Color2', 'Link2', 'Imágenes2', 'Hex2',
            'SKU3', 'Color3', 'Link3', 'Imágenes3', 'Hex3',
            'SKU4', 'Color4', 'Link4', 'Imágenes4', 'Hex4',
            'SKU5', 'Color5', 'Link5', 'Imágenes5', 'Hex5'
        ]);

        // Add product rows
        catalogProducts.forEach(p => {
            const row = [];
            row.push(p.id);
            row.push(p.name);
            row.push(p.category);
            row.push(p.price);
            row.push(p.originalPrice || 0);
            row.push(p.link || '');
            row.push(p.description || '');
            row.push(p.badge || '');

            // Storage Options Logic
            let storageStr = '';
            if (p.storageOptions && Array.isArray(p.storageOptions) && p.storageOptions.length > 0) {
                storageStr = p.storageOptions.map(s => `${s.capacity} ($${s.price})`).join(' | ');
            } else if (p.storage && Array.isArray(p.storage)) {
                storageStr = p.storage.join(', ');
            } else if (p.storage) {
                storageStr = String(p.storage);
            }
            row.push(storageStr);

            // Variants (up to 5)
            const vars = p.variants || [];
            for (let i = 0; i < 5; i++) {
                if (i < vars.length) {
                    const v = vars[i];
                    // Images to string (comma separated)
                    let imgs = v.images && v.images.length > 0 ? v.images.join(', ') : (v.image || '');

                    row.push(v.sku || '');
                    row.push(v.color || '');
                    row.push(v.link || '');
                    row.push(imgs);
                    row.push(v.hex || '');
                } else {
                    row.push('', '', '', '', '');
                }
            }

            excelData.push(row);
        });

        // Create workbook and worksheet using SheetJS
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);

        // Set column widths
        const colWidths = [
            { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 10 }, { wch: 25 }
        ];

        // Add widths for variant columns
        for (let i = 0; i < 5; i++) {
            colWidths.push({ wch: 15 }); // SKU
            colWidths.push({ wch: 15 }); // Color
            colWidths.push({ wch: 30 }); // Link
            colWidths.push({ wch: 40 }); // Imágenes
            colWidths.push({ wch: 10 }); // Hex
        }

        ws['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Productos');

        // Generate Excel file
        const categoryName = categories[category].name.replace(/\s+/g, '_');
        XLSX.writeFile(wb, `Catalogo_${categoryName}.xlsx`);
    }

    // Products Database View Functions
    function renderProductsTable() {
        handleFilter();
    }

    function handleFilter() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const category = categoryFilter ? categoryFilter.value : 'all';

        filteredProducts = products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                (product.sku && product.sku.toLowerCase().includes(searchTerm));
            const matchesCategory = category === 'all' || product.category === category;
            return matchesSearch && matchesCategory;
        });

        renderTable();
    }

    function renderTable() {
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (filteredProducts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="19" style="text-align:center; padding: 2rem;">No se encontraron productos</td></tr>';
            return;
        }

        filteredProducts.forEach(product => {
            const tr = document.createElement('tr');
            const imageSrc = product.image && product.image.trim() !== '' ? product.image : 'https://via.placeholder.com/50?text=No+Img';

            // Get variants data (handle both array and object formats)
            let variants = [];
            if (Array.isArray(product.variants)) {
                variants = product.variants;
            } else if (product.variants && typeof product.variants === 'object') {
                // Convert object format to array
                variants = Object.keys(product.variants).map(color => ({
                    color: color,
                    sku: product.variants[color].sku,
                    image: product.variants[color].image,
                    hex: product.colorCodes ? product.colorCodes[color] : ''
                }));
            }

            // Prepare variant cells (up to 5)
            let variantCells = '';
            for (let i = 0; i < 5; i++) {
                if (i < variants.length) {
                    const v = variants[i];
                    // Get hex from variables first, fallback to variant hex
                    const hexColor = (colorVariables && colorVariables[v.color]) || v.hex || '';
                    const colorPreview = hexColor ? `<div style="display:inline-block; width:20px; height:20px; background:${hexColor}; border:1px solid #ddd; border-radius:4px; vertical-align:middle; margin-right:6px;"></div>` : '';

                    variantCells += `
                        <td style="font-size:0.75rem; color:#666;">${v.sku || '-'}</td>
                        <td style="font-size:0.85rem;">${colorPreview}${v.color || '-'}</td>
                    `;
                } else {
                    variantCells += '<td>-</td><td>-</td>';
                }
            }

            // Storage display
            let storageDisplay = '-';
            if (product.storage) {
                if (Array.isArray(product.storage)) {
                    storageDisplay = product.storage.join(', ');
                } else {
                    storageDisplay = product.storage;
                }
            }

            tr.innerHTML = `
                <td style="font-weight:600; color:#666;">${product.id}</td>
                <td><img src="${imageSrc}" class="product-mini-img" alt="img" onerror="this.src='https://via.placeholder.com/50?text=Err'"></td>
                <td style="font-weight: 500;">${product.name}</td>
                <td><span style="background:#eee; padding:2px 8px; border-radius:4px; font-size:0.75em;">${product.category}</span></td>
                <td style="color:#2e7d32; font-weight:600;">${product.price.toLocaleString()}</td>
                <td style="color:#999; text-decoration:line-through; font-size:0.85em;">${product.originalPrice ? product.originalPrice.toLocaleString() : '-'}</td>
                <td style="font-size:0.75rem;">${product.badge || '-'}</td>
                <td style="font-size:0.75rem; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${storageDisplay}">${storageDisplay}</td>
                ${variantCells}
                <td>
                    <span class="action-icon" title="Editar" onclick="window.editProduct(${product.id})">✏️</span>
                    <span class="action-icon" title="Borrar" onclick="window.deleteProduct(${product.id})">🗑️</span>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Event Listeners - Products View
    if (searchInput) searchInput.addEventListener('input', handleFilter);
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilter);
    if (addProductBtn) addProductBtn.addEventListener('click', () => openModal());

    // Modal & CRUD Operations
    window.openModal = function (productId = null) {
        modal.classList.add('active');
        document.getElementById('storageContainer').innerHTML = '';
        document.getElementById('variantsContainer').innerHTML = '';

        if (productId) {
            const product = products.find(p => p.id === productId);
            if (!product) return;

            modalTitle.textContent = 'Editar Producto';
            document.getElementById('editProductId').value = product.id;
            document.getElementById('prodName').value = product.name;
            document.getElementById('prodCategory').value = product.category;
            document.getElementById('prodBadge').value = product.badge || '';

            // Handle Storage & Prices
            // New format: product.storageOptions = [{capacity: '256GB', price: 1000, originalPrice: 1200}]
            // Legacy format migration
            if (product.storageOptions && Array.isArray(product.storageOptions) && product.storageOptions.length > 0) {
                product.storageOptions.forEach(opt => addStorageRow(opt));
            } else {
                // Try to migrate legacy data
                // If legacy had storage array but single price
                let storageItems = [];
                if (Array.isArray(product.storage)) storageItems = product.storage;
                else if (product.storage && typeof product.storage === 'string') storageItems = product.storage.split(',').map(s => s.trim());
                else if (product.storage) storageItems = [product.storage]; // single string/number

                if (storageItems.length > 0) {
                    storageItems.forEach(cap => addStorageRow({
                        capacity: cap,
                        price: product.price,
                        originalPrice: product.originalPrice
                    }));
                } else {
                    // Fallback for single data (no storage options defined but price exists)
                    addStorageRow({
                        capacity: '',
                        price: product.price,
                        originalPrice: product.originalPrice
                    });
                }
            }

            // Handle Variants
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(v => {
                    // Legacy variants might have single image property
                    const refinedV = {
                        ...v,
                        images: v.images || (v.image ? [v.image] : []),
                        link: v.link || product.link || '' // specific or global fallback
                    };
                    addRefinedVariantRow(refinedV);
                });
            } else {
                addRefinedVariantRow();
            }
        } else {
            // NEW PRODUCT
            modalTitle.textContent = 'Nuevo Producto';
            document.getElementById('editProductId').value = '';
            productForm.reset();
            // Add initial empty rows
            addStorageRow();
            addRefinedVariantRow();
            // Reset containers again just in case reset() didn't clear JS added DOM (it doesn't)
            document.getElementById('storageContainer').innerHTML = '';
            document.getElementById('variantsContainer').innerHTML = '';
            addStorageRow();
            addRefinedVariantRow();
        }
    }

    function closeModal() {
        modal.classList.remove('active');
    }

    window.editProduct = function (id) {
        openModal(id);
    }

    window.deleteProduct = function (id) {
        if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
            const index = products.findIndex(p => p.id === id);
            if (index > -1) {
                products.splice(index, 1);
                handleFilter();
                renderCatalogs(); // Update catalog counts
                autoSave(); // Save changes automatically
            }
        }
    }

    // --- NEW: Storage Options Logic ---
    window.addStorageRow = function (data = {}) {
        const container = document.getElementById('storageContainer');
        const div = document.createElement('div');
        div.className = 'storage-row';
        // Styles moved to admin.html .storage-row class

        div.innerHTML = `
            <input type="text" class="form-input sto-capacity" placeholder="Ej: 256GB" value="${data.capacity || ''}">
            <input type="number" class="form-input sto-price" placeholder="0" value="${data.price || ''}">
            <input type="number" class="form-input sto-original" placeholder="0" value="${data.originalPrice || ''}">
            <button type="button" class="btn-danger" style="padding:0; height:38px; width:100%; border-radius:4px; cursor:pointer;" onclick="this.parentElement.remove()">X</button>
        `;
        container.appendChild(div);
    }

    // --- NEW: Refined Variant Logic ---
    window.addRefinedVariantRow = function (data = {}) {
        const container = document.getElementById('variantsContainer');
        const card = document.createElement('div');
        card.className = 'variant-card';
        // Styles moved to admin.html .variant-card class

        // Build color options
        let colorOptions = '<option value="">Seleccionar color...</option>';
        if (typeof colorVariables !== 'undefined') {
            Object.keys(colorVariables).sort().forEach(colorName => {
                const selected = data.color === colorName ? 'selected' : '';
                colorOptions += `<option value="${colorName}" ${selected}>${colorName}</option>`;
            });
        }
        const isCustom = data.color && (!colorVariables || !colorVariables[data.color]);
        colorOptions += `<option value="__custom__" ${isCustom ? 'selected' : ''}>+ Color personalizado...</option>`;

        // Helper to format images array to string
        let imagesStr = '';
        if (Array.isArray(data.images)) {
            imagesStr = data.images.join('\\n');
        } else if (data.image) {
            imagesStr = data.image; // fallback for legacy data
        }

        card.innerHTML = `
            <button type="button" class="btn-close-card" onclick="this.parentElement.remove()">Eliminar</button>
            <h4 style="margin:0 0 10px 0; color:#555; font-size: 0.9rem;">Detalles de Variante</h4>
            
            <div class="form-grid-2">
                <!-- Color Selection -->
                <div>
                    <label class="form-label" style="font-size:0.75rem;">Color</label>
                    <select class="form-select var-color-select" onchange="handleRefinedColorChange(this)">
                        ${colorOptions}
                    </select>
                    <input type="text" class="form-input var-color-custom" placeholder="Nombre del color" value="${isCustom ? (data.color || '') : ''}" style="display:${isCustom ? 'block' : 'none'}; margin-top:5px;">
                    <div class="color-preview-bar var-color-preview" style="background:${data.hex || '#eee'};"></div>
                    <input type="hidden" class="var-hex" value="${data.hex || ''}">
                </div>

                <!-- SKU -->
                <div>
                    <label class="form-label" style="font-size:0.75rem;">SKU</label>
                    <input type="text" class="form-input var-sku" placeholder="SM-S92..." value="${data.sku || ''}">
                </div>
            </div>

            <div style="margin-bottom:10px;">
                <label class="form-label" style="font-size:0.75rem;">Link Específico (Opcional)</label>
                <input type="url" class="form-input var-link" placeholder="https://shop.samsung..." value="${data.link || ''}">
            </div>

            <div style="margin-bottom:0;">
                <label class="form-label" style="font-size:0.75rem;">Imágenes (Una URL por línea)</label>
                <textarea class="form-input var-images" rows="3" placeholder="https://img1.jpg\nhttps://img2.jpg" style="resize:vertical; min-height:60px;">${imagesStr}</textarea>
            </div>
        `;
        container.appendChild(card);
    }

    window.handleRefinedColorChange = function (select) {
        const card = select.closest('.variant-card');
        const customInput = card.querySelector('.var-color-custom');
        const hexInput = card.querySelector('.var-hex');
        const preview = card.querySelector('.var-color-preview');
        const val = select.value;

        if (val === '__custom__') {
            customInput.style.display = 'block';
            customInput.value = '';
            hexInput.value = ''; // Let them leave it empty or implement a picker later
            preview.style.background = '#eee';
        } else if (val) {
            customInput.style.display = 'none';
            customInput.value = val;
            const hex = colorVariables[val];
            hexInput.value = hex;
            preview.style.background = hex;
        } else {
            customInput.style.display = 'none';
            hexInput.value = '';
            preview.style.background = '#eee';
        }
    }

    function saveProduct() {
        const idStr = document.getElementById('editProductId').value;
        const name = document.getElementById('prodName').value;
        const category = document.getElementById('prodCategory').value;
        const badge = document.getElementById('prodBadge').value;

        // 1. Collect Storage Options
        const storageOptions = [];
        document.querySelectorAll('.storage-row').forEach(row => {
            const capacity = row.querySelector('.sto-capacity').value.trim();
            const price = Number(row.querySelector('.sto-price').value) || 0;
            const originalPrice = Number(row.querySelector('.sto-original').value) || 0;
            if (capacity || price > 0) {
                storageOptions.push({ capacity, price, originalPrice });
            }
        });

        // 2. Collect Variants
        const variants = [];
        document.querySelectorAll('.variant-card').forEach(card => {
            const colorSelect = card.querySelector('.var-color-select');
            const customInput = card.querySelector('.var-color-custom');

            let color = colorSelect.value;
            if (color === '__custom__') color = customInput.value.trim();
            if (!color) return; // Skip invalid

            const sku = card.querySelector('.var-sku').value.trim();
            const hex = card.querySelector('.var-hex').value.trim();
            const link = card.querySelector('.var-link').value.trim();
            const imagesText = card.querySelector('.var-images').value.trim();
            const images = imagesText ? imagesText.split('\n').map(l => l.trim()).filter(l => l) : [];

            variants.push({
                sku,
                color,
                hex,
                link,
                images,
                image: images[0] || '' // Fallback property for legacy compatibility (first image)
            });
        });

        // 3. Determine Base Price (Lowest from options or 0)
        let basePrice = 0;
        let baseOriginalPrice = 0;
        if (storageOptions.length > 0) {
            basePrice = storageOptions[0].price;
            baseOriginalPrice = storageOptions[0].originalPrice;
        }

        // 4. Construct Product Object
        const productData = {
            id: idStr ? Number(idStr) : generateId(),
            name,
            category,
            badge,
            price: basePrice, // Legacy compatibility
            originalPrice: baseOriginalPrice, // Legacy compatibility
            storageOptions,
            variants,
            // Legacy fallbacks for main listing
            storage: storageOptions.map(s => s.capacity),
            link: variants.length > 0 ? variants[0].link : '',
            image: variants.length > 0 && variants[0].images.length > 0 ? variants[0].images[0] : ''
        };

        if (idStr) {
            const index = products.findIndex(p => p.id === Number(idStr));
            if (index !== -1) {
                products[index] = productData;
            }
        } else {
            products.unshift(productData);
        }

        closeModal();
        handleFilter(); // Re-render table
        renderCatalogs();
        autoSave();
    }

    function generateId() {
        const maxId = products.reduce((max, p) => p.id > max ? p.id : max, 0);
        return maxId + 1;
    }

    // Event Listeners - Modal
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

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
            colorsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No se encontraron colores</td></tr>';
            return;
        }

        filteredColors.forEach(([colorName, hexCode]) => {
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
                    <span class="action-icon" title="Editar" onclick="window.editColor('${colorName.replace(/'/g, "\\'")}')">✏️</span>
                    <span class="action-icon" title="Eliminar" onclick="window.deleteColor('${colorName.replace(/'/g, "\\'")}')">🗑️</span>
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
            document.getElementById('colorHex').value = colorVariables[colorName];
            document.getElementById('colorPicker').value = colorVariables[colorName];
        } else {
            // Add mode
            document.getElementById('colorModalTitle').textContent = 'Nuevo Color';
            document.getElementById('editColorOldName').value = '';
            colorForm.reset();
            document.getElementById('colorPicker').value = '#000000';
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
            alert('El código hex debe tener el formato #RRGGBB');
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

        // Update or add color
        colorVariables[newName] = hexCode;

        // Update hex codes in products that use this color
        products.forEach(p => {
            if (p.variants && Array.isArray(p.variants)) {
                p.variants.forEach(v => {
                    if (v.color === newName) {
                        v.hex = hexCode;
                    }
                });
            }
        });

        closeColorModal();
        renderColorsTable();
        autoSave(); // Save changes automatically
    }

    window.editColor = function (colorName) {
        openColorModal(colorName);
    }

    window.deleteColor = function (colorName) {
        // Check if color is in use
        let inUse = false;
        products.forEach(p => {
            if (p.variants && Array.isArray(p.variants)) {
                p.variants.forEach(v => {
                    if (v.color === colorName) inUse = true;
                });
            }
        });

        if (inUse) {
            if (!confirm(`El color "${colorName}" está en uso. ¿Estás seguro de eliminarlo ? Los productos mantendrán el color pero sin referencia.`)) {
                return;
            }
        }

        delete colorVariables[colorName];
        renderColorsTable();
        autoSave(); // Save changes automatically
    }

    function saveColorVariables() {
        // Use API to save directly to Excel
        const btn = document.getElementById('saveVariablesBtn');
        const originalText = btn ? btn.innerHTML : '💾 Guardar Variables';
        if (btn) btn.innerHTML = '⏳ Guardando...';

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
                    alert('✅ ' + data.message);
                } else {
                    alert('❌ Error al guardar: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('❌ Error de conexión. Asegúrate de que el servidor esté corriendo.');
            })
            .finally(() => {
                if (btn) btn.innerHTML = originalText;
            });
    }
});
