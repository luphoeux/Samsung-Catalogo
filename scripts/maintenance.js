/**
 * Script Maestro de Mantenimiento de Datos
 * Combina y mejora los scripts de Julius
 * Por Antigravity AI
 */

const fs = require('fs');
const path = require('path');

// Importar scripts individuales
const dataUpdater = require('./update-data-placeholders');
const csvUpdater = require('./update-csv-placeholders');

// Configuración global
const CONFIG = {
    paths: {
        data: path.join(__dirname, '..', 'data.js'),
        csv: path.join(__dirname, '..', 'products_export.csv'),
        colorVariables: path.join(__dirname, '..', 'color-variables.js'),
        backupDir: path.join(__dirname, '..', 'backups')
    },
    placeholders: {
        image: "https://placehold.co/600x600/ffffff/ffffff.png",
        hex: "#111111",
        defaultColor: "Default"
    }
};

/**
 * Crear directorio de backups si no existe
 */
function ensureBackupDirectory() {
    if (!fs.existsSync(CONFIG.paths.backupDir)) {
        fs.mkdirSync(CONFIG.paths.backupDir, { recursive: true });
        console.log(`📁 Directorio de backups creado: ${CONFIG.paths.backupDir}`);
    }
}

/**
 * Crear backup con timestamp
 */
function createTimestampedBackup(filePath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = path.basename(filePath);
    const backupPath = path.join(CONFIG.paths.backupDir, `${fileName}.${timestamp}.backup`);

    if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`💾 Backup creado: ${backupPath}`);
        return backupPath;
    }
    return null;
}

/**
 * Sincronizar colores entre data.js y color-variables.js
 */
function syncColors() {
    console.log('\n🎨 Sincronizando colores...\n');

    try {
        // Leer data.js
        const dataContent = fs.readFileSync(CONFIG.paths.data, 'utf8');
        const products = dataUpdater.extractProductsFromFile(dataContent);

        // Extraer todos los colores únicos
        const colorsMap = new Map();

        products.forEach(product => {
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    if (variant.color && variant.hex) {
                        colorsMap.set(variant.color, variant.hex);
                    }
                });
            }
        });

        console.log(`✓ ${colorsMap.size} colores únicos encontrados`);

        // Leer color-variables.js actual
        let existingColors = {};
        if (fs.existsSync(CONFIG.paths.colorVariables)) {
            const colorContent = fs.readFileSync(CONFIG.paths.colorVariables, 'utf8');
            const match = colorContent.match(/var colorVariables = ({[\s\S]*?});/);
            if (match) {
                existingColors = eval('(' + match[1] + ')');
            }
        }

        // Combinar colores (mantener existentes, agregar nuevos)
        const mergedColors = { ...existingColors };
        let newColorsCount = 0;

        colorsMap.forEach((hex, color) => {
            if (!mergedColors[color]) {
                mergedColors[color] = hex;
                newColorsCount++;
                console.log(`  + Nuevo color: ${color} (${hex})`);
            }
        });

        // Escribir archivo actualizado
        const colorVarsContent = `var colorVariables = ${JSON.stringify(mergedColors, null, 4)};\n\nif (typeof module !== 'undefined') module.exports = colorVariables;`;
        fs.writeFileSync(CONFIG.paths.colorVariables, colorVarsContent);

        console.log(`\n✅ Sincronización completada:`);
        console.log(`   - Total de colores: ${Object.keys(mergedColors).length}`);
        console.log(`   - Colores nuevos: ${newColorsCount}`);

    } catch (error) {
        console.error('❌ Error al sincronizar colores:', error.message);
    }
}

/**
 * Validar integridad de datos
 */
function validateDataIntegrity() {
    console.log('\n🔍 Validando integridad de datos...\n');

    try {
        const dataContent = fs.readFileSync(CONFIG.paths.data, 'utf8');
        const products = dataUpdater.extractProductsFromFile(dataContent);

        let issues = [];

        products.forEach(product => {
            // Validar campos requeridos
            if (!product.id) issues.push(`Producto sin ID: ${JSON.stringify(product).slice(0, 50)}...`);
            if (!product.name) issues.push(`Producto ID ${product.id} sin nombre`);
            if (!product.category) issues.push(`Producto ID ${product.id} sin categoría`);

            // Validar variantes
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach((variant, idx) => {
                    if (!variant.color) {
                        issues.push(`Producto ID ${product.id}, variante ${idx + 1} sin color`);
                    }
                    if (!variant.hex || !/^#[0-9A-Fa-f]{6}$/.test(variant.hex)) {
                        issues.push(`Producto ID ${product.id}, variante "${variant.color}" con hex inválido: ${variant.hex}`);
                    }
                });
            }

            // Validar URLs de imágenes
            if (product.image && !product.image.startsWith('http')) {
                issues.push(`Producto ID ${product.id} con URL de imagen inválida: ${product.image}`);
            }
        });

        if (issues.length === 0) {
            console.log('✅ No se encontraron problemas de integridad');
        } else {
            console.log(`⚠️ Se encontraron ${issues.length} problema(s):\n`);
            issues.slice(0, 20).forEach(issue => console.log(`   - ${issue}`));
            if (issues.length > 20) {
                console.log(`   ... y ${issues.length - 20} más`);
            }
        }

        return issues;

    } catch (error) {
        console.error('❌ Error al validar integridad:', error.message);
        return [];
    }
}

