// reset_prices_to_zero.js
// This script sets price and originalPrice of all products in data.js to 0.
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data.js');

function loadData() {
    const content = fs.readFileSync(dataPath, 'utf8');
    const match = content.match(/var products = (\[[\s\S]*?\]);/);
    if (!match) {
        console.error('Could not find products array in data.js');
        process.exit(1);
    }
    const products = JSON.parse(match[1]);
    return { products, prefix: content.slice(0, match.index), suffix: content.slice(match.index + match[0].length) };
}

function saveData(products, prefix, suffix) {
    const newContent = `${prefix}var products = ${JSON.stringify(products, null, 4)};\n\nif (typeof module !== 'undefined') module.exports = products;${suffix}`;
    fs.writeFileSync(dataPath, newContent);
    console.log('All prices reset to 0 in data.js');
}

const { products, prefix, suffix } = loadData();
products.forEach(p => { p.price = 0; p.originalPrice = 0; });
saveData(products, prefix, suffix);
