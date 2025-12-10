/**
 * Script mejorado para actualizar CSV con placeholders
 * Mejoras de Julius implementadas por Antigravity
 */

const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
    csvPath: path.join(__dirname, '..', 'products_export.csv'),
    idRange: { min: 3, max: 102 },
    placeholders: {
        image: "https://placehold.co/600x600/ffffff/ffffff.png",
        hex: "#111111"
    },
    maxVariants: 5
};

/**
 * MEJORA 1: Parser CSV más robusto con mejor manejo de comillas
 */
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Comilla escapada ("")
                currentValue += '"';
                i += 2;
                continue;
            } else {
                // Toggle estado de comillas
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // Fin de campo
            values.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
        i++;
    }

    // Agregar último valor
    values.push(currentValue);
    return values;
}

/**
 * MEJORA 2: Generador CSV más robusto
 */
function valuesToCSVLine(values) {
    return values.map(val => {
        if (val === null || val === undefined) return '';

        const stringVal = String(val);

        // Escapar si contiene caracteres especiales
        if (stringVal.includes(',') ||
            stringVal.includes('"') ||
            stringVal.includes('\n') ||
            stringVal.includes('\r')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }

        return stringVal;
    }).join(',');
}

/**
 * MEJORA 3: Función para encontrar índices de columnas
 */
function getColumnIndices(headers) {
    const indices = {
        id: headers.indexOf('id'),
        colorCodes: headers.indexOf('colorCodes'),
        variants: []
    };

    // Buscar columnas de variantes (Color1-5, Imagen1-5, Hex1-5)
    for (let i = 1; i <= CONFIG.maxVariants; i++) {
        indices.variants.push({
            color: headers.indexOf(`Color${i}`),
            image: headers.indexOf(`Imagen${i}`),
            hex: headers.indexOf(`Hex${i}`)
        });
    }

    return indices;
}

/**
 * MEJORA 4: Función para actualizar variantes de un producto
 */
function updateProductVariants(values, indices) {
    const colorCodesObj = {};
    let variantsUpdated = 0;

    // Procesar cada variante
    indices.variants.forEach((variant, index) => {
        const colorIdx = variant.color;
        const imageIdx = variant.image;
        const hexIdx = variant.hex;

        // Si existe un color en esta variante
        if (values[colorIdx] && values[colorIdx].trim() !== '') {
            const colorName = values[colorIdx].trim();

            // Actualizar imagen
            values[imageIdx] = CONFIG.placeholders.image;

            // Usar hex existente o placeholder
            let hexValue = values[hexIdx];
            if (!hexValue || hexValue.trim() === '') {
                hexValue = CONFIG.placeholders.hex;
            }
            values[hexIdx] = hexValue;

            // Actualizar objeto colorCodes
            colorCodesObj[colorName] = hexValue;
            variantsUpdated++;
        }
    });

    // Actualizar columna colorCodes
    if (indices.colorCodes !== -1 && Object.keys(colorCodesObj).length > 0) {
        values[indices.colorCodes] = JSON.stringify(colorCodesObj);
    }

    return variantsUpdated;
}

/**
 * MEJORA 5: Función principal con mejor logging y validación
 */
