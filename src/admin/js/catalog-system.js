// ========================================
// CATALOG SYSTEM - REBUILT
// ========================================

let catalogs = [];
let currentCatalogId = null;
let currentCatalogProducts = [];

// Initialize catalog system
function initCatalogSystem() {
    console.log('Initializing catalog system...');
    loadCatalogs();
}

// Load catalogs from server
async function loadCatalogs() {
    try {
        const response = await fetch('/api/catalogs');
        const data = await response.json();

        if (data.success) {
            catalogs = data.catalogs || [];
            renderCatalogsGrid();
        }
    } catch (error) {
        console.error('Error loading catalogs:', error);
        catalogs = [];
        renderCatalogsGrid();
    }
}

// Render catalogs grid
function renderCatalogsGrid() {
    const grid = document.getElementById('catalogsGrid');
    if (!grid) return;

    if (catalogs.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #999;">
                <span class="material-icons" style="font-size: 48px; opacity: 0.3;">folder_open</span>
                <p style="margin-top: 1rem;">No hay catálogos creados</p>
                <p style="font-size: 0.875rem;">Crea tu primer catálogo haciendo clic en el botón "Crear Catálogo"</p>
            </div>
        `;
        return;
    }

    grid.style.display = 'block';
    grid.style.background = '#fff';
    grid.style.borderRadius = '8px';
    grid.style.border = '1px solid #e0e0e0';
    grid.style.overflow = 'hidden';

    let tableHtml = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #eee;">
                    <th style="padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #666; width: 50%;">Nombre del Catálogo</th>
                    <th style="padding: 1rem; text-align: center; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #666; width: 20%;">Items</th>
                    <th style="padding: 1rem; text-align: right; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #666; width: 30%;">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    tableHtml += catalogs.map(catalog => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 1rem; vertical-align: middle;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 32px; height: 32px; background: #e3f2fd; color: #1565c0; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                        <span class="material-icons" style="font-size: 18px;">folder</span>
                    </div>
                    <div>
                        <div style="font-weight: 600; color: #2c3e50; font-size: 0.9rem;">${catalog.name}</div>
                        <div style="font-size: 0.75rem; color: #999;">ID: ${catalog.id || '-'}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 1rem; text-align: center; vertical-align: middle;">
                <span style="background: #f5f5f5; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; color: #666;">
                    ${catalog.products?.length || 0} productos
                </span>
            </td>
            <td style="padding: 1rem; text-align: right; vertical-align: middle;">
                <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <button class="btn-icon" onclick="manageCatalog('${catalog.id}')" title="Gestionar Productos" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #ddd; border-radius: 4px; color: #1565c0; cursor: pointer;">
                        <span class="material-icons" style="font-size: 18px;">inventory_2</span>
                    </button>
                    <button class="btn-icon" onclick="previewCatalog('${catalog.id}')" title="Previsualizar" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #ddd; border-radius: 4px; color: #666; cursor: pointer;">
                        <span class="material-icons" style="font-size: 18px;">visibility</span>
                    </button>
                    <button class="btn-icon" onclick="editCatalog('${catalog.id}')" title="Editar" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #ddd; border-radius: 4px; color: #666; cursor: pointer;">
                        <span class="material-icons" style="font-size: 18px;">edit</span>
                    </button>
                    <button class="btn-icon" onclick="exportCatalog('${catalog.id}')" title="Exportar Excel" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #ddd; border-radius: 4px; color: #2e7d32; cursor: pointer;">
                        <span class="material-icons" style="font-size: 18px;">download</span>
                    </button>
                    <button class="btn-icon" onclick="deleteCatalog('${catalog.id}')" title="Eliminar" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #fee2e2; border-radius: 4px; color: #ef4444; cursor: pointer;">
                        <span class="material-icons" style="font-size: 18px;">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    tableHtml += `</tbody></table>`;
    grid.innerHTML = tableHtml;
}

// Preview Catalog Function
window.previewCatalog = function (catalogId) {
    const url = `/catalog/${catalogId}`;
    window.open(url, '_blank');
};

// Back to Catalogs List
window.backToCatalogs = function () {
    if (typeof showSection === 'function') {
        showSection('catalogsView');
    } else {
        document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
        document.getElementById('catalogsView').style.display = 'block';
    }
    // Clear current catalog context
    currentCatalogId = null;
};

// Open create catalog modal
window.openCreateCatalogModal = function () {
    const modal = document.getElementById('createCatalogModal');
    if (!modal) return;

    // Show all fields (In case they were hidden by Add Mode)
    document.querySelectorAll('.catalog-meta-field').forEach(el => el.style.display = 'block');

    const title = modal.querySelector('.modal-title');
    const btn = modal.querySelector('.modal-footer .btn-primary');
    if (title) title.textContent = 'Crear Nuevo Catálogo';
    if (btn) {
        btn.innerHTML = '<span class="material-icons" style="font-size: 16px;">add</span> Crear Catálogo';
        btn.onclick = createCatalog; // Reset to Create
    }

    // Reset inputs
    document.getElementById('catalogName').value = '';
    document.getElementById('catalogCustomTitle').value = '';
    document.getElementById('catalogCustomText').value = '2026';
    document.getElementById('catalogBannerImage').value = '';

    loadProductsIntoModal();
    modal.classList.add('active');
};

// Open Add To Catalog Modal
window.openAddToCatalogModal = function () {
    const modal = document.getElementById('createCatalogModal');
    if (!modal) return;

    // Hide Meta fields
    document.querySelectorAll('.catalog-meta-field').forEach(el => el.style.display = 'none');

    const title = modal.querySelector('.modal-title');
    const btn = modal.querySelector('.modal-footer .btn-primary');
    if (title) title.textContent = 'Agregar Productos al Catálogo';
    if (btn) {
        btn.innerHTML = '<span class="material-icons" style="font-size: 16px;">save</span> Agregar Seleccionados';
        btn.onclick = addToCatalog;
    }

    // Load ALL products (or filter? For now load all)
    // We could visually mark those already in catalog?
    loadProductsIntoModal();

    // Mark existing as checked and disabled?
    const existingIds = currentCatalogProducts.map(p => String(p.id !== undefined ? p.id : p.ID));
    setTimeout(() => {
        document.querySelectorAll('.product-checkbox').forEach(cb => {
            if (existingIds.includes(cb.value)) {
                cb.checked = true;
                cb.disabled = true;
                cb.closest('.product-checkbox-item').style.opacity = '0.6';
            }
        });
    }, 100);

    modal.classList.add('active');
};

// Add to Catalog
async function addToCatalog(e) {
    if (e) e.preventDefault();

    // Get checked but NOT disabled (new ones)
    const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
        .filter(cb => !cb.disabled)
        .map(cb => cb.value);

    if (selectedProducts.length === 0) {
        alert('No has seleccionado nuevos productos.');
        return;
    }

    try {
        const response = await fetch(`/api/catalogs/${currentCatalogId}/add-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: selectedProducts })
        });
        const result = await response.json();

        if (result.success) {
            alert(result.message);
            closeCreateCatalogModal();
            manageCatalog(currentCatalogId); // Reload
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        alert('Error conectando al servidor');
    }
}