/**
 * Generar reporte de estadísticas
 */
function generateStats() {
    console.log('\n📊 Generando estadísticas...\n');

    try {
        const dataContent = fs.readFileSync(CONFIG.paths.data, 'utf8');
        const products = dataUpdater.extractProductsFromFile(dataContent);

        // Estadísticas por categoría
        const categoryStats = {};
        const colorStats = {};
        let totalVariants = 0;
        let productsWithoutVariants = 0;

        products.forEach(product => {
            // Por categoría
            categoryStats[product.category] = (categoryStats[product.category] || 0) + 1;

            // Variantes
            if (product.variants && product.variants.length > 0) {
                totalVariants += product.variants.length;
                product.variants.forEach(v => {
                    if (v.color) {
                        colorStats[v.color] = (colorStats[v.color] || 0) + 1;
                    }
                });
            } else {
                productsWithoutVariants++;
            }
        });

        console.log('📈 Estadísticas Generales:');
        console.log(`   - Total de productos: ${products.length}`);
        console.log(`   - Total de variantes: ${totalVariants}`);
        console.log(`   - Productos sin variantes: ${productsWithoutVariants}`);
        console.log(`   - Promedio variantes/producto: ${(totalVariants / products.length).toFixed(2)}`);

        console.log('\n📦 Por Categoría:');
        Object.entries(categoryStats)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, count]) => {
                console.log(`   - ${cat}: ${count} producto(s)`);
            });

        console.log('\n🎨 Top 10 Colores más usados:');
        Object.entries(colorStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([color, count]) => {
                console.log(`   - ${color}: ${count} variante(s)`);
            });

    } catch (error) {
        console.error('❌ Error al generar estadísticas:', error.message);
    }
}

/**
 * Menú principal
 */
function showMenu() {
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   🛠️  HERRAMIENTAS DE MANTENIMIENTO DE DATOS   ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    console.log('Comandos disponibles:');
    console.log('  1. update-data [min] [max]  - Actualizar data.js con placeholders');
    console.log('  2. update-csv [min] [max]   - Actualizar CSV con placeholders');
    console.log('  3. sync-colors              - Sincronizar colores entre archivos');
    console.log('  4. validate                 - Validar integridad de datos');
    console.log('  5. stats                    - Generar estadísticas');
    console.log('  6. backup                   - Crear backup de todos los archivos');
    console.log('  7. full-update [min] [max]  - Ejecutar todo (data + csv + sync)');
    console.log('\nEjemplo:');
    console.log('  node maintenance.js full-update 3 102\n');
}

/**
 * Crear backup completo
 */
function createFullBackup() {
    console.log('\n💾 Creando backup completo...\n');
    ensureBackupDirectory();

    const files = [
        CONFIG.paths.data,
        CONFIG.paths.csv,
        CONFIG.paths.colorVariables
    ];

    files.forEach(file => {
        if (fs.existsSync(file)) {
            createTimestampedBackup(file);
        }
    });

    console.log('\n✅ Backup completo creado');
}

/**
 * Actualización completa
 */
function fullUpdate(min = 3, max = 102) {
    console.log('\n🚀 ACTUALIZACIÓN COMPLETA\n');
    console.log(`Rango: ID ${min} - ${max}\n`);

    // 1. Backup
    createFullBackup();

    // 2. Actualizar data.js
    console.log('\n' + '='.repeat(60));
    dataUpdater.updateDataFile();

    // 3. Actualizar CSV
    console.log('\n' + '='.repeat(60));
    csvUpdater.updateCSVFile();

    // 4. Sincronizar colores
    console.log('\n' + '='.repeat(60));
    syncColors();

    // 5. Validar
    console.log('\n' + '='.repeat(60));
    validateDataIntegrity();

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ ACTUALIZACIÓN COMPLETA FINALIZADA\n');
}

// Ejecutar comando
if (require.main === module) {
    const command = process.argv[2];

    if (!command) {
        showMenu();
        process.exit(0);
    }

    switch (command) {
        case 'update-data':
            const dataMin = parseInt(process.argv[3]) || 3;
            const dataMax = parseInt(process.argv[4]) || 102;
            dataUpdater.updateDataFile();
            break;

        case 'update-csv':
            const csvMin = parseInt(process.argv[3]) || 3;
            const csvMax = parseInt(process.argv[4]) || 102;
            csvUpdater.updateCSVFile();
            break;

        case 'sync-colors':
            syncColors();
            break;

        case 'validate':
            validateDataIntegrity();
            break;

        case 'stats':
            generateStats();
            break;

        case 'backup':
            createFullBackup();
            break;

        case 'full-update':
            const min = parseInt(process.argv[3]) || 3;
            const max = parseInt(process.argv[4]) || 102;
            fullUpdate(min, max);
            break;

        default:
            console.log(`❌ Comando desconocido: ${command}`);
            showMenu();
    }
}

module.exports = {
    syncColors,
    validateDataIntegrity,
    generateStats,
    createFullBackup,
    fullUpdate
};
