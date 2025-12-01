const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'products_export.csv');
const dataJsPath = path.join(__dirname, '..', 'data.js');

try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const products = parseCSV(csvContent);

    const fileContent = `var products = ${JSON.stringify(products, null, 4)};\n\nif (typeof module !== 'undefined') module.exports = products;`;
    fs.writeFileSync(dataJsPath, fileContent);
    console.log(`Successfully updated data.js with ${products.length} products from CSV.`);

} catch (error) {
    console.error('Error updating data.js:', error);
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
            } else if (header === 'storage') {
                try {
                    value = (value && value.trim() !== '') ? JSON.parse(value) : [];
                } catch (e) {
                    value = [];
                }
            }

            // Skip colorCodes column if present
            if (header !== 'colorCodes') {
                product[header] = value;
            }
        });

        // Build variants array
        const variants = [];
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
                variants.push({
                    color: color,
                    hex: (hex && hex.trim() !== '') ? hex : '#CCCCCC',
                    sku: sku,
                    image: imagen
                });

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

        // Assign the new variants array
        product.variants = variants;

        // Clean up old properties if they exist in the source or were created temporarily
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
