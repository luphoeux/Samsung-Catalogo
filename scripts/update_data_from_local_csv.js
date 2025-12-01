// update_data_from_local_csv.js
// Reads the local CSV file (Tabla de productos Samsung Catálogo 2026 - Catalogo 2026.csv)
// and updates data.js with the parsed products, preserving existing prices when CSV has 0.

const fs = require('fs');
const path = require('path');

const dataJsPath = path.join(__dirname, '..', 'data.js');
const csvPath = path.join(__dirname, '..', 'Tabla de productos Samsung Catálogo 2026 - Catalogo 2026.csv');

console.log('Reading local CSV file:', csvPath);

function parseCSV(csvText, currentProducts = []) {
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
            if (header === 'id' || header === 'price' || header === 'originalPrice') {
                value = Number(value);
            } else if (header === 'storage') {
                try {
                    value = (value && value.trim() !== '') ? JSON.parse(value) : [];
                } catch (e) {
                    value = [];
                }
            }
            if (header !== 'colorCodes') {
                product[header] = value;
            }
        });

        // Preserve prices if CSV has 0 but we have a previous price
        if (product.price === 0 && currentProducts.length > 0) {
            const existing = currentProducts.find(p => p.id === product.id);
            if (existing && existing.price > 0) {
                product.price = existing.price;
                product.originalPrice = existing.originalPrice;
            }
        }

        // Build variants array
        const variants = [];
        let defaultSku = '';
        let defaultImage = '';
        for (let v = 1; v <= 5; v++) {
            const skuKey = `SKU${v}`;
            const colorKey = `Color${v}`;
            const imgKey = `Imagen${v}`;
            const hexKey = `Hex${v}`;
            const sku = product[skuKey];
            const color = product[colorKey];
            const img = product[imgKey];
            const hex = product[hexKey];
            if (sku && sku.trim() && color && color.trim() && img && img.trim()) {
                variants.push({
                    color: color,
                    hex: (hex && hex.trim()) ? hex : '#CCCCCC',
                    sku: sku,
                    image: img
                });
                if (v === 1) {
                    defaultSku = sku;
                    defaultImage = img;
                }
            }
            delete product[skuKey];
            delete product[colorKey];
            delete product[imgKey];
            delete product[hexKey];
        }
        product.variants = variants;
        delete product.colors;
        delete product.colorCodes;
        if (defaultSku) product.sku = defaultSku;
        if (defaultImage) product.image = defaultImage;
        parsedProducts.push(product);
    }
    return parsedProducts;
}

function parseCSVLine(line) {
    const values = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            values.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    values.push(cur);
    return values;
}

try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    let currentProducts = [];
    if (fs.existsSync(dataJsPath)) {
        const dataFile = fs.readFileSync(dataJsPath, 'utf8');
        const match = dataFile.match(/var products = (\[[\s\S]*?\]);/);
        if (match && match[1]) {
            currentProducts = JSON.parse(match[1]);
        }
    }
    const products = parseCSV(csvContent, currentProducts);
    const out = `var products = ${JSON.stringify(products, null, 4)};\n\nif (typeof module !== 'undefined') module.exports = products;`;
    fs.writeFileSync(dataJsPath, out);
    console.log(`Updated data.js with ${products.length} products from local CSV.`);
} catch (err) {
    console.error('Error updating data.js:', err);
}