// Close create catalog modal
window.closeCreateCatalogModal = function () {
    const modal = document.getElementById('createCatalogModal');
    if (modal) {
        modal.classList.remove('active');
        // Reset styles
        document.querySelectorAll('.catalog-meta-field').forEach(el => el.style.display = 'block');
    }
};

// Load products into modal
function loadProductsIntoModal() {
    const container = document.getElementById('catalogProductsList');
    if (!container) return;

    const products = window.products || [];
    container.innerHTML = products.map(product => {
        const image = product.image || (product.variants?.[0]?.image) || '';
        const price = product.basePrice || product.price || 0;
        return `
            <label class="product-checkbox-item">
                <input type="checkbox" value="${product.id}" class="product-checkbox">
                <img src="${image}" alt="${product.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22%3E%3Crect fill=%22%23ddd%22 width=%2250%22 height=%2250%22/%3E%3C/svg%3E'">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-meta">${product.category || 'Sin categoría'} • Bs ${price}</div>
                </div>
            </label>
        `;
    }).join('');
    updateSelectedCount();
}

// Filter and Toggle functions
window.filterCatalogProducts = function () {
    const searchTerm = document.getElementById('catalogProductSearch').value.toLowerCase();
    document.querySelectorAll('.product-checkbox-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(searchTerm) ? 'flex' : 'none';
    });
};

