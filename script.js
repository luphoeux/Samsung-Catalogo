document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.getElementById('product-grid');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Check for Preview Mode
    const isPreview = sessionStorage.getItem('samsung_catalog_preview_active') === 'true';
    if (isPreview) {
        try {
            const previewData = sessionStorage.getItem('samsung_catalog_preview_data');
            if (previewData) {
                const rawProducts = JSON.parse(previewData);

                // Convert variants array structure to object structure expected by script.js
                const convertedProducts = rawProducts.map(p => {
                    const product = { ...p };

                    // If variants is an array, convert to object structure
                    if (Array.isArray(product.variants)) {
                        const colors = [];
                        const variants = {};
                        const colorCodes = {};

                        product.variants.forEach((v, index) => {
                            if (v.color) {
                                colors.push(v.color);
                                variants[v.color] = {
                                    sku: v.sku || '',
                                    image: v.image || ''
                                };
                                if (v.hex) {
                                    colorCodes[v.color] = v.hex;
                                }

                                // Set first variant as default
                                if (index === 0) {
                                    product.sku = v.sku || '';
                                    product.image = v.image || '';
                                }
                            }
                        });

                        product.colors = colors;
                        product.variants = variants;
                        product.colorCodes = colorCodes;
                    }

                    return product;
                });

                window.products = convertedProducts;
                console.log('Loaded products from Preview Data');

                // Show Banner
                const banner = document.createElement('div');
                banner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:#ff9800; color:white; text-align:center; padding:5px; z-index:9999; font-weight:bold;';
                banner.innerText = '⚠️ MODO DE PREVISUALIZACIÓN - Datos no guardados';
                document.body.prepend(banner);
                document.querySelector('header').style.top = '30px'; // Adjust header
                document.querySelector('.search-container-sticky').style.top = '30px'; // Adjust sticky search
            }
        } catch (e) { console.error('Preview data error', e); }
    }

    // Google Sheets CSV URL
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTuLe28pznqPjc7LrqZiDee4yxlO2w1KMhjuxP6-nd-FVM6_V6RrTCOHtnowZsjiOKE9H6YeZ4ycUOH/pub?gid=0&single=true&output=csv';

    // Initial Render - Show static data first if valid, otherwise skeleton
    if (typeof products !== 'undefined' && products.length > 0 && (products[0].image || isPreview)) {
        renderProducts(products);
    } else {
        renderSkeleton();
    }

    // Try to fetch updates only if NOT in preview mode
    if (!isPreview) {
        // fetchProducts();
    }

    // Update every 60 minutes
    // setInterval(fetchProducts, 60 * 60 * 1000);

    function fetchProducts() {
        console.log('Fetching product data...');
        fetch(CSV_URL)
            .then(response => response.text())
            .then(csvText => {
                const parsedProducts = parseCSV(csvText);
                if (parsedProducts && parsedProducts.length > 0) {
                    console.log('Products updated from Google Sheets');
                    // Update global products variable so search/filter uses the new data
                    if (typeof products !== 'undefined') {
                        // Update existing global variable
                        // We use Object.assign or array splice if we wanted to keep the reference, 
                        // but since it is a var, we can just reassign if we are in global scope.
                        // However, we are in a function. 
                        // To be safe and ensure we update the global variable that filterProducts uses:
                        window.products = parsedProducts;
                    } else {
                        window.products = parsedProducts;
                    }
                    renderProducts(parsedProducts);
                } else {
                    console.warn('Fetched data was empty or invalid');
                }
            })
            .catch(error => {
                console.error('Error fetching products:', error);
            });
    }

    function parseCSV(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const headers = parseCSVLine(lines[0]);
        const parsedProducts = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length !== headers.length) continue;

            const product = {};
            headers.forEach((header, index) => {
                let value = values[index];

                // Type conversion and JSON parsing
                if (header === 'id' || header === 'price' || header === 'originalPrice') {
                    value = Number(value);
                } else if (['storage', 'colorCodes'].includes(header)) {
                    try {
                        value = (value && value.trim() !== '') ? JSON.parse(value) : (header === 'colorCodes' ? {} : []);
                    } catch (e) {
                        value = header === 'colorCodes' ? {} : [];
                    }
                }
                product[header] = value;
            });

            // Build colors, variants, and colorCodes from individual columns
            const colors = [];
            const variants = {};
            const colorCodes = {};
            let defaultSku = '';
            let defaultImage = '';

            for (let variantNum = 1; variantNum <= 5; variantNum++) {
                const skuKey = `SKU${variantNum}`;
                const colorKey = `Color${variantNum}`;
                const imagenKey = `Imagen${variantNum}`;
                const hexKey = `Hex${variantNum}`;

                const sku = product[skuKey];
                const color = product[colorKey];
                const imagen = product[imagenKey];
                const hex = product[hexKey];

                // Only add variant if SKU, Color, and Image are present
                if (sku && sku.trim() !== '' && color && color.trim() !== '' && imagen && imagen.trim() !== '') {
                    colors.push(color);
                    variants[color] = {
                        sku: sku,
                        image: imagen
                    };

                    // Add hex code if provided
                    if (hex && hex.trim() !== '') {
                        colorCodes[color] = hex;
                    }

                    // First variant is the default
                    if (variantNum === 1) {
                        defaultSku = sku;
                        defaultImage = imagen;
                    }
                }

                // Remove the individual variant columns from the product object
                delete product[skuKey];
                delete product[colorKey];
                delete product[imagenKey];
                delete product[hexKey];
            }

            // Set the built arrays (Hex columns override colorCodes JSON)
            product.colors = colors;
            product.variants = variants;
            product.sku = defaultSku;
            product.image = defaultImage;

            // Merge hex codes from columns with existing colorCodes (columns have priority)
            product.colorCodes = { ...product.colorCodes, ...colorCodes };

            parsedProducts.push(product);
        }
        return parsedProducts;
    }

    function parseCSVLine(line) {
        const values = [];
        let currentValue = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (insideQuotes && line[i + 1] === '"') {
                    currentValue += '"';
                    i++;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue);
        return values;
    }

    // Filter Functionality
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            const category = btn.getAttribute('data-category');
            filterProducts(category, searchInput.value);
        });
    });

    // Search Functionality
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    searchInput.addEventListener('input', debounce((e) => {
        const activeCategory = document.querySelector('.filter-btn.active').getAttribute('data-category');
        filterProducts(activeCategory, e.target.value);
    }, 300));

    function filterProducts(category, searchTerm) {
        const term = searchTerm.toLowerCase();

        const filtered = products.filter(product => {
            const matchesCategory = category === 'all' || product.category === category;
            const matchesSearch = product.name.toLowerCase().includes(term);
            return matchesCategory && matchesSearch;
        });

        renderProducts(filtered);
    }

    // Search Placeholder Animation
    const searchPlaceholderTexts = [
        "Galaxy Z",
        "Galaxy Tab",
        "Monitor Gamer",
        "Lavadora",
        "Smart TV",
        "Refrigerador"
    ];

    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function typeWriter() {
        const currentText = searchPlaceholderTexts[textIndex];

        if (isDeleting) {
            searchInput.setAttribute('placeholder', currentText.substring(0, charIndex - 1));
            charIndex--;
            typeSpeed = 50;
        } else {
            searchInput.setAttribute('placeholder', currentText.substring(0, charIndex + 1));
            charIndex++;
            typeSpeed = 100;
        }

        if (!isDeleting && charIndex === currentText.length) {
            isDeleting = true;
            typeSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % searchPlaceholderTexts.length;
            typeSpeed = 500; // Pause before typing next
        }

        setTimeout(typeWriter, typeSpeed);
    }

    // Start animation
    typeWriter();

    // Back to Top Button Logic
    const backToTopBtn = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
            backToTopBtn.style.display = 'flex';
        } else {
            backToTopBtn.classList.remove('visible');
            setTimeout(() => {
                if (!backToTopBtn.classList.contains('visible')) {
                    backToTopBtn.style.display = 'none';
                }
            }, 300); // Wait for transition
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});

