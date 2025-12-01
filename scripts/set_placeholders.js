const fs = require('fs');
const path = require('path');

const dataJsPath = path.join(__dirname, '..', 'data.js');

try {
    // Read the current data.js file
    let fileContent = fs.readFileSync(dataJsPath, 'utf8');

    // Extract the JSON part
    // The file format is now: var products = [...]; \n\n if (typeof module...) ...
    // We need to extract everything between "var products = " and the first semicolon or newline that ends the json.
    // A simple way is to find the first "[" and the last "]" before the module check.

    const startIndex = fileContent.indexOf('[');
    // Find the last closing bracket before the module export check (or just lastIndexOf ']')
    const endIndex = fileContent.lastIndexOf(']');

    const jsonContent = fileContent.substring(startIndex, endIndex + 1);
    const products = JSON.parse(jsonContent);

    // Update products from ID 3 to 102
    products.forEach(product => {
        if (product.id >= 3 && product.id <= 102) {
            // Set default image for the product
            product.image = "https://placehold.co/600x600/ffffff/ffffff.png";

            // If the product has variants, update them too
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    variant.hex = "#111111";
                    variant.image = "https://placehold.co/600x600/ffffff/ffffff.png";
                });
            } else {
                // If no variants exist, create a dummy one so the color dot appears?
                // The user asked for a template of color #111111 and white image.
                // If there are no variants, maybe we should just set the main product image?
                // But usually the color dots come from variants.
                // Let's assume if there are variants, we update them. 
                // If not, we just update the main image as requested.
            }
        }
    });

    // Write back to data.js
    const newFileContent = `var products = ${JSON.stringify(products, null, 4)};\n\nif (typeof module !== 'undefined') module.exports = products;`;
    fs.writeFileSync(dataJsPath, newFileContent);
    console.log('Successfully updated products 3-102 with placeholder image and hex color.');

} catch (error) {
    console.error('Error updating data.js:', error);
}
