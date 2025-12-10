const fs = require('fs');

// Read data.js
const dataContent = fs.readFileSync('data.js', 'utf8');

// Extract the products array
const productsMatch = dataContent.match(/var products = (\[[\s\S]*\]);/);
if (!productsMatch) {
    console.error('No se pudo encontrar el array de productos');
    process.exit(1);
}

const products = JSON.parse(productsMatch[1]);

// Extract all unique colors with their hex codes
const colorMap = new Map();

products.forEach(product => {
    if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach(variant => {
            if (variant.color && variant.hex) {
                const colorName = variant.color.trim();
                const hexCode = variant.hex.trim();

                // If we already have this color, check if hex matches
                if (colorMap.has(colorName)) {
                    const existing = colorMap.get(colorName);
                    if (existing !== hexCode) {
                        console.log(`⚠️  Color "${colorName}" tiene múltiples hex: ${existing} y ${hexCode}`);
                    }
                } else {
                    colorMap.set(colorName, hexCode);
                }
            }
        });
    }
});

// Sort colors alphabetically
const sortedColors = Array.from(colorMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

console.log('\n📊 Colores únicos encontrados:\n');
sortedColors.forEach(([color, hex]) => {
    console.log(`  ${color}: ${hex}`);
});

// Create color variables object
const colorVariables = {};
sortedColors.forEach(([color, hex]) => {
    colorVariables[color] = hex;
});

// Save to a new file
const colorVarsContent = `// Color Variables
// Este archivo contiene las variables globales de colores
var colorVariables = ${JSON.stringify(colorVariables, null, 4)};
`;

fs.writeFileSync('color-variables.js', colorVarsContent);

console.log(`\n✅ Se encontraron ${sortedColors.length} colores únicos`);
console.log('✅ Archivo color-variables.js creado');