window.toggleAllCatalogProducts = function () {
    const selectAll = document.getElementById('selectAllCatalogProducts');
    document.querySelectorAll('.product-checkbox').forEach(cb => {
        if (!cb.disabled && cb.closest('.product-checkbox-item').style.display !== 'none') {
            cb.checked = selectAll.checked;
        }
    });
    updateSelectedCount();
};

function updateSelectedCount() {
    const count = document.querySelectorAll('.product-checkbox:checked').length;
    const countEl = document.getElementById('selectedProductsCount');
    if (countEl) countEl.textContent = `${count} seleccionado(s)`;
}

// Create catalog (Original)
async function createCatalog(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('catalogName').value.trim();
    const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked')).map(cb => cb.value);

    if (!name || selectedProducts.length === 0) {
        alert('Nombre y al menos un producto requeridos.');
        return;
    }

    // Banner Logic
    const bannerInput = document.getElementById('catalogBannerImage');
    let bannerImage = null;
    if (bannerInput && bannerInput.files && bannerInput.files[0]) {
        try {
            bannerImage = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(bannerInput.files[0]);
            });
        } catch (e) { }
    }

    try {
        const response = await fetch('/api/catalogs/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                catalogName: name,
                productIds: selectedProducts,
                customTitle: document.getElementById('catalogCustomTitle').value.trim(),
                customText: document.getElementById('catalogCustomText').value.trim(),
                bannerImage: bannerImage
            })
        });
        const result = await response.json();
        if (result.success) {
            alert('Catálogo creado');
            closeCreateCatalogModal();
            loadCatalogs();
        } else alert(result.message);
    } catch (e) { alert('Error creando catálogo'); }
}

// Edit Catalog (Meta)
window.editCatalog = function (catalogId) {
    const catalog = catalogs.find(c => c.id === catalogId);
    if (!catalog) return;
    openCreateCatalogModal();
    // Rename to Edit Mode
    const modal = document.getElementById('createCatalogModal');
    modal.querySelector('.modal-title').textContent = 'Editar Catálogo';
    document.getElementById('catalogName').value = catalog.name;
    // ... logic for checking products ...
    const productIds = (catalog.products || []).map(p => String(p.id !== undefined ? p.id : p.ID));
    document.querySelectorAll('.product-checkbox').forEach(cb => {
        cb.checked = productIds.includes(cb.value);
    });
};

