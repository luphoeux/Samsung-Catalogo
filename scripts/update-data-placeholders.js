/**
 * Script mejorado para actualizar productos con placeholders
 * Mejoras de Julius implementadas por Antigravity
 */

const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
    dataPath: path.join(__dirname, '..', 'data.js'),
    idRange: { min: 3, max: 102 },
    placeholders: {
        image: "https://placehold.co/600x600/ffffff/ffffff.png",
        hex: "#111111",
        defaultColor: "Default"
    }
};

/**
 * MEJORA 1: Función para extraer JSON de forma más robusta
 */
function extractProductsFromFile(fileContent) {
    try {
        // Buscar el inicio del array
        const startIndex = fileContent.indexOf('[');
        if (startIndex === -1) {
            throw new Error('No se encontró el inicio del array de productos');
        }

        // Buscar el final del array (último ] antes del module.exports)
        const endIndex = fileContent.lastIndexOf(']');
        if (endIndex === -1) {
            throw new Error('No se encontró el final del array de productos');
        }

        const jsonContent = fileContent.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonContent);
    } catch (error) {
        console.error('❌ Error al extraer productos:', error.message);
        throw error;
    }
}

/**
 * MEJORA 2: Función para validar producto antes de actualizar
 */
function validateProduct(product) {
    if (!product.id) {
        console.warn(`⚠️ Producto sin ID encontrado`);
        return false;
    }
    return true;
}

/**
 * MEJORA 3: Función para actualizar variantes de forma más inteligente
 */
function updateProductVariants(product) {
    const { placeholders } = CONFIG;

    // Si ya tiene variantes, actualizarlas
    if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
            variant.hex = variant.hex || placeholders.hex;
            variant.image = placeholders.image;
        });

        console.log(`  ✓ ${product.variants.length} variante(s) actualizada(s) para "${product.name}"`);
    } else {
        // Crear variante dummy solo si no existe
        const dummyVariant = {
            color: placeholders.defaultColor,
            hex: placeholders.hex,
            sku: product.sku || "",
            image: placeholders.image
        };

        product.variants = [dummyVariant];
        product.colors = [placeholders.defaultColor];

        console.log(`  + Variante dummy creada para "${product.name}"`);
    }

    // Actualizar imagen principal del producto
    product.image = placeholders.image;
}

/**
 * MEJORA 4: Función principal con mejor manejo de errores
 */
function updateDataFile() {
    console.log('🚀 Iniciando actualización de productos...\n');

    try {
        // Leer archivo
        if (!fs.existsSync(CONFIG.dataPath)) {
            throw new Error(`Archivo no encontrado: ${CONFIG.dataPath}`);
        }

        const fileContent = fs.readFileSync(CONFIG.dataPath, 'utf8');
        console.log('✓ Archivo data.js leído correctamente');

        // Extraer productos
        const products = extractProductsFromFile(fileContent);
        console.log(`✓ ${products.length} productos encontrados\n`);

        // Contador de actualizaciones
        let updatedCount = 0;
        let skippedCount = 0;

        // Actualizar productos en el rango especificado
        products.forEach(product => {
            if (!validateProduct(product)) {
                skippedCount++;
                return;
            }

            if (product.id >= CONFIG.idRange.min && product.id <= CONFIG.idRange.max) {
                console.log(`📝 Actualizando producto ID ${product.id}: "${product.name}"`);
                updateProductVariants(product);
                updatedCount++;
            }
        });

        // MEJORA 5: Crear backup antes de sobrescribir
        const backupPath = CONFIG.dataPath.replace('.js', '.backup.js');
        fs.writeFileSync(backupPath, fileContent);
        console.log(`\n💾 Backup creado en: ${backupPath}`);

        // Escribir archivo actualizado
        const newFileContent = `var products = ${JSON.stringify(products, null, 4)};\n\nif (typeof module !== 'undefined') module.exports = products;`;
        fs.writeFileSync(CONFIG.dataPath, newFileContent);

        // Resumen
        console.log('\n✅ Actualización completada:');
        console.log(`   - Productos actualizados: ${updatedCount}`);
        console.log(`   - Productos omitidos: ${skippedCount}`);
        console.log(`   - Total procesados: ${products.length}`);

    } catch (error) {
        console.error('\n❌ Error durante la actualización:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// MEJORA 6: Permitir ejecución con argumentos
if (require.main === module) {
    // Verificar si se pasaron argumentos personalizados
    const args = process.argv.slice(2);
    if (args.length >= 2) {
        CONFIG.idRange.min = parseInt(args[0]);
        CONFIG.idRange.max = parseInt(args[1]);
        console.log(`📌 Rango personalizado: ${CONFIG.idRange.min} - ${CONFIG.idRange.max}\n`);
    }

    updateDataFile();
}

module.exports = { updateDataFile, extractProductsFromFile, updateProductVariants };
