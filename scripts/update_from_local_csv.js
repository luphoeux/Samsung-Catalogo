const fs = require('fs');
const path = require('path');

const dataJsPath = path.join(__dirname, '..', 'data.js');
const csvFilePath = path.join(__dirname, '..', 'Tabla de productos Samsung Catálogo 2026 - Catalogo 2026.csv');

console.log(`Reading data from local CSV: ${csvFilePath}`);

try {
    if (!fs.existsSync(csvFilePath)) {
        console.error(`CSV file not found at ${csvFilePath}`);
        process.exit(1);
    }

    const csvData = fs.readFileSync(csvFilePath, 'utf8');

    let currentProducts = [];
    if (fs.existsSync(dataJsPath)) {
        try {
            // Read the file content and extract the JSON part
            const fileContent = fs.readFileSync(dataJsPath, 'utf8');
            const jsonMatch = fileContent.match(/var products = (\[[\s\S]*?\]);/);
            if (jsonMatch && jsonMatch[1]) {
                currentProducts = JSON.parse(jsonMatch[1]);
            }
        } catch (e) {
            console.log('Could not read existing data.js, starting fresh.');
        }
    }

    const products = parseCSV(csvData, currentProducts);
    const fileContent = `var products = ${JSON.stringify(products, null, 4)};\n\nif (typeof module !== 'undefined') module.exports = products;`;
    fs.writeFileSync(dataJsPath, fileContent);
    console.log(`Successfully updated data.js with ${products.length} products from local CSV.`);

} catch (error) {
    console.error('Error processing data:', error);
}

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

        // Preserve prices if they are 0 in CSV but exist in current data
        if (product.price === 0 && currentProducts.length > 0) {
            const existingProduct = currentProducts.find(p => p.id === product.id);
            if (existingProduct && existingProduct.price > 0) {
                product.price = existingProduct.price;
                product.originalPrice = existingProduct.originalPrice;
            }
        }

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

            // Check if we have valid SKU and Image
            if (sku && sku.trim() !== '' && imagen && imagen.trim() !== '') {
                // Always set default if it's the first one, regardless of color presence
                if (variantNum === 1) {
                    defaultSku = sku;
                    defaultImage = imagen;
                }

                // Only add to variants list if color is also present
                if (color && color.trim() !== '') {
                    variants.push({
                        color: color,
                        hex: (hex && hex.trim() !== '') ? hex : '#CCCCCC',
                        sku: sku,
                        image: imagen
                    });
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