function updateCSVFile() {
    console.log('🚀 Iniciando actualización de CSV...\n');

    try {
        // Verificar que el archivo existe
        if (!fs.existsSync(CONFIG.csvPath)) {
            throw new Error(`Archivo no encontrado: ${CONFIG.csvPath}`);
        }

        // Leer archivo
        const csvContent = fs.readFileSync(CONFIG.csvPath, 'utf8');
        const lines = csvContent.split(/\r?\n/);

        if (lines.length < 2) {
            throw new Error('CSV vacío o inválido (debe tener al menos header + 1 fila)');
        }

        console.log(`✓ CSV leído: ${lines.length} líneas encontradas`);

        // Parsear header
        const headers = parseCSVLine(lines[0]);
        const indices = getColumnIndices(headers);

        // Validar columnas requeridas
        if (indices.id === -1) {
            throw new Error('Columna "id" no encontrada en el CSV');
        }

        console.log(`✓ Columnas detectadas: ${headers.length}`);
        console.log(`✓ Columnas de variantes: ${indices.variants.filter(v => v.color !== -1).length}\n`);

        // Crear backup
        const backupPath = CONFIG.csvPath.replace('.csv', '.backup.csv');
        fs.writeFileSync(backupPath, csvContent);
        console.log(`💾 Backup creado: ${backupPath}\n`);

        // Procesar líneas
        const updatedLines = [lines[0]]; // Mantener header
        let productsUpdated = 0;
        let totalVariantsUpdated = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];

            // Saltar líneas vacías
            if (line.trim() === '') {
                continue;
            }

            const values = parseCSVLine(line);
            const id = parseInt(values[indices.id]);

            // Actualizar si está en el rango
            if (!isNaN(id) && id >= CONFIG.idRange.min && id <= CONFIG.idRange.max) {
                const variantsUpdated = updateProductVariants(values, indices);

                if (variantsUpdated > 0) {
                    console.log(`📝 ID ${id}: ${variantsUpdated} variante(s) actualizada(s)`);
                    productsUpdated++;
                    totalVariantsUpdated += variantsUpdated;
                }
            }

            updatedLines.push(valuesToCSVLine(values));
        }

        // Escribir archivo actualizado
        fs.writeFileSync(CONFIG.csvPath, updatedLines.join('\n'));

        // Resumen
        console.log('\n✅ Actualización completada:');
        console.log(`   - Productos actualizados: ${productsUpdated}`);
        console.log(`   - Total variantes actualizadas: ${totalVariantsUpdated}`);
        console.log(`   - Rango procesado: ID ${CONFIG.idRange.min}-${CONFIG.idRange.max}`);

    } catch (error) {
        console.error('\n❌ Error durante la actualización:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

/**
 * MEJORA 6: Función de validación de CSV
 */
function validateCSV() {
    console.log('🔍 Validando estructura del CSV...\n');

    try {
        const csvContent = fs.readFileSync(CONFIG.csvPath, 'utf8');
        const lines = csvContent.split(/\r?\n/).filter(l => l.trim() !== '');
        const headers = parseCSVLine(lines[0]);

        console.log('📊 Estadísticas del CSV:');
        console.log(`   - Total de líneas: ${lines.length}`);
        console.log(`   - Total de columnas: ${headers.length}`);
        console.log(`   - Columnas: ${headers.slice(0, 10).join(', ')}...`);

        // Validar estructura
        const requiredColumns = ['id', 'name', 'category'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
            console.warn(`\n⚠️ Columnas faltantes: ${missingColumns.join(', ')}`);
        } else {
            console.log('\n✓ Todas las columnas requeridas están presentes');
        }

    } catch (error) {
        console.error('❌ Error al validar CSV:', error.message);
    }
}

// Permitir ejecución con comandos
if (require.main === module) {
    const command = process.argv[2];

    if (command === 'validate') {
        validateCSV();
    } else if (command === 'update') {
        // Permitir rango personalizado
        if (process.argv.length >= 5) {
            CONFIG.idRange.min = parseInt(process.argv[3]);
            CONFIG.idRange.max = parseInt(process.argv[4]);
            console.log(`📌 Rango personalizado: ${CONFIG.idRange.min} - ${CONFIG.idRange.max}\n`);
        }
        updateCSVFile();
    } else {
        console.log('Uso:');
        console.log('  node update-csv-placeholders.js validate');
        console.log('  node update-csv-placeholders.js update [min] [max]');
        console.log('\nEjemplo:');
        console.log('  node update-csv-placeholders.js update 3 102');
    }
}

module.exports = { updateCSVFile, validateCSV, parseCSVLine, valuesToCSVLine };