const colorMap = {
    "Sombra Azul": "#1C2E4A",
    "Sombra Plata": "#C0C0C0",
    "Negro Azabache": "#000000",
    "Menta": "#98FF98",
    "Plata Titanio": "#C0C0C0",
    "Negro Titanio": "#333333",
    "Violeta Titanio": "#8A2BE2",
    "Amarillo Titanio": "#FFD700",
    "Gris Titanio": "#808080",
    "Azul Intenso": "#0000FF",
    "Negro Intenso": "#000000",
    "Negro Onix": "#353839",
    "Gris Marmol": "#808080",
    "Violeta Cobalto": "#3D0C02",
    "Amarillo Ambar": "#FFBF00",
    "Cream": "#FFFDD0",
    "Phantom Black": "#000000",
    "Icy Blue": "#E0FFFF",
    "Graphite": "#41424C",
    "Lavender": "#E6E6FA",
    "Mint": "#98FF98",
    "Negro": "#000000"
};

function getHexColor(colorName, product = null) {
    if (product && product.colorCodes && product.colorCodes[colorName]) {
        return product.colorCodes[colorName];
    }
    return colorMap[colorName] || '#CCCCCC'; // Default gray if not found
}

function renderSkeleton() {
    const productGrid = document.getElementById('product-grid');
    productGrid.innerHTML = '';

    // Create 8 skeleton cards
    for (let i = 0; i < 8; i++) {
        const card = document.createElement('div');
        card.className = 'skeleton-card';
        card.innerHTML = `
            <div class="skeleton-image"></div>
            <div class="skeleton-content">
                <div class="skeleton-text title"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
                <div class="skeleton-button"></div>
            </div>
        `;
        productGrid.appendChild(card);
    }
}

