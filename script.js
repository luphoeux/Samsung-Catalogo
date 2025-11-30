document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.getElementById('product-grid');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Initial Render
    renderProducts(products);

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
                <h3 class="product-name">${product.name}</h3>
                <p class="product-sku">${product.sku || ''}</p>
                
                ${colorsHtml}

                ${product.storage && product.storage.length > 0 ? `
                <div class="product-storage">
                    ${product.storage.map((s, i) => `<span class="storage-badge ${i === product.storage.length - 1 ? 'active' : ''}">${s}</span>`).join('')}
                </div>
                ` : ''}
                
                <div class="price-container">
                    ${product.originalPrice ? `<p class="original-price">Bs ${product.originalPrice.toLocaleString()}</p>` : ''}
                    <p class="product-price">Bs ${product.price.toLocaleString()}</p>
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

    // Update image
    const newImageSrc = dot.getAttribute('data-image');
    const img = card.querySelector('.product-image');
    if (img && newImageSrc) {
        img.src = newImageSrc;
    }

    // Update SKU
    const newSku = dot.getAttribute('data-sku');
    const skuEl = card.querySelector('.product-sku');
    if (skuEl && newSku) {
        skuEl.textContent = newSku;
    }
}
