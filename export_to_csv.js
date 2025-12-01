const fs = require('fs');
const path = require('path');

// Read data.js and extract products array
const dataPath = path.join(__dirname, 'data.js');
const dataContent = fs.readFileSync(dataPath, 'utf8');

// Extract products array from data.js
const productsMatch = dataContent.match(/const products = (\[[\s\S]*?\]);/);
if (!productsMatch) {
    console.error('Could not find products array in data.js');
    process.exit(1);
}

const products = eval(productsMatch[1]);

// CSV Headers with new format including Hex columns
const headers = [
    'id',
    'name',
    'category',
    'price',
    'originalPrice',
    'link',
    'description',
    'badge',
    'storage',
    'SKU1',
    'Color1',
    'Imagen1',
    'Hex1',
    'SKU2',
    'Color2',
    'Imagen2',
    'Hex2',
    'SKU3',
    'Color3',
    'Imagen3',
    'Hex3',
    'SKU4',
    'Color4',
    'Imagen4',
    'Hex4',
    'SKU5',
    'Color5',
    'Imagen5',
    'Hex5',
    'colorCodes'
];

// Function to escape CSV values
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// Build CSV content
let csvContent = headers.join(',') + '\n';

products.forEach(product => {
    const row = [];

    // Basic fields
    row.push(escapeCSV(product.id));
    row.push(escapeCSV(product.name));
    row.push(escapeCSV(product.category));
    row.push(escapeCSV(product.price));
    row.push(escapeCSV(product.originalPrice));
    row.push(escapeCSV(product.link));
    row.push(escapeCSV(product.description));
    row.push(escapeCSV(product.badge));
    row.push(escapeCSV(JSON.stringify(product.storage || [])));

    // Extract variants into separate columns
    const colors = product.colors || [];
    const variants = product.variants || {};
    const colorCodes = product.colorCodes || {};

    // Add up to 5 variants
    for (let i = 0; i < 5; i++) {
        if (i < colors.length) {
            const color = colors[i];
            const variant = variants[color] || {};
            const hexCode = colorCodes[color] || '';

            row.push(escapeCSV(variant.sku || ''));
            row.push(escapeCSV(color));
            row.push(escapeCSV(variant.image || ''));
            row.push(escapeCSV(hexCode));
        } else {
            // Empty columns for unused variants
            row.push('');
            row.push('');
            row.push('');
            row.push('');
        }
    }

    // colorCodes (keep for backward compatibility, but Hex columns have priority)
    row.push(escapeCSV(JSON.stringify(product.colorCodes || {})));

    csvContent += row.join(',') + '\n';
});

// Write to file
const outputPath = path.join(__dirname, 'products_export.csv');
fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log(`✅ CSV exported successfully to ${outputPath}`);
console.log(`📊 Total products: ${products.length}`);
console.log(`\n📋 CSV Format:`);
console.log(`   - Columns: ${headers.length}`);
console.log(`   - Variant columns: SKU1-5, Color1-5, Imagen1-5, Hex1-5 (20 columns total)`);
console.log(`   - Variant 1 is the default display variant`);
console.log(`\n💡 Import this CSV to your Google Sheet to update the data.`);
