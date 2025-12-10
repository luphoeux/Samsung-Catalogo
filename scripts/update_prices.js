const fs = require('fs');

// Read data.js
const dataContent = fs.readFileSync('data.js', 'utf8');

// Replace all price: 0 with price: 100000
// Replace all originalPrice: 0 with originalPrice: 200000
const updated = dataContent
    .replace(/"price": 0,/g, '"price": 100000,')
    .replace(/"originalPrice": 0,/g, '"originalPrice": 200000,');

// Write back
fs.writeFileSync('data.js', updated);

console.log('Precios actualizados correctamente!');