// Manage Catalog
window.manageCatalog = async function (catalogId) {
    currentCatalogId = catalogId;

    if (typeof showSection === 'function') {
        showSection('catalogDetailView');
    } else {
        document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
        document.getElementById('catalogDetailView').style.display = 'block';
    }

    document.getElementById('catalogDetailTitle').textContent = 'Cargando...';
    const tbody = document.getElementById('catalogDetailTableBody');
    if (tbody) tbody.innerHTML = '';

    try {
        const response = await fetch(`/api/catalogs/${catalogId}/products`);
        const data = await response.json();

        if (data.success) {
            currentCatalogProducts = data.products || [];
            console.log('Catalog data:', data);

            // DEBUG ALERT (INSPECT DATA)
            // if (currentCatalogProducts.length > 0) {
            //     // Safe stringify
            //     try {
            //         alert('Primer Producto: ' + JSON.stringify(currentCatalogProducts[0]));
            //     } catch (e) { alert('Error leyendo datos producto'); }
            // }

            const catalogName = data.metadata?.title || catalogId.replace(/_/g, ' ');
            document.getElementById('catalogDetailTitle').textContent = `Detalle: ${catalogName}`;

            // Render Products
            const tbody = document.getElementById('catalogDetailTableBody');
            if (!tbody) {
                console.error('CRITICAL: tbody catalogDetailTableBody not found!');
                // alert('Error UI: Tabla no encontrada');
                return;
            }

            console.log('Rendering products:', currentCatalogProducts.length);

            if (currentCatalogProducts.length === 0) {
                document.getElementById('catalogDetailEmpty').style.display = 'block';
                tbody.innerHTML = '';
            } else {
                document.getElementById('catalogDetailEmpty').style.display = 'none';
                if (tbody) {
                    try {
                        const rows = currentCatalogProducts.map(p => {
                            if (!p) return '';
                            // Robust Data Extraction
                            const image = p.image || (p.variants && p.variants[0] ? p.variants[0].image : '') || (p.colors && p.colors[0] && p.colors[0].images ? p.colors[0].images[0] : '') || '';
                            const sku = p.sku || p.SKU || (p.colors && p.colors[0] ? p.colors[0].sku : '') || (p.variants && p.variants[0] ? p.variants[0].sku : '') || '-';
                            const price = p.basePrice || p['Precio Base'] || p.price || (p.colors && p.colors[0] ? p.colors[0].price : '') || 0;

                            return `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 0.75rem;">
                                    <img src="${image}" width="40" height="40" style="object-fit: cover; border-radius: 4px; background: #f0f0f0;" onerror="this.style.display='none'">
                                </td>
                                <td style="padding: 0.75rem;">
                                    <div style="font-weight: 500;">${p.name || p.Nombre || 'Sin Nombre'}</div>
                                    <div style="font-size: 0.75rem; color: #888;">${p.category || p.Categoría || '-'}</div>
                                </td>
                                <td style="padding: 0.75rem;">${sku}</td>
                                <td style="padding: 0.75rem;">Bs ${price}</td>
                                <td style="padding: 0.75rem;">
                                    <button class="btn-icon" style="color: #666;" title="Editar en Catálogo" onclick="editCatalogProduct('${p.id || p.ID}')">
                                        <span class="material-icons" style="font-size: 18px;">edit</span>
                                    </button>
                                </td>
                            </tr>
                        `}).join('');

                        tbody.innerHTML = rows;
                    } catch (renderError) {
                        console.error('Render Error', renderError);
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
        alert('Error cargando catálogo');
    }
};

// Edit Catalog Product
window.editCatalogProduct = function (productId) {
    const product = currentCatalogProducts.find(p => String(p.id || p.ID) === String(productId));
    if (!product) { alert('Producto no encontrado'); return; }

    // Use admin.js helper to open and reset modal
    if (typeof window.openModal === 'function') {
        window.openModal(); // Opens and clears form
    } else {
        // Fallback
        document.getElementById('productModal').classList.add('active');
        if (typeof window.resetProductModal === 'function') window.resetProductModal();
    }

    // Populate Form using admin.js helper
    if (typeof window.populateProductModal === 'function') {
        window.populateProductModal(product);
    } else {
        // Fallback manual population
        document.getElementById('productName').value = product.name || product.Nombre || '';
        document.getElementById('productCategory').value = product.category || product.Categoría || '';
        document.getElementById('prodBasePrice').value = product.basePrice || product['Precio Base'] || 0;
    }

    // Change Save Button to override default admin save
    // The button is in the modal footer, likely outside the form but linked via form attribute,
    // or just a button in .modal-footer
    const modalFooter = document.querySelector('#productModal .modal-footer');
    const saveBtn = modalFooter ? modalFooter.querySelector('button.btn-primary') : null;

    if (saveBtn) {
        // Store original state
        if (!saveBtn.dataset.originalText) saveBtn.dataset.originalText = saveBtn.textContent;
        // const originalOnclick is not easily accessible if attached via addEventListener
        // But we can clone the button to remove listeners, or use a flag.

        // Better approach: Change what the submit handler calls.
        // admin.js form listener calls saveProduct().
        // We can override saveProduct locally or intercept.

        // Let's replace the button logic temporarily.
        // Since admin.js adds a submit listener to the form, we can't easily remove it.
        // But we can change the form's onsubmit or add a capturing listener.

        // Instead of hacking listeners, let's use a global flag or override window.saveProduct temporarily?
        // No, that's risky.

        // Let's Clone the button to strip listeners!
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);

        newBtn.textContent = 'Guardar en Catálogo';
        newBtn.onclick = function(e) {
            e.preventDefault();
            saveCatalogProduct(product, newBtn);
        };

        // Handle Close to reset button (restore original button by reloading page? or just re-cloning from template?)
        // Since this is a SPA-like, we should restore it.
        const restoreButton = () => {
             // We need to restore the original button behavior which was triggering saveProduct() via form submit.
             // The original button had a listener attached in admin.js.
             // Since we cloned it, we lost that listener.
             // We can re-create the button and re-attach the listener?
             // Or better: We simply reload the page or tell the user to refresh? No.

             // Let's just create a new button that calls window.saveProduct() on click.
             const restoredBtn = newBtn.cloneNode(true);
             restoredBtn.textContent = newBtn.dataset.originalText || 'Guardar Producto';
             restoredBtn.onclick = null; // Clear our handler
             // Re-attach to form submit? admin.js attached to form 'submit'.
             // If we make this button type='submit', it will trigger form submit.
             // And we need to make sure form submit calls window.saveProduct().
             // admin.js: productForm.addEventListener('submit', ...)

             // Wait, if we replaced the button, the form listener is still on the FORM.
             // So clicking a type="submit" button will trigger the form listener.
             restoredBtn.type = 'submit';
             newBtn.parentNode.replaceChild(restoredBtn, newBtn);
        };

        const closeModalBtns = document.querySelectorAll('#productModal .close-modal, #productModal .btn-secondary');
        closeModalBtns.forEach(btn => {
            const oldClick = btn.onclick;
            btn.onclick = function(e) {
                if(oldClick) oldClick(e);
                restoreButton();
                document.getElementById('productModal').classList.remove('active');
                // Remove this temporary listener to avoid stacking
                btn.onclick = oldClick;
            };
        });
    }
};

async function saveCatalogProduct(originalProduct, saveBtnElement) {
    if (saveBtnElement) saveBtnElement.disabled = true;

    // Get Data using admin.js helper
    let updatedData = {};
    if (typeof window.getProductDataFromForm === 'function') {
        updatedData = window.getProductDataFromForm();
    } else {
        alert('Error: Función getProductDataFromForm no encontrada.');
        if (saveBtnElement) saveBtnElement.disabled = false;
        return;
    }

    // Merge with original ID
    const productToSave = {
        ...updatedData,
        id: originalProduct.id // Keep original Catalog Product ID
    };

    try {
        const response = await fetch(`/api/catalogs/${currentCatalogId}/update-product`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: productToSave })
        });
        const res = await response.json();
        if (res.success) {
            alert('Producto actualizado en el catálogo');
            document.getElementById('productModal').classList.remove('active');

            // Restore button if needed (though closeModal usually handles it if logic is correct)
            // But since we cloned the button, we rely on the closeModal handler we attached earlier to restore it.
            // We can also trigger a reload of the catalog view

            manageCatalog(currentCatalogId); // Reload
        } else {
            alert('Error: ' + res.message);
        }
    } catch (e) { alert('Error de conexión'); }
}