let currentDisplayedProducts = [];
let displayedCount = 0;
const PRODUCTS_PER_PAGE = 8;
let observer;

function renderProducts(items) {
    const productGrid = document.getElementById('product-grid');

    // Reset if it's a new set of items (not just appending)
    // We can check if items is different from currentDisplayedProducts source
    // But for simplicity, let's assume if this function is called, we are resetting or filtering

    // If we are just appending, we should have a separate function or logic
    // But to keep it simple with existing calls:
    // We will assume renderProducts is called for a full reset (filter, search, initial load)

    productGrid.innerHTML = '';
    currentDisplayedProducts = items;
    displayedCount = 0;

    if (items.length === 0) {
        productGrid.innerHTML = '<div class="no-products-message">No se encontraron productos.</div>';
        return;
    }

    // Disconnect old observer if exists
    if (observer) {
        observer.disconnect();
    }

    // Render first batch
    loadMoreProducts();

    // Setup Intersection Observer for infinite scroll
    setupInfiniteScroll();
}

function loadMoreProducts() {
    const productGrid = document.getElementById('product-grid');
    const nextBatch = currentDisplayedProducts.slice(displayedCount, displayedCount + PRODUCTS_PER_PAGE);

    if (nextBatch.length === 0) return;

    const fragment = document.createDocumentFragment();

    nextBatch.forEach(product => {
        const card = createProductCard(product);
        fragment.appendChild(card);
    });

    productGrid.appendChild(fragment);

    displayedCount += nextBatch.length;
}

function setupInfiniteScroll() {
    const productGrid = document.getElementById('product-grid');

    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Load more when the sentinel (last element) is visible
                loadMoreProducts();

                // Update observer to watch the new last element
                updateObserver();
            }
        });
    }, {
        root: null,
        rootMargin: '100px', // Load a bit before reaching bottom
        threshold: 0.1
    });

    updateObserver();
}

