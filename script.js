document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.getElementById('product-grid');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Google Sheets CSV URL
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTuLe28pznqPjc7LrqZiDee4yxlO2w1KMhjuxP6-nd-FVM6_V6RrTCOHtnowZsjiOKE9H6YeZ4ycUOH/pub?gid=0&single=true&output=csv';

    // Initial Render - Show static data first (fastest)
    if (typeof products !== 'undefined') {
        renderProducts(products);
    }

    // Try to fetch updates
    fetchProducts();

    // Update every 60 minutes
    setInterval(fetchProducts, 60 * 60 * 1000);

    function fetchProducts() {
        console.log('Fetching product data...');
        fetch(CSV_URL)
            .then(response => response.text())
            .then(csvText => {
                const parsedProducts = parseCSV(csvText);
                if (parsedProducts && parsedProducts.length > 0) {
                    console.log('Products updated from Google Sheets');
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
    searchInput.addEventListener('input', (e) => {
        const activeCategory = document.querySelector('.filter-btn.active').getAttribute('data-category');
        filterProducts(activeCategory, e.target.value);
    });

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

function renderProducts(items) {
    const productGrid = document.getElementById('product-grid');
    productGrid.innerHTML = '';

    if (items.length === 0) {
        productGrid.innerHTML = '<div class="no-products-message">No products found.</div>';
        return;
    }

    items.forEach(product => {
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
                <img src="${product.image}" alt="${product.name}" class="product-image" id="img-${card.id}">
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

        productGrid.appendChild(card);
    });
}

function changeProductColor(dot, cardId) {
    // Update active dot
    const card = document.getElementById(cardId);
    if (!card) return;

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