// Export catalog
window.exportCatalog = function (catalogId) {
    const catalog = catalogs.find(c => c.id === catalogId);
    if (!catalog || !catalog.products || catalog.products.length === 0) {
        alert('Este catálogo está vacío o no existe.');
        return;
    }

    const catalogProducts = catalog.products;
    const excelData = [];

    // Add headers
    excelData.push([
        'ID', 'Nombre', 'Categoría', 'Precio', 'Precio Original', 'Link', 'Descripción', 'Badge', 'Almacenamiento',
        'SKU1', 'Color1', 'Link1', 'Imágenes1', 'Hex1',
        'SKU2', 'Color2', 'Link2', 'Imágenes2', 'Hex2'
    ]);

    // Add product rows
    catalogProducts.forEach(p => {
        const row = [];
        row.push(p.id);
        row.push(p.name);
        row.push(p.category);
        row.push(p.basePrice || p.price);
        row.push(p.originalPrice || 0);
        row.push(p.link || '');
        row.push(p.description || '');
        row.push(p.badge || '');
        row.push(''); // Storage
        // Variants (simplified)
        if (p.variants && p.variants.length) {
            p.variants.forEach(v => {
                row.push(v.sku, v.color, v.link, v.image, v.hex);
            });
        }
        excelData.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    const catalogName = catalog.name.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Catalogo_${catalogName}.xlsx`);
};

// Delete catalog (Same as before)
window.deleteCatalog = async function (catalogId) {
    if (!confirm('¿Eliminar catálogo permanentemente?')) return;
    try {
        await fetch('/api/catalogs/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ catalogId })
        });
        loadCatalogs();
    } catch (e) { }
};

document.addEventListener('DOMContentLoaded', function () {
    initCatalogSystem();
    const modal = document.getElementById('createCatalogModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeCreateCatalogModal();
        });
    }
    // ensure change listener for checks
    document.addEventListener('change', function (e) {
        if (e.target.classList.contains('product-checkbox')) updateSelectedCount();
    });
});