function updateObserver() {
    if (!observer) return;

    // Unobserve everything first (simplest way, though slightly inefficient, but fine for this scale)
    observer.disconnect();

    const productGrid = document.getElementById('product-grid');
    const lastCard = productGrid.lastElementChild;

    if (lastCard && displayedCount < currentDisplayedProducts.length) {
        observer.observe(lastCard);
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Default to first color
    const firstColor = product.colors && product.colors.length > 0 ? product.colors[0] : '';

    const badgeHtml = product.badge ? `<span class="badge">${product.badge}</span>` : '';

    // Generate color dots HTML
    let colorsHtml = '';
    if (product.colors && product.colors.length > 0) {
        colorsHtml = `<div class="product-colors-container">
            <p class="color-label">Color: <span class="selected-color-name">${firstColor}</span></p>
            <div class="product-colors">
                ${product.colors.map((color, index) => {
            const variant = product.variants && product.variants[color];
            const variantImage = variant && variant.image ? variant.image : product.image;
            const variantSku = variant && variant.sku ? variant.sku : product.sku;

            // If no specific variant image, fallback to default logic (though for S3 links it might be static)
            // We use the variantImage if found, otherwise product.image
            const imageSrc = variantImage;

            return `
                    <span class="color-dot ${index === 0 ? 'active' : ''}" 
                          style="background-color: ${getHexColor(color, product)}" 
                          data-color="${color}"
                          data-image="${imageSrc}"
                          data-sku="${variantSku}"
                          onclick="changeProductColor(this, 'product-${product.id}')">
                    </span>
                    `;
        }).join('')}
            </div>
        </div>`;
    }

    card.id = `product-${product.id}`;
    card.innerHTML = `
        <div class="product-image-container">
            ${badgeHtml}
            <img src="${product.image}" alt="${product.name}" class="product-image" id="img-${card.id}" loading="lazy">
        </div>
        <div class="product-info">
            <p class="product-sku">${product.sku || ''}</p>
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description || ''}</p>
            
            ${colorsHtml}

            ${product.storage && product.storage.length > 0 ? `
            <div class="product-storage">
                ${product.storage.map((s, i) => `<span class="storage-badge ${i === product.storage.length - 1 ? 'active' : ''}">${s}</span>`).join('')}
            </div>
            ` : ''}
            
            <div class="price-container">
                ${product.originalPrice && product.originalPrice != 0 ? `<p class="original-price">Bs ${Number(product.originalPrice).toLocaleString()}</p>` : ''}
                ${product.price && product.price != 0 ? `<p class="product-price">Bs ${Number(product.price).toLocaleString()}</p>` : ''}
            </div>
            
            <button class="buy-btn" onclick="window.open('${product.link}', '_blank')">Más información</button>
        </div>
    `;
    // Experimental: Color rotation on hover (Desktop only)
    card.addEventListener('mouseenter', () => {
        // Check for desktop/hover capability
        if (window.matchMedia('(hover: hover)').matches) {
            const dots = card.querySelectorAll('.color-dot');
            if (dots.length < 2) return;

            // Clear any existing interval just in case
            if (card.dataset.rotationInterval) clearInterval(card.dataset.rotationInterval);

            const intervalId = setInterval(() => {
                const currentDots = card.querySelectorAll('.color-dot');
                let activeIndex = Array.from(currentDots).findIndex(d => d.classList.contains('active'));
                let nextIndex = (activeIndex + 1) % currentDots.length;

                // Check if rotation is paused due to manual interaction
                if (card.dataset.rotationPaused) return;

                // Trigger the color change
                changeProductColor(currentDots[nextIndex], card.id, true);
            }, 5000); // Rotates every 5 seconds

            card.dataset.rotationInterval = intervalId;
        }
    });

    card.addEventListener('mouseleave', () => {
        if (card.dataset.rotationInterval) {
            clearInterval(card.dataset.rotationInterval);
            delete card.dataset.rotationInterval;
        }
    });

    return card;
}

function changeProductColor(dot, cardId, isAuto = false) {
    // Update active dot
    const card = document.getElementById(cardId);
    if (!card) return;

    // Handle manual interaction pause logic
    if (!isAuto) {
        card.dataset.rotationPaused = 'true';

        // Clear existing timeout if any to reset the timer
        if (card.dataset.pauseTimeout) {
            clearTimeout(parseInt(card.dataset.pauseTimeout));
        }

        const timeoutId = setTimeout(() => {
            delete card.dataset.rotationPaused;
            delete card.dataset.pauseTimeout;
        }, 10000); // Pause for 10 seconds

        card.dataset.pauseTimeout = timeoutId;
    }

    const dots = card.querySelectorAll('.color-dot');
    dots.forEach(d => d.classList.remove('active'));
    dot.classList.add('active');

    // Update color name text
    const colorName = dot.getAttribute('data-color');
    const colorLabel = card.querySelector('.selected-color-name');
    if (colorLabel) colorLabel.textContent = colorName;

    // Update image with loading state
    const newImageSrc = dot.getAttribute('data-image');
    const img = card.querySelector('.product-image');
    const imageContainer = card.querySelector('.product-image-container');

    if (img && newImageSrc && img.src !== newImageSrc) {
        // Create or get loading overlay
        let loadingOverlay = imageContainer.querySelector('.product-image-loading');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'product-image-loading';
            loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
            imageContainer.appendChild(loadingOverlay);
        }

        // Show loading state
        img.classList.add('loading');
        loadingOverlay.classList.add('active');

        // Create new image to preload
        const tempImg = new Image();
        tempImg.onload = () => {
            img.src = newImageSrc;
            // Hide loading state after image loads
            setTimeout(() => {
                img.classList.remove('loading');
                loadingOverlay.classList.remove('active');
            }, 100);
        };
        tempImg.onerror = () => {
            // Hide loading even on error
            img.classList.remove('loading');
            loadingOverlay.classList.remove('active');
        };
        tempImg.src = newImageSrc;
    }

    // Update SKU
    const newSku = dot.getAttribute('data-sku');
    const skuEl = card.querySelector('.product-sku');
    if (skuEl && newSku) {
        skuEl.textContent = newSku;
    }
}
